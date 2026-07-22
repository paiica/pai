import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException, Logger,
} from "@nestjs/common";
import { ApplicationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  async create(userId: string, dto: any) {
    const cert = await this.prisma.certification.findUnique({ where: { slug: dto.certification_slug } });
    if (!cert || cert.status !== "active") throw new NotFoundException("Certification not found");

    // ── Eligibility check ──────────────────────────────────────────────────────
    // Shortfalls no longer block submission — the application still goes
    // through, but gets flagged with the specific shortfall so a reviewer can
    // decide manually (e.g. accept "equivalent experience" on a judgment call).
    const minExp   = (cert as any).min_years_experience as number | null;
    const minHours = (cert as any).min_training_hours   as number | null;
    const appExp   = dto.years_experience != null ? Number(dto.years_experience) : null;
    const appHours = dto.training_hours   != null ? Number(dto.training_hours)   : null;

    const failReasons: string[] = [];
    if (minExp   != null && (appExp   == null || appExp   < minExp))   failReasons.push(`has ${appExp ?? 0} year${appExp === 1 ? "" : "s"} of experience, needs ${minExp}`);
    if (minHours != null && (appHours == null || appHours < minHours)) failReasons.push(`has ${appHours ?? 0} training hours, needs ${minHours}`);

    const eligibilityFlagged = failReasons.length > 0;
    const eligibilityFlagReason = eligibilityFlagged ? `Below minimum: ${failReasons.join(" and ")}` : null;

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
    if (Array.isArray(dto.education_entries) && dto.education_entries.length > 0) {
      profileUpdate["education_entries"] = dto.education_entries;
    }
    if (Array.isArray(dto.experience_entries) && dto.experience_entries.length > 0) {
      profileUpdate["experience_entries"] = dto.experience_entries;
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
          eligibility_flagged: eligibilityFlagged,
          eligibility_flag_reason: eligibilityFlagReason,
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
          eligibility_flagged: eligibilityFlagged,
          eligibility_flag_reason: eligibilityFlagReason,
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
          certification: { select: { acronym: true, title: true, min_years_experience: true, min_training_hours: true, required_documents: true } },
          documents: { orderBy: { uploaded_at: "asc" } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "asc" },
      }),
      this.prisma.application.count({ where: { status: ApplicationStatus.pending_review } }),
    ]);
    const data = await this.attachPromoAffiliate(await this.attachReferrals(items));
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Affiliate referral attribution ───────────────────────────────────────────
  // Primary match is AffiliateLead.user_id — set once at signup and permanent,
  // so it still finds the referral even if the applicant later used a
  // different email on the application form. Falls back to matching by email
  // for older lead records created before user_id existed.
  private async attachReferrals<T extends { user_id: string; email: string }>(
    items: T[],
  ): Promise<(T & { referred_by: any })[]> {
    const userIds = [...new Set(items.map((i) => i.user_id))];
    const emails = [...new Set(items.map((i) => i.email))];
    if (userIds.length === 0 && emails.length === 0) return items.map((i) => ({ ...i, referred_by: null }));

    const leads = await this.prisma.affiliateLead.findMany({
      where: { OR: [{ user_id: { in: userIds } }, { email: { in: emails } }] },
      include: { affiliate: { include: { user: { include: { profile: true } } } } },
      orderBy: { created_at: "desc" },
    });

    // Prefer a 'purchased' lead if one exists, otherwise the most recent
    function keepBetter(existing: (typeof leads)[number] | undefined, lead: (typeof leads)[number]) {
      return !existing || (lead.status === "purchased" && existing.status !== "purchased") ? lead : existing;
    }
    const byUserId = new Map<string, (typeof leads)[number]>();
    const byEmail = new Map<string, (typeof leads)[number]>();
    for (const lead of leads) {
      if (lead.user_id) byUserId.set(lead.user_id, keepBetter(byUserId.get(lead.user_id), lead));
      byEmail.set(lead.email, keepBetter(byEmail.get(lead.email), lead));
    }

    return items.map((item) => {
      const lead = byUserId.get(item.user_id) ?? byEmail.get(item.email);
      if (!lead) return { ...item, referred_by: null };
      const profile = lead.affiliate.user.profile;
      return {
        ...item,
        referred_by: {
          affiliate_id: lead.affiliate.id,
          // /affiliates/[id] looks up by the affiliate's User.id, not AffiliateProfile.id
          affiliate_user_id: lead.affiliate.user.id,
          name: profile ? `${profile.first_name} ${profile.last_name}` : lead.affiliate.user.email,
          email: lead.affiliate.user.email,
          referral_code: lead.affiliate.referral_code,
          lead_status: lead.status,
          matched_by: lead.user_id === item.user_id ? "account" : "email",
        },
      };
    });
  }

  // ── Promo code attribution ───────────────────────────────────────────────────
  // Application.promo_code only stores the raw code text an applicant typed in
  // at checkout — resolve it against AffiliatePromoCode to show which rep (if
  // any) it belongs to, so the admin doesn't have to look it up separately.
  private async attachPromoAffiliate<T extends { promo_code: string | null }>(
    items: T[],
  ): Promise<(T & { promo_affiliate: any })[]> {
    const codes = [...new Set(items.map((i) => i.promo_code).filter((c): c is string => !!c))];
    if (codes.length === 0) return items.map((i) => ({ ...i, promo_affiliate: null }));

    const promoCodes = await this.prisma.affiliatePromoCode.findMany({
      where: { code: { in: codes.map((c) => c.toUpperCase()) } },
      include: { affiliate: { include: { user: { include: { profile: true } } } } },
    });
    const byCode = new Map(promoCodes.map((p) => [p.code, p]));

    return items.map((item) => {
      const promo = item.promo_code ? byCode.get(item.promo_code.toUpperCase()) : undefined;
      if (!promo) return { ...item, promo_affiliate: null };
      const profile = promo.affiliate.user.profile;
      return {
        ...item,
        promo_affiliate: {
          affiliate_id: promo.affiliate.id,
          // /affiliates/[id] looks up by the affiliate's User.id, not AffiliateProfile.id
          affiliate_user_id: promo.affiliate.user.id,
          name: profile ? `${profile.first_name} ${profile.last_name}` : promo.affiliate.user.email,
          email: promo.affiliate.user.email,
        },
      };
    });
  }

  async approve(applicationId: string, adminId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { certification: true, user: { include: { profile: true } } },
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
    const user = (app as any).user;
    this.mail.sendApplicationApproved({
      to: user.email,
      firstName: user.profile?.first_name ?? "there",
      certTitle: app!.certification.title,
      certAcronym: app!.certification.acronym,
    }).catch(() => {});
    return { message: "Application approved and enrollment created" };
  }

  async reject(applicationId: string, adminId: string, reason?: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { certification: true, user: { include: { profile: true } } },
    });
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

      // Always suspend any active enrollment when rejecting
      await tx.enrollment.updateMany({
        where: { user_id: app.user_id, certification_id: app.certification_id, status: "active" },
        data: { status: "suspended" },
      });

      // Void any pending affiliate commission for this buyer + certification
      const voidedCommissions = await tx.affiliateCommission.findMany({
        where: {
          user_id: app.user_id,
          certification_id: app.certification_id,
          status: "pending" as any,
        },
        select: { id: true, lead_id: true, affiliate_id: true },
      });

      if (voidedCommissions.length > 0) {
        await tx.affiliateCommission.updateMany({
          where: { id: { in: voidedCommissions.map((c) => c.id) } },
          data: {
            status: "voided" as any,
            voided_at: new Date(),
            void_reason: "Application rejected",
          },
        });

        // Revert lead status from purchased → registered
        const leadIds = voidedCommissions.map((c) => c.lead_id).filter(Boolean) as string[];
        if (leadIds.length > 0) {
          await tx.affiliateLead.updateMany({
            where: { id: { in: leadIds }, status: "purchased" as any },
            data: { status: "registered" as any },
          });
        }

        // Revert invite status from converted → registered
        const affiliateIds = [...new Set(voidedCommissions.map((c) => c.affiliate_id))];
        await tx.affiliateInvite.updateMany({
          where: {
            affiliate_id: { in: affiliateIds },
            email: app.user.email,
            status: "converted" as any,
          },
          data: { status: "registered" as any },
        });
      }
    });

    this.logger.log(`Application ${applicationId} rejected by ${adminId}`);
    const user = (app as any).user;
    const cert = (app as any).certification;
    if (user && cert) {
      this.mail.sendApplicationRejected({
        to: user.email,
        firstName: user.profile?.first_name ?? "there",
        certTitle: cert.title,
        certAcronym: cert.acronym,
        reason: reason ?? null,
      }).catch(() => {});
    }
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
          certification: { select: { acronym: true, title: true, min_years_experience: true, min_training_hours: true, required_documents: true } },
          documents: { orderBy: { uploaded_at: "asc" } },
        },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.application.count({ where }),
    ]);
    const data = await this.attachPromoAffiliate(await this.attachReferrals(items));
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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

  async adminDelete(applicationId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundException("Application not found");

    // Enrollment.application_id has no onDelete cascade — null it out so the
    // enrollment record is preserved but the application can be deleted cleanly.
    await this.prisma.enrollment.updateMany({
      where: { application_id: applicationId },
      data: { application_id: null },
    });

    // ApplicationDocument cascades automatically from Application
    await this.prisma.application.delete({ where: { id: applicationId } });
    return { message: "Application deleted" };
  }

  async adminBulkDelete(ids: string[]) {
    if (!ids.length) return { deleted: 0 };

    await this.prisma.enrollment.updateMany({
      where: { application_id: { in: ids } },
      data: { application_id: null },
    });

    const { count } = await this.prisma.application.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: count };
  }
}
