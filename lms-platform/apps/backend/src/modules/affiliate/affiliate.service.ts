import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AffiliateStatus, AffiliateCommissionStatus } from "@prisma/client";
import { randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AffiliateService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────────

  private generateReferralCode(): string {
    return randomBytes(4).toString("hex").toUpperCase();
  }

  private formatAffiliate(u: any) {
    const ap = u.affiliate_profile;
    return {
      id: u.id,
      email: u.email,
      first_name: u.profile?.first_name ?? null,
      last_name: u.profile?.last_name ?? null,
      phone: u.profile?.phone ?? null,
      avatar_url: u.profile?.avatar_url ?? null,
      role: u.role,
      status: ap?.status ?? "pending",
      referral_code: ap?.referral_code ?? null,
      commission_rate: ap ? Number(ap.commission_rate) : 10,
      payout_method: ap?.payout_method ?? null,
      payout_details: ap?.payout_details ?? null,
      notes: ap?.notes ?? null,
      approved_at: ap?.approved_at ?? null,
      created_at: u.created_at,
    };
  }

  // ── admin: list ───────────────────────────────────────────────────────────────

  async adminList({ page = 1, limit = 25, status, search }: {
    page: number; limit: number; status?: string; search?: string;
  }) {
    const skip = (page - 1) * limit;
    const where: any = {
      affiliate_profile: status ? { status: status as AffiliateStatus } : { isNot: null },
      ...(search ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { profile: { first_name: { contains: search, mode: "insensitive" } } },
          { profile: { last_name: { contains: search, mode: "insensitive" } } },
        ],
      } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          profile: { select: { first_name: true, last_name: true, phone: true, avatar_url: true } },
          affiliate_profile: {
            include: {
              _count: { select: { leads: true, commissions: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        ...this.formatAffiliate(u),
        lead_count: u.affiliate_profile?._count?.leads ?? 0,
        commission_count: u.affiliate_profile?._count?.commissions ?? 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── admin: stats ──────────────────────────────────────────────────────────────

  async adminStats() {
    const [total, pending, approved, suspended, commissions] = await Promise.all([
      this.prisma.user.count({ where: { role: "sales_rep" as any } }),
      this.prisma.affiliateProfile.count({ where: { status: "pending" } }),
      this.prisma.affiliateProfile.count({ where: { status: "approved" } }),
      this.prisma.affiliateProfile.count({ where: { status: "suspended" } }),
      this.prisma.affiliateCommission.groupBy({
        by: ["status"],
        _sum: { amount: true },
      }),
    ]);

    const commissionByStatus = Object.fromEntries(
      commissions.map((c) => [c.status, Number(c._sum.amount ?? 0)])
    );

    return {
      total_reps: total,
      pending_approvals: pending,
      active_reps: approved,
      suspended_reps: suspended,
      total_commission_owed: commissionByStatus["pending"] ?? 0,
      total_commission_paid: commissionByStatus["paid"] ?? 0,
      total_revenue_generated: commissions.reduce((s, c) => s + Number(c._sum.amount ?? 0), 0),
    };
  }

  // ── admin: get one ────────────────────────────────────────────────────────────

  async adminGetOne(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        affiliate_profile: {
          include: {
            product_assignments: {
              include: {
                certification: { select: { id: true, title: true, acronym: true, slug: true, price: true, status: true } },
                course: { select: { id: true, title: true, slug: true, price: true, status: true } },
              },
            },
            promo_codes: true,
            _count: { select: { leads: true, commissions: true, invites: true } },
          },
        },
      },
    });
    if (!u || !u.affiliate_profile) throw new NotFoundException("Affiliate not found");
    return {
      ...this.formatAffiliate(u),
      lead_count: u.affiliate_profile?._count?.leads ?? 0,
      commission_count: u.affiliate_profile?._count?.commissions ?? 0,
      invite_count: u.affiliate_profile?._count?.invites ?? 0,
      products: u.affiliate_profile?.product_assignments.map((a) => {
        const item = a.certification ?? a.course;
        return {
          assignment_id: a.id,
          type: a.certification ? "certification" : "course",
          id: item?.id ?? null,
          title: a.certification
            ? `${(a.certification as any).acronym} – ${(a.certification as any).title}`
            : (a.course as any)?.title ?? null,
          slug: item?.slug ?? null,
          price: item ? Number((item as any).price) : null,
          status: (item as any)?.status ?? null,
          certification_id: a.certification_id,
          course_id: a.course_id,
          commission_override: a.commission_override ? Number(a.commission_override) : null,
        };
      }) ?? [],
      promo_codes: u.affiliate_profile?.promo_codes ?? [],
    };
  }

  // ── admin: approve ────────────────────────────────────────────────────────────

  async adminApprove(id: string, adminId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      include: { affiliate_profile: true },
    });
    if (!u) throw new NotFoundException("User not found");

    if (!u.affiliate_profile) {
      await this.prisma.affiliateProfile.create({
        data: {
          user_id: id,
          referral_code: this.generateReferralCode(),
          status: "approved",
          approved_at: new Date(),
          approved_by: adminId,
        },
      });
    } else {
      await this.prisma.affiliateProfile.update({
        where: { user_id: id },
        data: { status: "approved", approved_at: new Date(), approved_by: adminId },
      });
    }

    return { message: "Affiliate approved" };
  }

  // ── admin: suspend ────────────────────────────────────────────────────────────

  async adminSuspend(id: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: id } });
    if (!ap) throw new NotFoundException("Affiliate profile not found");
    await this.prisma.affiliateProfile.update({
      where: { user_id: id },
      data: { status: "suspended" },
    });
    return { message: "Affiliate suspended" };
  }

  // ── admin: set commission rate ────────────────────────────────────────────────

  async adminSetCommissionRate(id: string, rate: number) {
    if (rate < 0 || rate > 100) throw new BadRequestException("Rate must be between 0 and 100");
    await this.prisma.affiliateProfile.update({
      where: { user_id: id },
      data: { commission_rate: rate },
    });
    return { message: "Commission rate updated" };
  }

  // ── admin: set notes ──────────────────────────────────────────────────────────

  async adminSetNotes(id: string, notes: string) {
    await this.prisma.affiliateProfile.update({
      where: { user_id: id },
      data: { notes },
    });
    return { message: "Notes updated" };
  }

  // ── admin: assign product (cert or course) ───────────────────────────────────

  async adminAssignProduct(
    affiliateUserId: string,
    dto: { certification_id?: string; course_id?: string; commission_override?: number },
  ) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: affiliateUserId } });
    if (!ap) throw new NotFoundException("Affiliate profile not found");
    if (!dto.certification_id && !dto.course_id)
      throw new BadRequestException("Provide certification_id or course_id");

    // Prevent duplicate assignments
    const existing = await this.prisma.affiliateProductAssignment.findFirst({
      where: {
        affiliate_id: ap.id,
        ...(dto.certification_id ? { certification_id: dto.certification_id } : {}),
        ...(dto.course_id ? { course_id: dto.course_id } : {}),
      },
    });
    if (existing) {
      await this.prisma.affiliateProductAssignment.update({
        where: { id: existing.id },
        data: { commission_override: dto.commission_override ?? null },
      });
      return { message: "Product assignment updated" };
    }

    await this.prisma.affiliateProductAssignment.create({
      data: {
        affiliate_id: ap.id,
        certification_id: dto.certification_id ?? null,
        course_id: dto.course_id ?? null,
        commission_override: dto.commission_override ?? null,
      },
    });
    return { message: "Product assigned" };
  }

  // ── admin: remove product assignment ─────────────────────────────────────────

  async adminRemoveProduct(affiliateUserId: string, assignmentId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: affiliateUserId } });
    if (!ap) throw new NotFoundException("Affiliate profile not found");
    await this.prisma.affiliateProductAssignment.deleteMany({
      where: { id: assignmentId, affiliate_id: ap.id },
    });
    return { message: "Product removed" };
  }

  // ── admin: list available products (certs + courses) ─────────────────────────

  async adminListProducts() {
    const [certifications, courses] = await Promise.all([
      this.prisma.certification.findMany({
        where: { status: { not: "archived" } },
        select: { id: true, title: true, acronym: true, slug: true, price: true, status: true },
        orderBy: { title: "asc" },
      }),
      this.prisma.course.findMany({
        where: { status: { not: "archived" } },
        select: { id: true, title: true, slug: true, price: true, status: true },
        orderBy: { title: "asc" },
      }),
    ]);
    return {
      certifications: certifications.map((c) => ({ ...c, type: "certification", price: Number(c.price) })),
      courses: courses.map((c) => ({ ...c, type: "course", price: Number(c.price) })),
    };
  }

  // ── admin: create promo code for rep ──────────────────────────────────────────

  async adminCreatePromoCode(affiliateUserId: string, dto: {
    code: string; discount_type: string; discount_value: number;
    description?: string; min_order_value?: number; is_stackable?: boolean;
    expires_at?: string; max_uses?: number;
  }) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: affiliateUserId } });
    if (!ap) throw new NotFoundException("Affiliate profile not found");

    if (!["percentage", "fixed"].includes(dto.discount_type)) {
      throw new BadRequestException("discount_type must be percentage or fixed");
    }
    if (!Number.isFinite(dto.discount_value) || dto.discount_value <= 0) {
      throw new BadRequestException("discount_value must be a positive number");
    }
    if (dto.discount_type === "percentage" && dto.discount_value > 100) {
      throw new BadRequestException("A percentage discount cannot exceed 100");
    }

    return this.prisma.affiliatePromoCode.create({
      data: {
        affiliate_id: ap.id,
        code: dto.code.toUpperCase(),
        discount_type: dto.discount_type,
        discount_value: dto.discount_value,
        description: dto.description,
        min_order_value: dto.min_order_value,
        is_stackable: dto.is_stackable ?? false,
        expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
        max_uses: dto.max_uses,
      },
    });
  }

  // ── admin: commission management ──────────────────────────────────────────────

  async adminListCommissions(affiliateUserId?: string, status?: string) {
    const ap = affiliateUserId
      ? await this.prisma.affiliateProfile.findUnique({ where: { user_id: affiliateUserId } })
      : null;

    const rows = await this.prisma.affiliateCommission.findMany({
      where: {
        ...(ap ? { affiliate_id: ap.id } : {}),
        ...(status ? { status: status as AffiliateCommissionStatus } : {}),
      },
      include: {
        lead: true,
        certification: { select: { id: true, title: true, acronym: true } },
        course: { select: { id: true, title: true } },
        affiliate: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { first_name: true, last_name: true } },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return rows.map((c) => ({
      ...c,
      sale_amount: Number(c.sale_amount),
      amount: Number(c.amount),
      commission_rate: Number(c.commission_rate),
      product: c.certification
        ? { id: c.certification.id, name: `${c.certification.acronym} – ${c.certification.title}` }
        : c.course
          ? { id: c.course.id, name: c.course.title }
          : null,
    }));
  }

  async adminApproveCommission(id: string) {
    return this.prisma.affiliateCommission.update({
      where: { id },
      data: { status: "approved" },
    });
  }

  async adminMarkCommissionPaid(id: string) {
    return this.prisma.affiliateCommission.update({
      where: { id },
      data: { status: "paid", paid_at: new Date() },
    });
  }

  // ── admin: get leads for a rep ────────────────────────────────────────────────

  async adminGetLeads(affiliateUserId: string, { page = 1, limit = 25, status, search }: {
    page: number; limit: number; status?: string; search?: string;
  }) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: affiliateUserId } });
    if (!ap) return { data: [], total: 0, totalPages: 1 };

    const skip = (page - 1) * limit;
    const where: any = {
      affiliate_id: ap.id,
      ...(status ? { status: status as any } : {}),
      ...(search ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [leads, total] = await Promise.all([
      this.prisma.affiliateLead.findMany({
        where, skip, take: limit,
        include: {
          certification: { select: { title: true, acronym: true } },
          course: { select: { title: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.affiliateLead.count({ where }),
    ]);

    return {
      data: leads.map((l) => ({
        ...l,
        product_name: l.certification
          ? `${l.certification.acronym} – ${l.certification.title}`
          : l.course?.title ?? null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── admin: all promo codes across all reps ────────────────────────────────────

  async adminGetAllPromoCodes({ page = 1, limit = 25, affiliateUserId, search, status }: {
    page: number; limit: number; affiliateUserId?: string; search?: string; status?: string;
  }) {
    const skip = (page - 1) * limit;

    const affiliateProfileId = affiliateUserId
      ? (await this.prisma.affiliateProfile.findUnique({ where: { user_id: affiliateUserId } }))?.id
      : undefined;

    const where: any = {
      ...(affiliateProfileId ? { affiliate_id: affiliateProfileId } : {}),
      ...(status === "active" ? { is_active: true } : status === "inactive" ? { is_active: false } : {}),
      ...(search ? {
        OR: [
          { code: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };

    const [codes, total] = await Promise.all([
      this.prisma.affiliatePromoCode.findMany({
        where, skip, take: limit,
        include: {
          affiliate: {
            select: {
              user: { select: { id: true, profile: { select: { first_name: true, last_name: true } } } },
              referral_code: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.affiliatePromoCode.count({ where }),
    ]);

    return {
      data: codes.map((c) => ({
        ...c,
        discount_value: Number(c.discount_value),
        min_order_value: c.min_order_value ? Number(c.min_order_value) : null,
        affiliate_user_id: c.affiliate?.user?.id ?? null,
        affiliate_name: c.affiliate?.user?.profile
          ? `${c.affiliate.user.profile.first_name ?? ""} ${c.affiliate.user.profile.last_name ?? ""}`.trim()
          : "—",
        affiliate_referral_code: c.affiliate?.referral_code ?? null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── admin: toggle / delete promo code ─────────────────────────────────────────

  async adminTogglePromoCode(promoCodeId: string, isActive: boolean) {
    return this.prisma.affiliatePromoCode.update({
      where: { id: promoCodeId },
      data: { is_active: isActive },
    });
  }

  async adminDeletePromoCode(promoCodeId: string) {
    await this.prisma.affiliatePromoCode.delete({ where: { id: promoCodeId } });
    return { message: "Promo code deleted" };
  }

  // ── affiliate portal: get profile ─────────────────────────────────────────────

  async getMyProfile(userId: string): Promise<any> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        affiliate_profile: true,
      },
    });
    if (!u) throw new NotFoundException("User not found");

    // Auto-create affiliate profile if it doesn't exist yet (e.g. just registered)
    if (!u.affiliate_profile) {
      await this.prisma.affiliateProfile.create({
        data: {
          user_id: userId,
          referral_code: this.generateReferralCode(),
        },
      });
      return this.getMyProfile(userId);
    }

    return this.formatAffiliate(u);
  }

  // ── affiliate portal: update profile ─────────────────────────────────────────

  async updateMyProfile(userId: string, dto: { first_name?: string; last_name?: string; phone?: string }) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.profiles SET
        first_name = COALESCE($1, first_name),
        last_name  = COALESCE($2, last_name),
        phone      = COALESCE($3, phone),
        updated_at = NOW()
       WHERE user_id = $4`,
      dto.first_name ?? null,
      dto.last_name ?? null,
      dto.phone ?? null,
      userId,
    );
    return this.getMyProfile(userId);
  }

  // ── affiliate portal: update payout ──────────────────────────────────────────

  async updateMyPayout(userId: string, dto: { payout_method?: string; payout_details?: string }) {
    await this.prisma.affiliateProfile.update({
      where: { user_id: userId },
      data: { payout_method: dto.payout_method, payout_details: dto.payout_details },
    });
    return { message: "Payout info updated" };
  }

  // ── affiliate portal: change password ────────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new NotFoundException("User not found");
    const valid = await bcrypt.compare(currentPassword, u.password_hash);
    if (!valid) throw new BadRequestException("Current password is incorrect");
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });
    return { message: "Password changed" };
  }

  // ── affiliate portal: dashboard stats ────────────────────────────────────────

  async getDashboardStats(userId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return this._emptyStats();

    const [leads, commissions, promoCodes, products] = await Promise.all([
      this.prisma.affiliateLead.count({ where: { affiliate_id: ap.id } }),
      this.prisma.affiliateCommission.groupBy({
        by: ["status"],
        where: { affiliate_id: ap.id },
        _sum: { amount: true },
      }),
      this.prisma.affiliatePromoCode.count({ where: { affiliate_id: ap.id, is_active: true } }),
      this.prisma.affiliateProductAssignment.count({ where: { affiliate_id: ap.id } }),
    ]);

    const conversionMap = Object.fromEntries(commissions.map((c) => [c.status, Number(c._sum.amount ?? 0)]));
    const purchases = await this.prisma.affiliateLead.count({
      where: { affiliate_id: ap.id, status: "purchased" },
    });

    return {
      total_earnings: (conversionMap["approved"] ?? 0) + (conversionMap["paid"] ?? 0),
      earnings_change: 0,
      pending_commissions: conversionMap["pending"] ?? 0,
      total_leads: leads,
      leads_change: 0,
      conversions: purchases,
      conversions_change: 0,
      conversion_rate: leads > 0 ? Math.round((purchases / leads) * 100) : 0,
      conversion_rate_change: 0,
      total_clicks: 0,
      clicks_change: 0,
      invites_sent: await this.prisma.affiliateInvite.count({ where: { affiliate_id: ap.id } }),
      active_promo_codes: promoCodes,
      active_products: products,
    };
  }

  private _emptyStats() {
    return {
      total_earnings: 0, earnings_change: 0, pending_commissions: 0,
      total_leads: 0, leads_change: 0, conversions: 0, conversions_change: 0,
      conversion_rate: 0, conversion_rate_change: 0, total_clicks: 0, clicks_change: 0,
      invites_sent: 0, active_promo_codes: 0, active_products: 0,
    };
  }

  async getDashboardCharts(_userId: string) {
    return {
      earnings: [], leads: [], clicks: [], conversions: [],
    };
  }

  // ── affiliate portal: products ────────────────────────────────────────────────

  async getMyProducts(userId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({
      where: { user_id: userId },
    });
    if (!ap) return [];

    const assignments = await this.prisma.affiliateProductAssignment.findMany({
      where: { affiliate_id: ap.id },
      include: {
        certification: { select: { id: true, title: true, acronym: true, slug: true, price: true, status: true, badge_image_url: true } },
        course: { select: { id: true, title: true, slug: true, price: true, status: true, thumbnail_url: true } },
      },
    });

    const referralCode = ap.referral_code;

    return assignments.map((a) => {
      if (a.certification) {
        const cert = a.certification as any;
        return {
          assignment_id: a.id,
          type: "certification",
          id: cert.id,
          title: `${cert.acronym} – ${cert.title}`,
          slug: cert.slug,
          price: Number(cert.price),
          status: cert.status,
          image_url: cert.badge_image_url ?? null,
          commission_rate: a.commission_override ? Number(a.commission_override) : Number(ap.commission_rate),
          referral_url: `/certifications/${cert.slug}?ref=${referralCode}`,
        };
      }
      const course = a.course as any;
      return {
        assignment_id: a.id,
        type: "course",
        id: course.id,
        title: course.title,
        slug: course.slug,
        price: Number(course.price),
        status: course.status,
        image_url: course.thumbnail_url ?? null,
        commission_rate: a.commission_override ? Number(a.commission_override) : Number(ap.commission_rate),
        referral_url: `/courses/${course.slug}?ref=${referralCode}`,
      };
    });
  }

  // ── affiliate portal: promo codes ─────────────────────────────────────────────

  async getMyPromoCodes(userId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return [];
    const codes = await this.prisma.affiliatePromoCode.findMany({
      where: { affiliate_id: ap.id },
      orderBy: { created_at: "desc" },
    });
    return codes.map((c) => ({
      ...c,
      discount_value: Number(c.discount_value),
      min_order_value: c.min_order_value ? Number(c.min_order_value) : null,
      status: !c.is_active ? "expired" : c.max_uses && c.uses_count >= c.max_uses ? "exhausted" : "active",
    }));
  }

  // ── affiliate portal: leads ───────────────────────────────────────────────────

  async deleteLead(userId: string, leadId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) throw new NotFoundException("Affiliate profile not found");
    await this.prisma.affiliateLead.deleteMany({
      where: { id: leadId, affiliate_id: ap.id },
    });
    return { message: "Lead deleted" };
  }

  async getMyLeads(userId: string, { page = 1, limit = 20, status, search }: {
    page: number; limit: number; status?: string; search?: string;
  }) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return { data: [], total: 0, totalPages: 1 };

    const offset = (page - 1) * limit;
    const params: any[] = [ap.id];
    const conditions: string[] = [`l.affiliate_id = $1`];

    if (status) {
      params.push(status);
      conditions.push(`l.status::text = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(l.email ILIKE $${idx} OR l.name ILIKE $${idx})`);
    }

    const whereClause = conditions.join(" AND ");

    const [leads, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT l.id, l.affiliate_id, l.email, l.name, l.status::text AS status,
                l.source::text AS source, l.certification_id, l.course_id, l.created_at,
                cert.title AS cert_title, cert.acronym AS cert_acronym,
                crs.title AS course_title
         FROM lms.affiliate_leads l
         LEFT JOIN lms.certifications cert ON l.certification_id = cert.id
         LEFT JOIN lms.courses crs ON l.course_id = crs.id
         WHERE ${whereClause}
         ORDER BY l.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        ...params,
      ),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS count FROM lms.affiliate_leads l WHERE ${whereClause}`,
        ...params,
      ),
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    return {
      data: leads.map((l) => ({
        id: l.id,
        affiliate_id: l.affiliate_id,
        email: l.email,
        name: l.name,
        status: l.status,
        source: l.source,
        created_at: l.created_at,
        product_name: l.cert_title
          ? `${l.cert_acronym} – ${l.cert_title}`
          : l.course_title ?? null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── affiliate portal: commissions ─────────────────────────────────────────────

  async getMyCommissions(userId: string, { page = 1, limit = 20, status }: {
    page: number; limit: number; status?: string;
  }) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return { data: [], total: 0, totalPages: 1 };

    const skip = (page - 1) * limit;
    const where: any = {
      affiliate_id: ap.id,
      ...(status ? { status: status as AffiliateCommissionStatus } : {}),
    };

    const [commissions, total] = await Promise.all([
      this.prisma.affiliateCommission.findMany({
        where, skip, take: limit,
        include: {
          lead: { select: { name: true, email: true } },
          certification: { select: { title: true, acronym: true } },
          course: { select: { title: true } },
        },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.affiliateCommission.count({ where }),
    ]);

    return {
      data: commissions.map((c) => ({
        ...c,
        sale_amount: Number(c.sale_amount),
        amount: Number(c.amount),
        commission_rate: Number(c.commission_rate),
        lead_name: c.lead?.name ?? c.lead?.email ?? null,
        product_name: c.certification
          ? `${c.certification.acronym} – ${c.certification.title}`
          : c.course?.title ?? null,
      })),
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMyCommissionSummary(userId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return { total_earned: 0, pending: 0, approved: 0, paid: 0 };

    const groups = await this.prisma.affiliateCommission.groupBy({
      by: ["status"],
      where: { affiliate_id: ap.id },
      _sum: { amount: true },
    });
    const m = Object.fromEntries(groups.map((g) => [g.status, Number(g._sum.amount ?? 0)]));
    return {
      total_earned: (m["approved"] ?? 0) + (m["paid"] ?? 0),
      pending: m["pending"] ?? 0,
      approved: m["approved"] ?? 0,
      paid: m["paid"] ?? 0,
    };
  }

  // ── affiliate portal: notifications ──────────────────────────────────────────

  async getMyNotifications(userId: string) {
    return [];
  }

  async markNotificationRead(_userId: string, _id: string) {
    return { message: "Marked as read" };
  }

  async markAllNotificationsRead(_userId: string) {
    return { message: "All marked as read" };
  }

  // ── affiliate portal: invites ─────────────────────────────────────────────────

  async getMyInviteStats(userId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return { total_sent: 0, pending: 0, registered: 0, converted: 0 };

    const groups = await this.prisma.affiliateInvite.groupBy({
      by: ["status"],
      where: { affiliate_id: ap.id },
      _count: true,
    });
    const m = Object.fromEntries(groups.map((g) => [g.status, g._count]));
    return {
      total_sent: Object.values(m).reduce((s: number, v: number) => s + v, 0) as number,
      pending: m["pending"] ?? 0,
      registered: m["registered"] ?? 0,
      converted: m["converted"] ?? 0,
    };
  }

  async getMyInvites(userId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) return [];
    return this.prisma.affiliateInvite.findMany({
      where: { affiliate_id: ap.id },
      orderBy: { created_at: "desc" },
      take: 50,
    });
  }

  private async _buildInviteEmail(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { select: { first_name: true, last_name: true } }, affiliate_profile: true },
    });
    if (!u?.affiliate_profile) throw new NotFoundException("Affiliate profile not found");
    const senderName = u.profile?.first_name && u.profile?.last_name
      ? `${u.profile.first_name} ${u.profile.last_name}`
      : u.email;
    const frontendUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3001");
    const inviteLink = `${frontendUrl.replace(/\/$/, "")}/register?ref=${u.affiliate_profile.referral_code}`;
    return { u, senderName, inviteLink };
  }

  async sendInvite(userId: string, email: string, name?: string) {
    const { u, senderName, inviteLink } = await this._buildInviteEmail(userId);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException("This email is already registered in the system and cannot be invited.");

    const invite = await this.prisma.affiliateInvite.create({
      data: { affiliate_id: u.affiliate_profile!.id, email, name },
    });

    await this.mail.sendAffiliateInvite({ to: email, recipientName: name, senderName, inviteLink });

    return invite;
  }

  async resendInvite(userId: string, inviteId: string) {
    const { u, senderName, inviteLink } = await this._buildInviteEmail(userId);

    const invite = await this.prisma.affiliateInvite.findFirst({
      where: { id: inviteId, affiliate_id: u.affiliate_profile!.id },
    });
    if (!invite) throw new NotFoundException("Invite not found");

    await this.mail.sendAffiliateInvite({
      to: invite.email,
      recipientName: invite.name ?? undefined,
      senderName,
      inviteLink,
    });

    return { message: "Invite resent" };
  }

  async deleteInvite(userId: string, inviteId: string) {
    const ap = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
    if (!ap) throw new NotFoundException("Affiliate profile not found");
    await this.prisma.affiliateInvite.deleteMany({
      where: { id: inviteId, affiliate_id: ap.id },
    });
    return { message: "Invite deleted" };
  }

  // ── affiliate portal: analytics ───────────────────────────────────────────────

  async getAnalytics(_userId: string, _range: string) {
    return {
      revenue_over_time: [],
      clicks_vs_conversions: [],
      funnel: [
        { stage: "Clicks", count: 0 },
        { stage: "Leads", count: 0 },
        { stage: "Registered", count: 0 },
        { stage: "Purchased", count: 0 },
      ],
      top_products: [],
    };
  }
}
