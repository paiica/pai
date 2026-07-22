import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class EnrollmentExpiryScheduler {
  private readonly logger = new Logger(EnrollmentExpiryScheduler.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Runs every day at 02:00 UTC
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireStaleEnrollments() {
    const result = await this.prisma.enrollment.updateMany({
      where: {
        status: { notIn: ["expired", "completed"] },
        expires_at: { lt: new Date() },
      },
      data: { status: "expired" },
    });

    if (result.count > 0) {
      this.logger.log(`Enrollment expiry: marked ${result.count} enrollment(s) as expired`);
    }

    await this.expireUnbookedRegistrations();
    await this.expireStaleRetakes();
  }

  // A student has `certification.registration_validity_days` (default 365)
  // from enrolling to book or sit their exam. If they've done neither by
  // then, registration lapses — they'd need to register (and pay) again to
  // continue. Booking counts even if the scheduled session date itself
  // falls after the deadline, since booking is the action within the
  // student's control. Grace period varies per certification, so this
  // needs a join (same raw-SQL pattern as the certificate-lapse cron).
  private async expireUnbookedRegistrations() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.enrollments e
      SET status = 'registration_expired'
      FROM lms.certifications cert
      WHERE e.certification_id = cert.id
        AND e.status = 'active'
        AND now() > e.enrolled_at + (cert.registration_validity_days || ' days')::interval
        AND NOT EXISTS (SELECT 1 FROM lms.exam_attempts ea WHERE ea.enrollment_id = e.id)
        AND NOT EXISTS (SELECT 1 FROM lms.exam_bookings eb WHERE eb.enrollment_id = e.id AND eb.status = 'confirmed')
      RETURNING e.id, e.user_id, e.certification_id, e.enrolled_at
    `);
    if (!rows.length) return;
    this.logger.log(`Marked ${rows.length} enrollment(s) as registration_expired`);
    await this.notifyExpiredEnrollments(rows, "registration");
  }

  // A student who fails an attempt gets `certification.retake_window_days`
  // (default 60) to sit their included retake. If their most recent
  // attempt is a failure that still has a retake available (attempt_number
  // within max_retakes_included) and the window has passed with no newer
  // attempt, the retake lapses — they'd need to register again.
  private async expireStaleRetakes() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.enrollments e
      SET status = 'retake_expired'
      FROM lms.certifications cert,
           (
             SELECT DISTINCT ON (ea.enrollment_id) ea.enrollment_id, ea.attempt_number, ea.submitted_at, ea.status
             FROM lms.exam_attempts ea
             ORDER BY ea.enrollment_id, ea.attempt_number DESC
           ) latest
      WHERE e.certification_id = cert.id
        AND e.id = latest.enrollment_id
        AND e.status = 'active'
        AND latest.status = 'failed'
        AND latest.attempt_number <= cert.max_retakes_included
        AND latest.submitted_at IS NOT NULL
        AND now() > latest.submitted_at + (cert.retake_window_days || ' days')::interval
      RETURNING e.id, e.user_id, e.certification_id, latest.submitted_at AS failed_at
    `);
    if (!rows.length) return;
    this.logger.log(`Marked ${rows.length} enrollment(s) as retake_expired`);
    await this.notifyExpiredEnrollments(rows, "retake");
  }

  private async notifyExpiredEnrollments(rows: any[], kind: "registration" | "retake") {
    for (const row of rows) {
      const [user, certification] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: row.user_id }, select: { email: true, profile: { select: { first_name: true } } } }),
        this.prisma.certification.findUnique({ where: { id: row.certification_id }, select: { title: true, acronym: true } }),
      ]);
      if (!user || !certification) continue;
      const firstName = user.profile?.first_name ?? "there";

      const send = kind === "registration"
        ? this.mail.sendRegistrationExpired({
            to: user.email, firstName, certTitle: certification.title, certAcronym: certification.acronym,
            enrolledAt: row.enrolled_at,
          })
        : this.mail.sendRetakeExpired({
            to: user.email, firstName, certTitle: certification.title, certAcronym: certification.acronym,
            failedAt: row.failed_at,
          });

      await send.catch((err: any) => this.logger.error(`${kind}-expired email failed for enrollment ${row.id}: ${err?.message}`));
    }
  }
}
