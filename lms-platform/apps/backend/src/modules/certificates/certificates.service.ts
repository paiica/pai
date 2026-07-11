import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ApplicationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Runs daily — a certificate's `expires_at` alone doesn't make `verify()` report it
  // as invalid; `status` has to actually flip to `expired` for that to happen.
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async expireOverdueCertificates() {
    const result = await this.prisma.certificate.updateMany({
      where: { status: "active", expires_at: { lt: new Date() } },
      data: { status: "expired" },
    });
    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} certificate(s) as expired`);
    }

    await this.lapseCertificatesPastGracePeriod();
  }

  // A certificate that's sat `expired` past its certification's
  // `renewal_grace_period_days` becomes permanently non-renewable through
  // this flow — the holder must reapply from scratch. Grace period varies
  // per certification, so this needs a join (raw SQL, same pattern used
  // throughout prep-courses.service.ts).
  private async lapseCertificatesPastGracePeriod() {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.certificates c
      SET status = 'lapsed', updated_at = now()
      FROM lms.certifications cert
      WHERE c.certification_id = cert.id
        AND c.status = 'expired'
        AND now() > c.expires_at + (cert.renewal_grace_period_days || ' days')::interval
      RETURNING c.id, c.user_id, c.certificate_number, c.certification_title,
                c.certification_acronym, c.expires_at
    `);
    if (!rows.length) return;

    this.logger.log(`Marked ${rows.length} certificate(s) as lapsed`);

    for (const cert of rows) {
      const user = await this.prisma.user.findUnique({
        where: { id: cert.user_id },
        select: { email: true, profile: { select: { first_name: true } } },
      });
      if (!user) continue;
      await this.mail.sendCertificateLapsed({
        to: user.email,
        firstName: user.profile?.first_name ?? "there",
        certTitle: cert.certification_title,
        certAcronym: cert.certification_acronym,
        expiredAt: cert.expires_at,
        contactUrl: "https://paii.ca/contact",
      }).catch((err: any) => this.logger.error(`Lapse email failed for certificate ${cert.id}: ${err?.message}`));
    }
  }

  // ─── Renewal ────────────────────────────────────────────────────────

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

  async getRenewalProgress(certificateId: string, userId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { certification: true },
    });
    if (!cert) throw new NotFoundException("Certificate not found");
    if (cert.user_id !== userId) throw new ForbiddenException("This is not your certificate");

    const pduEarned = await this.computePduEarned(userId, cert.certification_id);
    const pduRequired = cert.certification.renewal_pdu_required;

    const windowOpensAt = new Date(cert.expires_at);
    windowOpensAt.setDate(windowOpensAt.getDate() - cert.certification.renewal_window_days);

    const hardDeadline = new Date(cert.expires_at);
    hardDeadline.setDate(hardDeadline.getDate() + cert.certification.renewal_grace_period_days);

    const now = new Date();
    const eligible =
      cert.status !== "lapsed" &&
      cert.status !== "revoked" &&
      now >= windowOpensAt &&
      now <= hardDeadline &&
      pduEarned >= pduRequired;

    const courses = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT DISTINCT c.id, c.title, c.slug, c.pdu_value::float AS pdu_value,
             ce.completed_at IS NOT NULL AS completed, ce.progress_percentage
      FROM lms.courses c
      LEFT JOIN lms.course_enrollments ce ON ce.course_id = c.id AND ce.user_id = $1
      WHERE c.status = 'active'
        AND (c.certification_id = $2
             OR c.id IN (SELECT course_id FROM lms.course_cert_recommendations WHERE certification_id = $2))
      ORDER BY c.title
    `, userId, cert.certification_id);

    return {
      status: cert.status,
      expires_at: cert.expires_at,
      pdu_earned: pduEarned,
      pdu_required: pduRequired,
      fee: cert.certification.renewal_fee,
      window_opens_at: windowOpensAt,
      hard_deadline: hardDeadline,
      eligible,
      courses,
    };
  }

  // Called only from the payments webhook after a successful renewal
  // checkout — never exposed directly to the student, so eligibility is
  // re-validated here as a safety net even though checkout creation
  // already checked it.
  async renew(certificateId: string, userId: string, stripePaymentIntentId: string, amountPaid: number) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { certification: true, user: { include: { profile: true } } },
    });
    if (!cert) throw new NotFoundException("Certificate not found");
    if (cert.user_id !== userId) throw new ForbiddenException("This is not your certificate");
    if (cert.status === "revoked") throw new BadRequestException("Revoked certificates cannot be renewed");
    if (cert.status === "lapsed") throw new BadRequestException("This certificate's renewal window has closed");

    const progress = await this.getRenewalProgress(certificateId, userId);
    if (!progress.eligible) {
      throw new BadRequestException(
        progress.pdu_earned < progress.pdu_required
          ? `You need ${progress.pdu_required - progress.pdu_earned} more PDU(s) to renew this certificate.`
          : "This certificate is not currently eligible for renewal.",
      );
    }

    const newExpiresAt = new Date();
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + cert.certification.validity_years);

    const updated = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: "active",
        expires_at: newExpiresAt,
        renewed_at: new Date(),
        renewal_count: { increment: 1 },
        renewal_stripe_payment_intent_id: stripePaymentIntentId,
        renewal_amount_paid: amountPaid,
      },
    });

    await this.mail.sendCertificateRenewed({
      to: cert.user.email,
      firstName: cert.user.profile?.first_name ?? "there",
      certTitle: cert.certification_title,
      certAcronym: cert.certification_acronym,
      certNumber: cert.certificate_number,
      newExpiresAt: updated.expires_at,
      verificationUrl: cert.verification_url,
    }).catch((err: any) => this.logger.error(`Renewal email failed for certificate ${cert.id}: ${err?.message}`));

    return updated;
  }

  async getMyCertificates(userId: string) {
    return this.prisma.certificate.findMany({
      where: { user_id: userId },
      include: {
        certification: {
          select: { acronym: true, title: true, badge_icon: true, marketing_meta: true },
        },
      },
      orderBy: { issued_at: "desc" },
    });
  }

  async verify(certificateNumber: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { certificate_number: certificateNumber },
      include: { certification: { select: { acronym: true, title: true } } },
    });

    if (!cert) throw new NotFoundException("Certificate not found");

    return {
      valid: cert.status === "active" && cert.expires_at > new Date(),
      name: cert.holder_name,
      cert: `${cert.certification_acronym} — ${cert.certification_title}`,
      issue_date: cert.issued_at.toISOString().split("T")[0],
      expiry_date: cert.expires_at.toISOString().split("T")[0],
      status: cert.status,
    };
  }

  async issue(enrollmentId: string, examScore: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { include: { profile: true } },
        certification: true,
      },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    const existing = await this.prisma.certificate.findFirst({ where: { enrollment_id: enrollmentId } });
    if (existing) throw new BadRequestException("Certificate already issued for this enrollment");

    const profile = enrollment.user.profile;
    const holderName = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || enrollment.user.email
      : enrollment.user.email;

    const certNumber = `PAII-${enrollment.certification.acronym}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + enrollment.certification.validity_years);

    const [certificate] = await this.prisma.$transaction([
      this.prisma.certificate.create({
        data: {
          user_id: enrollment.user_id,
          enrollment_id: enrollmentId,
          certification_id: enrollment.certification_id,
          certificate_number: certNumber,
          holder_name: holderName,
          certification_title: enrollment.certification.title,
          certification_acronym: enrollment.certification.acronym,
          exam_score: examScore,
          expires_at: expiresAt,
          verification_url: `https://paii.ca/verify?id=${certNumber}`,
          status: "active",
        },
      }),
      this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "completed", completed_at: new Date() },
      }),
    ]);

    await this.mail.sendCertificateIssued({
      to: enrollment.user.email,
      firstName: enrollment.user.profile?.first_name ?? "there",
      certTitle: enrollment.certification.title,
      certAcronym: enrollment.certification.acronym,
      certNumber: certificate.certificate_number,
      expiresAt: certificate.expires_at,
      verificationUrl: certificate.verification_url,
    });

    return certificate;
  }

  async adminGetEnrollments({ page = 1, limit = 20 }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        include: {
          user: {
            include: {
              profile: { select: { first_name: true, last_name: true, avatar_url: true } },
            },
          },
          certification: { select: { id: true, acronym: true, title: true } },
          certificate: {
            select: {
              id: true,
              certificate_number: true,
              exam_score: true,
              issued_at: true,
              expires_at: true,
              status: true,
            },
          },
          exam_attempts: {
            select: { id: true, status: true, score_percentage: true, submitted_at: true, passed: true },
            orderBy: { started_at: "desc" },
            take: 1,
          },
          application: {
            select: { id: true, status: true, amount_paid: true, payment_status: true },
          },
        },
        skip,
        take: limit,
        orderBy: { enrolled_at: "desc" },
      }),
      this.prisma.enrollment.count(),
    ]);

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async fail(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException("Enrollment not found");
    if (enrollment.status === "completed") throw new BadRequestException("Cannot fail a completed enrollment");

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "suspended" },
    });
  }

  async revoke(certificateId: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { user: { select: { email: true, profile: { select: { first_name: true } } } } },
    });
    if (!cert) throw new NotFoundException("Certificate not found");
    if (cert.status === "revoked") throw new BadRequestException("Certificate is already revoked");

    const updated = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { status: "revoked" },
    });

    this.mail.sendCertificateRevoked({
      to: (cert as any).user.email,
      firstName: (cert as any).user.profile?.first_name ?? "there",
      certTitle: cert.certification_title,
      certAcronym: cert.certification_acronym,
      certNumber: cert.certificate_number,
    }).catch(() => {});

    return updated;
  }

  async resetToEnrolled(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { certificate: true },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");
    if (enrollment.status !== "completed") throw new BadRequestException("Enrollment is not completed");

    await this.prisma.$transaction(async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "active", completed_at: null },
      });
      if ((enrollment as any).certificate?.status === "active") {
        await tx.certificate.update({
          where: { id: (enrollment as any).certificate.id },
          data: { status: "revoked" },
        });
      }
    });

    return { message: "Enrollment reset to active — student can rebook the exam" };
  }

  async resetToStep(enrollmentId: string, step: 1 | 2 | 3 | 4) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    const cert = await this.prisma.certificate.findFirst({ where: { enrollment_id: enrollmentId } });

    let application = await this.prisma.application.findFirst({
      where: { user_id: enrollment.user_id, certification_id: enrollment.certification_id },
      orderBy: { created_at: "desc" },
    });

    // For step 1/2 with no application (cart-enrolled student), fetch user info to create one
    let userForApp: { email: string; profile: { first_name: string | null; last_name: string | null } | null } | null = null;
    if (!application && (step === 1 || step === 2)) {
      userForApp = await this.prisma.user.findUnique({
        where: { id: enrollment.user_id },
        include: { profile: { select: { first_name: true, last_name: true } } },
      }) as any;
    }

    await this.prisma.$transaction(async (tx) => {
      // Always revoke an active certificate
      if (cert?.status === "active") {
        await tx.certificate.update({ where: { id: cert.id }, data: { status: "revoked" } });
      }

      // Steps 1–3: cancel bookings and wipe exam attempts
      if (step <= 3) {
        await (tx as any).examBooking.updateMany({
          where: { enrollment_id: enrollmentId, status: "confirmed" },
          data: { status: "cancelled", cancelled_at: new Date() },
        });
        await tx.examAttempt.deleteMany({ where: { enrollment_id: enrollmentId } });
      }

      // Set enrollment status
      if (step === 4) {
        await tx.enrollment.update({ where: { id: enrollmentId }, data: { status: "completed" } });
      } else if (step === 3) {
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: { status: "active", completed_at: null },
        });
      } else {
        const targetStatus = step === 1 ? ApplicationStatus.pending_payment : ApplicationStatus.pending_review;

        // Steps 1–2 suspend the enrollment itself — it's no longer a
        // confirmed/paying student, so clear coursework progress too. A
        // future re-approval should start the enrollment fresh rather than
        // resuming with stale grades from a suspended enrollment period.
        await tx.lessonProgress.deleteMany({ where: { enrollment_id: enrollmentId } });
        await tx.assignmentSubmission.deleteMany({ where: { enrollment_id: enrollmentId } });

        if (!application && userForApp) {
          // Student was enrolled via cart with no application — create a synthetic one
          const fullName = userForApp.profile
            ? `${userForApp.profile.first_name ?? ""} ${userForApp.profile.last_name ?? ""}`.trim()
            : (userForApp.email ?? "");
          application = await tx.application.create({
            data: {
              user_id: enrollment.user_id,
              certification_id: enrollment.certification_id,
              status: targetStatus,
              full_name: fullName || userForApp.email,
              email: userForApp.email,
            },
          });
          // Link enrollment to the newly created application
          await tx.enrollment.update({
            where: { id: enrollmentId },
            data: { status: "suspended", completed_at: null, progress_percentage: 0, application_id: application.id },
          });
        } else {
          await tx.enrollment.update({
            where: { id: enrollmentId },
            data: { status: "suspended", completed_at: null, progress_percentage: 0 },
          });
          if (application) {
            await tx.application.update({
              where: { id: application.id },
              data: {
                status: targetStatus,
                ...(step === 1 ? { reviewed_by: null, reviewed_at: null, rejection_reason: null } : {}),
              },
            });
          }
        }
      }
    });

    return { message: `Student progress reset to step ${step}` };
  }

  async reactivate(certificateId: string) {
    const cert = await this.prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!cert) throw new NotFoundException("Certificate not found");
    if (cert.status !== "revoked") throw new BadRequestException("Certificate is not revoked");

    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: { status: "active" },
    });
  }

  async getAll({ page = 1, limit = 20 }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        include: {
          user: { include: { profile: { select: { first_name: true, last_name: true } } } },
          certification: { select: { acronym: true, title: true } },
        },
        skip,
        take: limit,
        orderBy: { issued_at: "desc" },
      }),
      this.prisma.certificate.count(),
    ]);
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
