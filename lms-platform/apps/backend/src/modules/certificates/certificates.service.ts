import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ApplicationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService) {}

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

    const certNumber = `PAI-${enrollment.certification.acronym}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
    const cert = await this.prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!cert) throw new NotFoundException("Certificate not found");
    if (cert.status === "revoked") throw new BadRequestException("Certificate is already revoked");

    return this.prisma.certificate.update({
      where: { id: certificateId },
      data: { status: "revoked" },
    });
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

    const application = await this.prisma.application.findFirst({
      where: { user_id: enrollment.user_id, certification_id: enrollment.certification_id },
      orderBy: { created_at: "desc" },
    });

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
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: { status: "suspended", completed_at: null },
        });
        if (application) {
          await tx.application.update({
            where: { id: application.id },
            data: {
              status: step === 1 ? ApplicationStatus.pending_payment : ApplicationStatus.pending_review,
              ...(step === 1 ? { reviewed_by: null, reviewed_at: null, rejection_reason: null } : {}),
            },
          });
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
