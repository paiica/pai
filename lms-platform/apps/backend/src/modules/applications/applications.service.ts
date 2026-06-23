import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException, Logger,
} from "@nestjs/common";
import { ApplicationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: any) {
    const cert = await this.prisma.certification.findUnique({ where: { slug: dto.certification_slug } });
    if (!cert || cert.status !== "active") throw new NotFoundException("Certification not found");

    // ── Eligibility check ──────────────────────────────────────────────────────
    const minExp   = (cert as any).min_years_experience as number | null;
    const minHours = (cert as any).min_training_hours   as number | null;
    const appExp   = dto.years_experience != null ? Number(dto.years_experience) : null;
    const appHours = dto.training_hours   != null ? Number(dto.training_hours)   : null;

    const failReasons: string[] = [];
    if (minExp   != null && (appExp   == null || appExp   < minExp))   failReasons.push(`minimum ${minExp} year${minExp !== 1 ? "s" : ""} of professional experience`);
    if (minHours != null && (appHours == null || appHours < minHours)) failReasons.push(`minimum ${minHours} training hours`);

    if (failReasons.length > 0) {
      throw new BadRequestException(
        `You are not eligible for this certification because you do not meet the required: ${failReasons.join(" and ")}.`
      );
    }

    // Permanent block: certificate already earned
    const completedEnrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, certification_id: cert.id, status: "completed" },
    });
    if (completedEnrollment) {
      throw new ConflictException("You have already earned this certification and cannot apply again");
    }

    // Temp block: currently enrolled (active) — unless their last attempt failed (re-application allowed)
    const activeEnrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, certification_id: cert.id, status: "active" },
    });
    if (activeEnrollment) {
      const latestAttempt = await this.prisma.examAttempt.findFirst({
        where: { enrollment_id: activeEnrollment.id },
        orderBy: { attempt_number: "desc" },
      });
      const failedExam = latestAttempt?.status === "failed" && latestAttempt?.passed === false;
      if (!failedExam) {
        throw new ConflictException("You are currently enrolled in this certification");
      }
      // Student failed — suspend enrollment now so the upsert below proceeds cleanly
      await this.prisma.enrollment.update({
        where: { id: activeEnrollment.id },
        data: { status: "suspended" },
      });
    }

    // Temp block: application already in the pipeline (not yet resolved)
    const existing = await this.prisma.application.findFirst({
      where: {
        user_id: userId,
        certification_id: cert.id,
        status: { notIn: [ApplicationStatus.rejected, ApplicationStatus.withdrawn, ApplicationStatus.approved] },
      },
    });
    if (existing) {
      throw new ConflictException("You already have a pending application for this certification");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException("User not found");

    // Convert date_of_birth string (YYYY-MM-DD) to Date object — Prisma DateTime requires a Date, not a date-only string
    const parsedDob = dto.date_of_birth
      ? new Date(dto.date_of_birth)
      : undefined;

    const { certification_slug: _slug, ...applicationData } = dto;

    const profileUpdate: Record<string, any> = {};
    const profileFields = ["phone","date_of_birth","gender","country","career_status","job_title","company","years_experience","linkedin_url","university","degree_program","graduation_year"] as const;
    for (const field of profileFields) {
      if (dto[field] != null) {
        profileUpdate[field] = field === "date_of_birth" ? parsedDob : dto[field];
      }
    }

    const fullName = `${user.profile?.first_name ?? ""} ${user.profile?.last_name ?? ""}`.trim() || user.email;

    const [application] = await this.prisma.$transaction([
      this.prisma.application.upsert({
        where: { user_id_certification_id: { user_id: userId, certification_id: cert.id } },
        create: {
          user_id: userId,
          certification_id: cert.id,
          full_name: fullName,
          email: user.email,
          ...applicationData,
          date_of_birth: parsedDob,
          status: ApplicationStatus.pending_payment,
        },
        update: {
          full_name: fullName,
          ...applicationData,
          date_of_birth: parsedDob,
          status: ApplicationStatus.pending_payment,
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          documents_requested: false,
          documents_request_message: null,
          documents_requested_at: null,
        },
      }),
      ...(Object.keys(profileUpdate).length > 0
        ? [this.prisma.profile.upsert({
            where: { user_id: userId },
            update: profileUpdate,
            create: {
              user_id: userId,
              first_name: user.profile?.first_name ?? "",
              last_name: user.profile?.last_name ?? "",
              ...profileUpdate,
            },
          })]
        : []),
    ]);

    return application;
  }

  async getMyApplications(userId: string) {
    return this.prisma.application.findMany({
      where: { user_id: userId },
      include: {
        certification: { select: { id: true, slug: true, acronym: true, title: true, badge_icon: true } },
        documents: { orderBy: { uploaded_at: "asc" } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async getPendingApplications({ page = 1, limit = 20 }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where: { status: ApplicationStatus.pending_review },
        include: {
          certification: { select: { acronym: true, title: true } },
          documents: { orderBy: { uploaded_at: "asc" } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
      }),
      this.prisma.application.count({ where: { status: ApplicationStatus.pending_review } }),
    ]);
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async approve(applicationId: string, adminId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { certification: true },
    });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status === ApplicationStatus.withdrawn || app.status === ApplicationStatus.pending_payment) {
      throw new BadRequestException(`Cannot approve application in status: ${app.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.approved,
          reviewed_by: adminId,
          reviewed_at: new Date(),
        },
      });

      await tx.enrollment.upsert({
        where: { user_id_certification_id: { user_id: app.user_id, certification_id: app.certification_id } },
        create: {
          user_id: app.user_id,
          certification_id: app.certification_id,
          application_id: app.id,
          status: "active",
        },
        update: { status: "active" },
      });
    });

    this.logger.log(`Application ${applicationId} approved by ${adminId}`);
    // TODO: send approval email
    return { message: "Application approved and enrollment created" };
  }

  async reject(applicationId: string, adminId: string, reason?: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status === ApplicationStatus.withdrawn) {
      throw new BadRequestException("Cannot reject a withdrawn application");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.rejected,
          reviewed_by: adminId,
          reviewed_at: new Date(),
          rejection_reason: reason ?? null,
        },
      });

      // Always suspend any active enrollment when rejecting — covers both approval reversals
      // and enrollments created incorrectly (e.g. via auto-enrollment bugs)
      await tx.enrollment.updateMany({
        where: { user_id: app.user_id, certification_id: app.certification_id, status: "active" },
        data: { status: "suspended" },
      });
    });

    this.logger.log(`Application ${applicationId} rejected by ${adminId}`);
    // TODO: send rejection email + issue Stripe refund
    return { message: "Application rejected" };
  }

  async verifyPayment(applicationId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status !== ApplicationStatus.payment_submitted) {
      throw new BadRequestException("Application does not have a submitted payment to verify");
    }
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.pending_review },
    });
    return { message: "Payment verified — application now under review" };
  }

  async rejectPayment(applicationId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status !== ApplicationStatus.payment_submitted) {
      throw new BadRequestException("Application does not have a submitted payment to reject");
    }
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.pending_payment },
    });
    return { message: "Payment rejected — application reset to unpaid" };
  }

  async unverifyPayment(applicationId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status !== ApplicationStatus.pending_review) {
      throw new BadRequestException("Application is not in pending review state");
    }
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.payment_submitted },
    });
    return { message: "Payment un-verified — back to awaiting verification" };
  }

  async setPending(applicationId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status === ApplicationStatus.withdrawn) {
      throw new BadRequestException("Cannot change status of a withdrawn application");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.pending_review,
          rejection_reason: null,
        },
      });

      // If reversing an approval, suspend the enrollment
      if (app.status === ApplicationStatus.approved) {
        await tx.enrollment.updateMany({
          where: { user_id: app.user_id, certification_id: app.certification_id, status: "active" },
          data: { status: "suspended" },
        });
      }
    });

    return { message: "Application set to pending review" };
  }

  async withdraw(applicationId: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, user_id: userId },
    });
    if (!app) throw new NotFoundException("Application not found");
    if (app.status === ApplicationStatus.withdrawn) {
      throw new BadRequestException("Application is already withdrawn");
    }
    if (app.status !== ApplicationStatus.pending_payment) {
      throw new BadRequestException("You can only withdraw before payment has been submitted");
    }

    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.withdrawn },
    });

    return { message: "Application withdrawn" };
  }

  async getAll({ page = 1, limit = 20, status }: { page: number; limit: number; status?: ApplicationStatus }) {
    const where = status ? { status } : {};
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: {
          certification: { select: { acronym: true, title: true } },
          documents: { orderBy: { uploaded_at: "asc" } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.application.count({ where }),
    ]);
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Document requests (admin) ────────────────────────────────────────────────

  async requestDocuments(applicationId: string, adminId: string, message?: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        documents_requested: true,
        documents_request_message: message ?? null,
        documents_requested_at: new Date(),
      },
    });

    this.logger.log(`Documents requested for application ${applicationId} by admin ${adminId}`);
    return { message: "Document request sent to applicant" };
  }

  async cancelDocumentRequest(applicationId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");

    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        documents_requested: false,
        documents_request_message: null,
        documents_requested_at: null,
      },
    });

    return { message: "Document request cancelled" };
  }

  // ── Documents (student upload) ───────────────────────────────────────────────

  async submitDocuments(applicationId: string, userId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, user_id: userId },
      include: { documents: true },
    });
    if (!app) throw new NotFoundException("Application not found");
    if ((app.documents as any[]).length === 0) throw new BadRequestException("Please upload at least one document before submitting");

    await (this.prisma.application as any).update({
      where: { id: applicationId },
      data: { documents_requested: false, documents_request_message: null },
    });

    this.logger.log(`Documents submitted for application ${applicationId} by user ${userId}`);
    return { message: "Documents submitted successfully" };
  }

  async addDocument(applicationId: string, userId: string, dto: {
    file_url: string; s3_key: string; file_name: string; mime_type?: string; file_size?: number;
  }) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, user_id: userId },
    });
    if (!app) throw new NotFoundException("Application not found");

    return (this.prisma as any).applicationDocument.create({
      data: {
        application_id: applicationId,
        user_id: userId,
        file_url: dto.file_url,
        s3_key: dto.s3_key,
        file_name: dto.file_name,
        mime_type: dto.mime_type ?? null,
        file_size: dto.file_size ?? null,
      },
    });
  }

  async getDocuments(applicationId: string, userId?: string) {
    if (userId) {
      const app = await this.prisma.application.findFirst({ where: { id: applicationId, user_id: userId } });
      if (!app) throw new NotFoundException("Application not found");
    }
    return (this.prisma as any).applicationDocument.findMany({
      where: { application_id: applicationId },
      orderBy: { uploaded_at: "asc" },
    });
  }

  async deleteDocument(documentId: string, userId: string) {
    const doc = await (this.prisma as any).applicationDocument.findFirst({
      where: { id: documentId, user_id: userId },
    });
    if (!doc) throw new NotFoundException("Document not found");

    await (this.prisma as any).applicationDocument.delete({ where: { id: documentId } });
    return { message: "Document removed" };
  }
}
