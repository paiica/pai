import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "./mail.service";

@Injectable()
export class MailSchedulerService {
  private readonly logger = new Logger(MailSchedulerService.name);

  constructor(private prisma: PrismaService, private mail: MailService, private config: ConfigService) {}

  // Runs every day at 8 AM UTC — sends reminders for exams happening the following day
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendExamReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const bookings = await (this.prisma as any).examBooking.findMany({
      where: {
        status: "confirmed",
        exam_session: { scheduled_at: { gte: start, lte: end }, is_active: true },
      },
      include: {
        user: { select: { email: true, profile: { select: { first_name: true } } } },
        exam_session: { include: { certification: { select: { title: true } } } },
      },
    });

    this.logger.log(`Sending exam reminders for ${bookings.length} bookings`);

    for (const booking of bookings) {
      const session = booking.exam_session;
      const examDate = new Date(session.scheduled_at).toLocaleString("en-CA", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      });
      await this.mail.sendExamReminder({
        to: booking.user.email,
        firstName: booking.user.profile?.first_name ?? "there",
        certTitle: session.certification?.title ?? "your certification",
        sessionTitle: session.title ?? "Exam Session",
        examDate,
        meetingLink: session.meeting_link ?? null,
      }).catch((err: any) => this.logger.error(`Reminder failed for booking ${booking.id}: ${err?.message}`));
    }
  }

  private async computePduEarned(userId: string, certificationId: string): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COALESCE(SUM(c.pdu_value), 0)::float AS total
      FROM lms.course_enrollments ce
      JOIN lms.courses c ON c.id = ce.course_id
      WHERE ce.user_id = $1
        AND ce.completed_at IS NOT NULL
        AND (c.certification_id = $2
             OR c.id IN (SELECT course_id FROM lms.course_cert_recommendations WHERE certification_id = $2))
    `, userId, certificationId);
    return rows[0]?.total ?? 0;
  }

  // Runs daily at 9 AM UTC (staggered from the 8 AM exam-reminder job) —
  // reminds certificate holders as their renewal window approaches, plus a
  // "last chance" nudge shortly before the hard renewal cutoff. Dedup'd via
  // `last_renewal_reminder_days_out`, which just tracks the days-until-expiry
  // value (negative once past expiry) from the last send — since it changes
  // by 1 each day, comparing against it guarantees at most one email per
  // distinct trigger day.
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendRenewalReminders() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.user_id, c.certificate_number, c.certification_title, c.certification_acronym,
             c.expires_at, c.last_renewal_reminder_days_out,
             cert.id AS certification_id, cert.renewal_pdu_required, cert.renewal_grace_period_days,
             cert.renewal_fee::float AS renewal_fee,
             u.email, p.first_name
      FROM lms.certificates c
      JOIN lms.certifications cert ON cert.id = c.certification_id
      JOIN lms.users u ON u.id = c.user_id
      LEFT JOIN lms.profiles p ON p.user_id = u.id
      WHERE c.status IN ('active', 'expired')
        AND cert.renewal_pdu_required > 0
    `);

    let sent = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const row of rows) {
      const expiresAt = new Date(row.expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now) / dayMs);
      const hardDeadline = new Date(expiresAt);
      hardDeadline.setDate(hardDeadline.getDate() + row.renewal_grace_period_days);
      const daysUntilDeadline = Math.ceil((hardDeadline.getTime() - now) / dayMs);

      const shouldSend =
        [30, 14, 1].includes(daysUntilExpiry) || daysUntilDeadline === 14;
      if (!shouldSend || row.last_renewal_reminder_days_out === daysUntilExpiry) continue;

      const pduEarned = await this.computePduEarned(row.user_id, row.certification_id);
      const frontendUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3001");

      await this.mail.sendCertificateExpiringReminder({
        to: row.email,
        firstName: row.first_name ?? "there",
        certTitle: row.certification_title,
        certAcronym: row.certification_acronym,
        expiresAt,
        daysRemaining: Math.max(daysUntilExpiry, 0),
        pduEarned,
        pduRequired: row.renewal_pdu_required,
        renewalFee: row.renewal_fee,
        // The detail page's [certId] route param is the certification_id
        // (the page looks up the issued certificate within that program).
        renewLink: `${frontendUrl}/certificates/${row.certification_id}`,
      }).catch((err: any) => this.logger.error(`Renewal reminder failed for certificate ${row.id}: ${err?.message}`));

      await this.prisma.certificate.update({
        where: { id: row.id },
        data: { last_renewal_reminder_days_out: daysUntilExpiry },
      });
      sent++;
    }

    if (sent > 0) this.logger.log(`Sent ${sent} renewal reminder(s)`);
  }
}
