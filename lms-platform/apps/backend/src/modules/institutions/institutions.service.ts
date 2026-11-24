import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { Role, InstitutionRole, InstitutionMembershipStatus, PaymentType } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { resolveTxt } from "dns/promises";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { UsersService } from "../users/users.service";
import { AuditLogService } from "../audit-log/audit-log.service";

// Same quoting convention as UsersService.exportCsv.
function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

@Injectable()
export class InstitutionsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private users: UsersService,
    private auditLog: AuditLogService,
  ) {}

  // ── PAII staff (admin app) — package management ────────────────────────────
  // Admin-configurable pricing tiers (spec: never hard-code prices).

  async adminListPackages() {
    return this.prisma.package.findMany({ orderBy: { sort_order: "asc" } });
  }

  async adminCreatePackage(dto: { name: string; tier: "starter" | "professional" | "enterprise"; monthly_price?: number | null; student_limit?: number | null; professor_limit?: number | null; course_limit?: number | null; features?: string[] }, actorUserId?: string) {
    const pkg = await this.prisma.package.create({
      data: {
        name: dto.name.trim(),
        tier: dto.tier,
        monthly_price: dto.monthly_price ?? null,
        student_limit: dto.student_limit ?? null,
        professor_limit: dto.professor_limit ?? null,
        course_limit: dto.course_limit ?? null,
        features: dto.features ?? [],
      },
    });
    await this.auditLog.log({ userId: actorUserId, action: "package.created", entityType: "Package", entityId: pkg.id, newValue: dto });
    return pkg;
  }

  async adminUpdatePackage(id: string, dto: Partial<{ name: string; monthly_price: number | null; student_limit: number | null; professor_limit: number | null; course_limit: number | null; features: string[]; is_active: boolean; sort_order: number }>, actorUserId?: string) {
    const before = await this.prisma.package.findUniqueOrThrow({ where: { id } }).catch(() => { throw new NotFoundException("Package not found"); });
    const updated = await this.prisma.package.update({ where: { id }, data: dto });
    await this.auditLog.log({
      userId: actorUserId,
      action: "package.updated",
      entityType: "Package",
      entityId: id,
      oldValue: { name: before.name, monthly_price: before.monthly_price?.toString() ?? null, is_active: before.is_active },
      newValue: dto,
    });
    return updated;
  }

  async adminDeletePackage(id: string) {
    const inUse = await this.prisma.institutionSubscription.findFirst({ where: { package_id: id } });
    if (inUse) throw new BadRequestException("Can't delete a package with active/past subscriptions — deactivate it instead.");
    await this.prisma.package.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Institution billing (academia app) ─────────────────────────────────────

  async getUsageCounts(institutionId: string) {
    const [studentCount, staffCount, courseCount] = await Promise.all([
      this.prisma.institutionMembership.count({ where: { institution_id: institutionId, role: InstitutionRole.student, status: "active" } }),
      // professor_limit counts only `professor` — owner/admin are
      // institutional overhead (account management), not teaching seats,
      // same convention as e.g. workspace owners not counting against a
      // per-seat limit in most SaaS per-seat models.
      this.prisma.institutionMembership.count({ where: { institution_id: institutionId, role: InstitutionRole.professor, status: { in: ["active", "invited"] } } }),
      this.prisma.course.count({ where: { institution_id: institutionId } }),
    ]);
    return { student_count: studentCount, staff_count: staffCount, course_count: courseCount };
  }

  async getBilling(institutionId: string) {
    const subscription = await this.prisma.institutionSubscription.findUnique({
      where: { institution_id: institutionId },
      include: { package: true },
    });
    const usage = await this.getUsageCounts(institutionId);
    return { subscription, usage };
  }

  // Payment rows for an institution's subscription are attributed to whoever
  // was the institution's owner at the time each invoice was paid (see
  // PaymentsService.handleInstitutionSubscriptionInvoicePaid) — there's no
  // institution_id column on Payment, same "attribute to the billing
  // contact" convention Organization seat purchases already use. Looking up
  // by the CURRENT owner misses history from a prior owner, but ownership
  // changing hands is rare enough that this matches the existing tradeoff
  // rather than introducing a new one.
  async getInvoices(institutionId: string) {
    const ownerMembership = await this.prisma.institutionMembership.findFirst({
      where: { institution_id: institutionId, role: InstitutionRole.owner },
      orderBy: { created_at: "asc" },
    });
    if (!ownerMembership) return [];

    return this.prisma.payment.findMany({
      where: { user_id: ownerMembership.user_id, type: PaymentType.institution_subscription },
      orderBy: { created_at: "desc" },
      select: {
        id: true, amount: true, currency: true, description: true, status: true,
        stripe_receipt_url: true, succeeded_at: true, created_at: true,
      },
    });
  }

  async getAvailablePackages() {
    return this.prisma.package.findMany({ where: { is_active: true }, orderBy: { sort_order: "asc" } });
  }

  // Throws if the institution has no active (non-expired) subscription — the
  // gate for anything that costs PAII real resources: inviting more staff,
  // creating institution-attributed courses. Never blocks a student's own
  // registration (see AuthService.register's soft capacity check instead).
  async assertActiveSubscription(institutionId: string) {
    const subscription = await this.prisma.institutionSubscription.findUnique({ where: { institution_id: institutionId } });
    const expired = subscription?.current_period_end != null && subscription.current_period_end < new Date();
    if (!subscription || subscription.status !== "active" || expired) {
      throw new BadRequestException("This institution doesn't have an active subscription. Subscribe to a package first.");
    }
    return subscription;
  }

  // ── PAII staff (admin app) — provisioning ──────────────────────────────────

  async adminList() {
    return this.prisma.institution.findMany({
      include: {
        domains: true,
        _count: { select: { memberships: true, courses: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  // Same collision-avoidance pattern as Course slugs (profCreateCourse in
  // prep-courses.service.ts) — lowercase/hyphenate, then append -1, -2, ...
  // on collision.
  private async generateSlug(name: string): Promise<string> {
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let slug = base || "institution";
    for (let i = 0; ; i++) {
      const candidate = i === 0 ? slug : `${slug}-${i}`;
      const existing = await this.prisma.institution.findUnique({ where: { slug: candidate } });
      if (!existing) { slug = candidate; break; }
    }
    return slug;
  }

  async adminCreate(dto: { name: string; code: string; contact_email?: string; website?: string; description?: string }, actorUserId?: string) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.institution.findUnique({ where: { code } });
    if (existing) throw new ConflictException("An institution with this code already exists");

    const slug = await this.generateSlug(dto.name);
    const institution = await this.prisma.institution.create({
      data: {
        name: dto.name.trim(),
        code,
        slug,
        contact_email: dto.contact_email?.trim() || null,
        website: dto.website?.trim() || null,
        description: dto.description?.trim() || null,
      },
    });
    await this.auditLog.log({ userId: actorUserId, action: "institution.created", entityType: "Institution", entityId: institution.id, newValue: { name: institution.name, code: institution.code } });
    return institution;
  }

  async adminGetDetail(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        domains: true,
        memberships: { include: { user: { select: { id: true, email: true } } }, orderBy: { created_at: "desc" } },
        courses: { select: { id: true, title: true, visibility: true, approval_status: true, status: true } },
      },
    });
    if (!institution) throw new NotFoundException("Institution not found");
    return institution;
  }

  async adminUpdate(id: string, dto: Partial<{ name: string; status: "active" | "suspended"; logo_url: string | null; description: string | null; website: string | null; contact_email: string | null }>) {
    await this.prisma.institution.findUniqueOrThrow({ where: { id } }).catch(() => { throw new NotFoundException("Institution not found"); });
    return this.prisma.institution.update({ where: { id }, data: dto });
  }

  // Manual admin verification only in Phase 1 — DNS/SSO verification methods
  // are future work (see InstitutionDomain.verification_method). Adding a
  // domain here is a trust decision, so it's deliberately PAII-staff-only,
  // never self-service — an institution admin adding e.g. "gmail.com" would
  // otherwise grant free institutional access to the entire public.
  async adminAddDomain(institutionId: string, domain: string, actorUserId?: string) {
    const normalized = domain.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) throw new BadRequestException("Enter a valid domain, e.g. unfc.ca");

    await this.prisma.institution.findUniqueOrThrow({ where: { id: institutionId } }).catch(() => { throw new NotFoundException("Institution not found"); });
    const existing = await this.prisma.institutionDomain.findUnique({ where: { domain: normalized } });
    if (existing) throw new ConflictException("This domain is already registered to an institution");

    const created = await this.prisma.institutionDomain.create({
      data: { institution_id: institutionId, domain: normalized, verified_at: new Date() },
    });
    await this.auditLog.log({ userId: actorUserId, action: "institution.domain_added", entityType: "Institution", entityId: institutionId, newValue: { domain: normalized } });
    return created;
  }

  async adminRemoveDomain(institutionId: string, domainId: string, actorUserId?: string) {
    const domain = await this.prisma.institutionDomain.findFirst({ where: { id: domainId, institution_id: institutionId } });
    if (!domain) throw new NotFoundException("Domain not found");
    await this.prisma.institutionDomain.delete({ where: { id: domainId } });
    await this.auditLog.log({ userId: actorUserId, action: "institution.domain_removed", entityType: "Institution", entityId: institutionId, oldValue: { domain: domain.domain } });
    return { removed: true };
  }

  // ── Institution admin (academia app) — self-service DNS domain verification ──
  // adminAddDomain is staff-only because trusting a domain sight-unseen (e.g.
  // an admin claiming "gmail.com") grants free institutional access to the
  // public. Self-service sidesteps that risk entirely by requiring the
  // institution to prove DNS control first — nothing is trusted (verified_at
  // stays null) until requestDomainVerification's token is found published
  // as a TXT record, the same ownership proof any registrar/host relies on.
  async requestDomainVerification(institutionId: string, domain: string, actorUserId?: string) {
    const normalized = domain.trim().toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) throw new BadRequestException("Enter a valid domain, e.g. unfc.ca");

    const existing = await this.prisma.institutionDomain.findUnique({ where: { domain: normalized } });
    if (existing) throw new ConflictException("This domain is already registered to an institution");

    const token = randomBytes(16).toString("hex");
    const created = await this.prisma.institutionDomain.create({
      data: { institution_id: institutionId, domain: normalized, verification_method: "dns", verification_token: token },
    });
    await this.auditLog.log({ userId: actorUserId, action: "institution.domain_verification_requested", entityType: "Institution", entityId: institutionId, newValue: { domain: normalized } });
    return { ...created, dns_record: { type: "TXT", name: `_paii-verify.${normalized}`, value: token } };
  }

  async verifyDomainDns(institutionId: string, domainId: string, actorUserId?: string) {
    const domain = await this.prisma.institutionDomain.findFirst({ where: { id: domainId, institution_id: institutionId } });
    if (!domain) throw new NotFoundException("Domain not found");
    if (domain.verified_at) return domain;
    if (domain.verification_method !== "dns" || !domain.verification_token) {
      throw new BadRequestException("This domain isn't set up for self-service verification — contact PAII staff.");
    }

    let records: string[][];
    try {
      records = await resolveTxt(`_paii-verify.${domain.domain}`);
    } catch {
      throw new BadRequestException(`Couldn't find a TXT record at _paii-verify.${domain.domain} yet. DNS changes can take a few minutes to propagate — try again shortly.`);
    }
    const found = records.some((chunks) => chunks.join("") === domain.verification_token);
    if (!found) throw new BadRequestException(`The TXT record at _paii-verify.${domain.domain} doesn't match the expected value yet.`);

    const updated = await this.prisma.institutionDomain.update({ where: { id: domainId }, data: { verified_at: new Date() } });
    await this.auditLog.log({ userId: actorUserId, action: "institution.domain_verified", entityType: "Institution", entityId: institutionId, newValue: { domain: domain.domain } });
    return updated;
  }

  async removeDomainSelfService(institutionId: string, domainId: string, actorUserId?: string) {
    const domain = await this.prisma.institutionDomain.findFirst({ where: { id: domainId, institution_id: institutionId } });
    if (!domain) throw new NotFoundException("Domain not found");
    await this.prisma.institutionDomain.delete({ where: { id: domainId } });
    await this.auditLog.log({ userId: actorUserId, action: "institution.domain_removed", entityType: "Institution", entityId: institutionId, oldValue: { domain: domain.domain } });
    return { removed: true };
  }

  // Provisions the first owner account for a newly-created institution —
  // mirrors OrganizationsService.adminProvisionAdmin exactly (same
  // existing-account-vs-new-account branching, same requirePasswordReset
  // email flow), just targeting InstitutionMembership instead of
  // OrganizationAdmin.
  async adminProvisionOwner(institutionId: string, dto: { email: string; first_name: string; last_name: string }, actorUserId?: string) {
    const normalized = dto.email.toLowerCase().trim();
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) throw new NotFoundException("Institution not found");

    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      const existingMembership = await this.prisma.institutionMembership.findUnique({
        where: { user_id_institution_id: { user_id: existing.id, institution_id: institutionId } },
      });
      if (existingMembership) throw new ConflictException("This user already has a membership at this institution.");
      await this.prisma.institutionMembership.create({
        data: { user_id: existing.id, institution_id: institutionId, role: InstitutionRole.owner, status: InstitutionMembershipStatus.active },
      });
      await this.auditLog.log({ userId: actorUserId, action: "institution.owner_provisioned", entityType: "Institution", entityId: institutionId, newValue: { email: existing.email } });
      return { id: existing.id, email: existing.email, message: "This email already had a PAII account — granted institution owner access directly. No email was sent since they already have a password." };
    }

    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        role: Role.student,
        email_verified: true,
        profile: {
          create: { first_name: dto.first_name, last_name: dto.last_name, display_name: `${dto.first_name} ${dto.last_name}` },
        },
        institution_memberships: {
          create: { institution_id: institutionId, role: InstitutionRole.owner, status: InstitutionMembershipStatus.invited },
        },
      },
    });

    await this.users.requirePasswordReset(user.id);
    await this.auditLog.log({ userId: actorUserId, action: "institution.owner_provisioned", entityType: "Institution", entityId: institutionId, newValue: { email: user.email } });
    return { id: user.id, email: user.email, message: "Institution owner invited — password setup email sent." };
  }

  // ── Institution admin (academia app) ───────────────────────────────────────

  async getDashboard(institutionId: string) {
    const [professorCount, studentCount, courseCount, pendingInviteCount, ssoConfig, subscription, recentActivity] = await Promise.all([
      this.prisma.institutionMembership.count({ where: { institution_id: institutionId, role: { in: [InstitutionRole.professor, InstitutionRole.owner, InstitutionRole.admin] }, status: "active" } }),
      this.prisma.institutionMembership.count({ where: { institution_id: institutionId, role: InstitutionRole.student, status: "active" } }),
      this.prisma.course.count({ where: { institution_id: institutionId } }),
      this.prisma.institutionMembership.count({ where: { institution_id: institutionId, status: "invited" } }),
      this.prisma.institutionSsoConfig.findUnique({ where: { institution_id: institutionId } }),
      this.prisma.institutionSubscription.findUnique({ where: { institution_id: institutionId } }),
      this.prisma.auditLog.findMany({
        where: { entity_type: "Institution", entity_id: institutionId },
        include: { user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } } },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
    ]);
    const institution = await this.prisma.institution.findUniqueOrThrow({ where: { id: institutionId } });
    return {
      institution,
      professor_count: professorCount,
      student_count: studentCount,
      course_count: courseCount,
      pending_invite_count: pendingInviteCount,
      onboarding: {
        has_professors: professorCount > 1, // >1 because the owner itself counts
        sso_enabled: !!ssoConfig?.is_enabled,
        has_active_subscription: subscription?.status === "active",
      },
      subscription_status: subscription?.status ?? null,
      recent_activity: recentActivity,
    };
  }

  // Mirrors AuditLogService.adminList's exact shape, scoped to this
  // institution — every institution-scoped write already calls
  // auditLog.log({entityType: "Institution", entityId: institutionId, ...}),
  // so this is a read-only view over data that already exists.
  async getActivity(institutionId: string, query: { action?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 30);
    const where = {
      entity_type: "Institution",
      entity_id: institutionId,
      ...(query.action ? { action: { contains: query.action } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  // Real engagement, not roster size — getDashboard's counts already show
  // how many people are enrolled; this answers whether they're actually
  // doing anything. "Active" is measured off LessonProgress.updated_at (a
  // row only changes when someone actually watches/completes a lesson or
  // submits a quiz), not last_login_at, so a student who logs in but never
  // opens a lesson doesn't count as active.
  async getAnalytics(institutionId: string, range: "7d" | "30d" | "90d" = "30d") {
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const dayKey = (d: Date) => d.toISOString().split("T")[0];
    const emptyDays = () => {
      const out: { date: string; value: number }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setUTCDate(d.getUTCDate() + i);
        out.push({ date: dayKey(d), value: 0 });
      }
      return out;
    };

    const courses = await this.prisma.course.findMany({ where: { institution_id: institutionId }, select: { id: true, title: true } });
    const courseIds = courses.map((c) => c.id);

    if (!courseIds.length) {
      return { enrollments_over_time: emptyDays(), active_students_over_time: emptyDays(), active_students_total: 0, top_courses: [] };
    }

    const [enrollments, progressRows, totalCounts, completedCounts] = await Promise.all([
      this.prisma.courseEnrollment.findMany({ where: { course_id: { in: courseIds }, enrolled_at: { gte: since } }, select: { enrolled_at: true } }),
      this.prisma.lessonProgress.findMany({ where: { course_enrollment: { course_id: { in: courseIds } }, updated_at: { gte: since } }, select: { user_id: true, updated_at: true } }),
      this.prisma.courseEnrollment.groupBy({ by: ["course_id"], where: { course_id: { in: courseIds } }, _count: { _all: true } }),
      this.prisma.courseEnrollment.groupBy({ by: ["course_id"], where: { course_id: { in: courseIds }, completed_at: { not: null } }, _count: { _all: true } }),
    ]);

    const enrollmentsByDay = emptyDays();
    const enrollmentIndex = new Map(enrollmentsByDay.map((d, i) => [d.date, i]));
    for (const e of enrollments) {
      const idx = enrollmentIndex.get(dayKey(e.enrolled_at));
      if (idx !== undefined) enrollmentsByDay[idx].value++;
    }

    const activeByDay = new Map<string, Set<string>>();
    for (const p of progressRows) {
      const key = dayKey(p.updated_at);
      if (!activeByDay.has(key)) activeByDay.set(key, new Set());
      activeByDay.get(key)!.add(p.user_id);
    }
    const activeStudentsOverTime = emptyDays().map((d) => ({ date: d.date, value: activeByDay.get(d.date)?.size ?? 0 }));

    const totalMap = new Map(totalCounts.map((c) => [c.course_id, c._count._all]));
    const completedMap = new Map(completedCounts.map((c) => [c.course_id, c._count._all]));
    const topCourses = courses
      .map((c) => {
        const enrollment_count = totalMap.get(c.id) ?? 0;
        const completed_count = completedMap.get(c.id) ?? 0;
        return { id: c.id, title: c.title, enrollment_count, completed_count, completion_rate: enrollment_count > 0 ? completed_count / enrollment_count : 0 };
      })
      .filter((c) => c.enrollment_count > 0)
      .sort((a, b) => b.enrollment_count - a.enrollment_count)
      .slice(0, 8);

    return {
      enrollments_over_time: enrollmentsByDay,
      active_students_over_time: activeStudentsOverTime,
      active_students_total: new Set(progressRows.map((p) => p.user_id)).size,
      top_courses: topCourses,
    };
  }

  async getSettings(institutionId: string) {
    return this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      include: { domains: true },
    });
  }

  async updateSettings(institutionId: string, dto: Partial<{ name: string; logo_url: string | null; description: string | null; website: string | null }>) {
    return this.prisma.institution.update({ where: { id: institutionId }, data: dto });
  }

  private professorsWhere(institutionId: string, search?: string) {
    return {
      institution_id: institutionId,
      role: { in: [InstitutionRole.professor, InstitutionRole.admin, InstitutionRole.owner] },
      ...(search ? {
        OR: [
          { user: { email: { contains: search, mode: "insensitive" as const } } },
          { user: { profile: { first_name: { contains: search, mode: "insensitive" as const } } } },
          { user: { profile: { last_name: { contains: search, mode: "insensitive" as const } } } },
        ],
      } : {}),
    };
  }

  private async shapeProfessors(memberships: Array<{ id: string; user_id: string; role: InstitutionRole; status: InstitutionMembershipStatus; created_at: Date; user: { email: string; profile: { first_name: string | null; last_name: string | null } | null } }>, institutionId: string) {
    const courseCounts = await this.prisma.course.groupBy({
      by: ["created_by"],
      where: { institution_id: institutionId, created_by: { in: memberships.map((m) => m.user_id) } },
      _count: true,
    });
    const countByUser = new Map(courseCounts.map((c) => [c.created_by, c._count]));
    return memberships.map((m) => ({
      membership_id: m.id,
      user_id: m.user_id,
      email: m.user.email,
      first_name: m.user.profile?.first_name ?? null,
      last_name: m.user.profile?.last_name ?? null,
      role: m.role,
      status: m.status,
      course_count: countByUser.get(m.user_id) ?? 0,
      joined_at: m.created_at,
    }));
  }

  async getProfessors(institutionId: string, query: { page?: string; limit?: string; search?: string } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where = this.professorsWhere(institutionId, query.search);
    const [memberships, total] = await Promise.all([
      this.prisma.institutionMembership.findMany({
        where,
        include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.institutionMembership.count({ where }),
    ]);
    const data = await this.shapeProfessors(memberships, institutionId);
    return { data, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async exportProfessorsCsv(institutionId: string, search?: string) {
    const memberships = await this.prisma.institutionMembership.findMany({
      where: this.professorsWhere(institutionId, search),
      include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
      orderBy: { created_at: "desc" },
    });
    const rows = await this.shapeProfessors(memberships, institutionId);
    const headers = ["Email", "First Name", "Last Name", "Role", "Status", "Courses", "Joined"];
    const csvRows = rows.map((r) => [
      r.email, r.first_name ?? "", r.last_name ?? "", r.role, r.status, String(r.course_count),
      new Date(r.joined_at).toISOString().split("T")[0],
    ]);
    return toCsv(headers, csvRows);
  }

  // Mirrors OrganizationsService.adminProvisionAdmin's branching (existing
  // account vs. brand-new account) — the one addition is auto-promoting a
  // plain `student` role to `professor` (never downgrading anyone with a
  // higher-privilege role already), since a professor invited here needs
  // the global `professor` role to log into the professors app at all.
  async inviteProfessor(institutionId: string, invitedByUserId: string, dto: { email: string; first_name?: string; last_name?: string; role?: "admin" | "professor" }) {
    const normalized = dto.email.toLowerCase().trim();
    const role = dto.role === "admin" ? InstitutionRole.admin : InstitutionRole.professor;
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) throw new NotFoundException("Institution not found");

    // Admins are institutional overhead (account management), not a teaching
    // seat, so they never count against — or need to be checked against —
    // the plan's professor_limit (same convention as owners; see
    // getUsageCounts' own comment).
    if (role === InstitutionRole.professor) {
      const subscription = await this.assertActiveSubscription(institutionId);
      const pkg = await this.prisma.package.findUnique({ where: { id: subscription.package_id } });
      if (pkg?.professor_limit != null) {
        const { staff_count } = await this.getUsageCounts(institutionId);
        if (staff_count >= pkg.professor_limit) {
          throw new BadRequestException(`Your ${pkg.name} plan allows up to ${pkg.professor_limit} professors. Upgrade your package to invite more.`);
        }
      }
    } else {
      await this.assertActiveSubscription(institutionId);
    }

    const existing = await this.prisma.user.findUnique({ where: { email: normalized }, include: { profile: true } });
    if (existing) {
      const existingMembership = await this.prisma.institutionMembership.findUnique({
        where: { user_id_institution_id: { user_id: existing.id, institution_id: institutionId } },
      });
      if (existingMembership) throw new ConflictException("This person already has a membership at this institution.");

      await this.prisma.institutionMembership.create({
        data: { user_id: existing.id, institution_id: institutionId, role, status: InstitutionMembershipStatus.active },
      });
      // Only a professor-role membership needs professors-app access —
      // admin is purely an academia-app (institution portal) role, gated by
      // InstitutionMembership.role alone, so the global Role never changes for it.
      if (role === InstitutionRole.professor && existing.role === Role.student) {
        await this.prisma.user.update({ where: { id: existing.id }, data: { role: Role.professor } });
      }
      await this.auditLog.log({ userId: invitedByUserId, action: "institution.member_invited", entityType: "Institution", entityId: institutionId, newValue: { email: existing.email, role } });
      return { id: existing.id, email: existing.email, message: "This email already had a PAII account — granted access directly. No email was sent since they already have a password." };
    }

    if (!dto.first_name || !dto.last_name) throw new BadRequestException("First and last name are required for a new account");

    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        // Vetted by the institution admin directly — skip the normal
        // public professor-application review gate (is_active stays true),
        // unlike the self-serve /register professor path. An admin invite
        // keeps the default global `student` role since admin access is
        // gated entirely by InstitutionMembership.role, not the global Role.
        role: role === InstitutionRole.professor ? Role.professor : Role.student,
        is_active: true,
        email_verified: true,
        profile: {
          create: { first_name: dto.first_name, last_name: dto.last_name, display_name: `${dto.first_name} ${dto.last_name}` },
        },
        institution_memberships: {
          create: { institution_id: institutionId, role, status: InstitutionMembershipStatus.invited },
        },
      },
    });

    await this.users.requirePasswordReset(user.id);
    await this.auditLog.log({ userId: invitedByUserId, action: "institution.member_invited", entityType: "Institution", entityId: institutionId, newValue: { email: user.email, role } });
    return { id: user.id, email: user.email, message: "Invited — password setup email sent." };
  }

  // Students today only ever join by registering with a verified email
  // domain (auto-join, see AuthService.register) — there was no way for an
  // institution to directly add a specific student, unlike professors.
  // Mirrors inviteProfessor's existing/new-user branching exactly, just
  // always role: student, checked against the plan's student_limit instead
  // of professor_limit.
  async inviteStudent(institutionId: string, invitedByUserId: string, dto: { email: string; first_name?: string; last_name?: string }) {
    const normalized = dto.email.toLowerCase().trim();
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) throw new NotFoundException("Institution not found");

    const subscription = await this.assertActiveSubscription(institutionId);
    const pkg = await this.prisma.package.findUnique({ where: { id: subscription.package_id } });
    if (pkg?.student_limit != null) {
      const { student_count } = await this.getUsageCounts(institutionId);
      if (student_count >= pkg.student_limit) {
        throw new BadRequestException(`Your ${pkg.name} plan allows up to ${pkg.student_limit} students. Upgrade your package to add more.`);
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      const existingMembership = await this.prisma.institutionMembership.findUnique({
        where: { user_id_institution_id: { user_id: existing.id, institution_id: institutionId } },
      });
      if (existingMembership) throw new ConflictException("This person already has a membership at this institution.");

      await this.prisma.institutionMembership.create({
        data: { user_id: existing.id, institution_id: institutionId, role: InstitutionRole.student, status: InstitutionMembershipStatus.active },
      });
      await this.auditLog.log({ userId: invitedByUserId, action: "institution.member_invited", entityType: "Institution", entityId: institutionId, newValue: { email: existing.email, role: "student" } });
      return { id: existing.id, email: existing.email, message: "This email already had a PAII account — added directly. No email was sent since they already have a password." };
    }

    if (!dto.first_name || !dto.last_name) throw new BadRequestException("First and last name are required for a new account");

    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        role: Role.student,
        is_active: true,
        email_verified: true,
        profile: { create: { first_name: dto.first_name, last_name: dto.last_name, display_name: `${dto.first_name} ${dto.last_name}` } },
        institution_memberships: { create: { institution_id: institutionId, role: InstitutionRole.student, status: InstitutionMembershipStatus.invited } },
      },
    });

    await this.users.requirePasswordReset(user.id);
    await this.auditLog.log({ userId: invitedByUserId, action: "institution.member_invited", entityType: "Institution", entityId: institutionId, newValue: { email: user.email, role: "student" } });
    return { id: user.id, email: user.email, message: "Invited — password setup email sent." };
  }

  async resendProfessorInvite(institutionId: string, membershipId: string, actorUserId?: string) {
    const membership = await this.prisma.institutionMembership.findFirst({
      where: { id: membershipId, institution_id: institutionId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!membership) throw new NotFoundException("Membership not found");
    if (membership.status !== InstitutionMembershipStatus.invited) throw new BadRequestException("This person has already joined — nothing to resend.");

    await this.users.requirePasswordReset(membership.user.id);
    await this.auditLog.log({ userId: actorUserId, action: "institution.invite_resent", entityType: "Institution", entityId: institutionId, newValue: { email: membership.user.email } });
    return { message: "Invite email resent." };
  }

  async updateMembershipRole(institutionId: string, membershipId: string, newRole: "admin" | "professor", actorUserId: string) {
    const membership = await this.prisma.institutionMembership.findFirst({
      where: { id: membershipId, institution_id: institutionId },
      include: { user: { select: { email: true } } },
    });
    if (!membership) throw new NotFoundException("Membership not found");
    if (membership.role === InstitutionRole.owner) throw new BadRequestException("Cannot change the institution owner's role");
    if (membership.user_id === actorUserId) throw new BadRequestException("You can't change your own role");

    const role = newRole === "admin" ? InstitutionRole.admin : InstitutionRole.professor;
    if (membership.role === role) return { role };

    await this.prisma.institutionMembership.update({ where: { id: membershipId }, data: { role } });
    await this.auditLog.log({
      userId: actorUserId, action: "institution.member_role_changed", entityType: "Institution", entityId: institutionId,
      oldValue: { email: membership.user.email, role: membership.role }, newValue: { email: membership.user.email, role },
    });
    return { role };
  }

  async removeProfessor(institutionId: string, membershipId: string, actorUserId?: string) {
    const membership = await this.prisma.institutionMembership.findFirst({ where: { id: membershipId, institution_id: institutionId }, include: { user: { select: { email: true } } } });
    if (!membership) throw new NotFoundException("Membership not found");
    if (membership.role === InstitutionRole.owner) throw new BadRequestException("Cannot remove the institution owner");
    await this.prisma.institutionMembership.update({ where: { id: membershipId }, data: { status: InstitutionMembershipStatus.suspended } });
    await this.auditLog.log({ userId: actorUserId, action: "institution.professor_suspended", entityType: "Institution", entityId: institutionId, oldValue: { email: membership.user.email } });
    return { suspended: true };
  }

  private studentsWhere(institutionId: string, search?: string) {
    return {
      institution_id: institutionId,
      role: InstitutionRole.student,
      ...(search ? {
        OR: [
          { user: { email: { contains: search, mode: "insensitive" as const } } },
          { user: { profile: { first_name: { contains: search, mode: "insensitive" as const } } } },
          { user: { profile: { last_name: { contains: search, mode: "insensitive" as const } } } },
        ],
      } : {}),
    };
  }

  private shapeStudents(memberships: Array<{ id: string; user_id: string; status: InstitutionMembershipStatus; created_at: Date; user: { email: string; profile: { first_name: string | null; last_name: string | null } | null } }>) {
    return memberships.map((m) => ({
      membership_id: m.id,
      user_id: m.user_id,
      email: m.user.email,
      first_name: m.user.profile?.first_name ?? null,
      last_name: m.user.profile?.last_name ?? null,
      status: m.status,
      joined_at: m.created_at,
    }));
  }

  async getStudents(institutionId: string, query: { page?: string; limit?: string; search?: string } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where = this.studentsWhere(institutionId, query.search);
    const [memberships, total] = await Promise.all([
      this.prisma.institutionMembership.findMany({
        where,
        include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.institutionMembership.count({ where }),
    ]);
    return { data: this.shapeStudents(memberships), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async exportStudentsCsv(institutionId: string, search?: string) {
    const memberships = await this.prisma.institutionMembership.findMany({
      where: this.studentsWhere(institutionId, search),
      include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
      orderBy: { created_at: "desc" },
    });
    const rows = this.shapeStudents(memberships);
    const headers = ["Email", "First Name", "Last Name", "Status", "Joined"];
    const csvRows = rows.map((r) => [r.email, r.first_name ?? "", r.last_name ?? "", r.status, new Date(r.joined_at).toISOString().split("T")[0]]);
    return toCsv(headers, csvRows);
  }

  private coursesWhere(institutionId: string, search?: string) {
    return {
      institution_id: institutionId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };
  }

  private coursesSelect = {
    id: true, title: true, slug: true, visibility: true, approval_status: true, status: true, is_listed: true, price: true,
    created_at: true,
    creator: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
    term: { select: { id: true, name: true } },
    instructors: { select: { user_id: true, is_lead: true, user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } } } },
    _count: { select: { enrollments: true } },
  } as const;

  async getCourses(institutionId: string, query: { page?: string; limit?: string; search?: string } = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const where = this.coursesWhere(institutionId, query.search);
    const [data, total] = await Promise.all([
      this.prisma.course.findMany({ where, select: this.coursesSelect, orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.course.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async exportCoursesCsv(institutionId: string, search?: string) {
    const courses = await this.prisma.course.findMany({ where: this.coursesWhere(institutionId, search), select: this.coursesSelect, orderBy: { created_at: "desc" } });
    const headers = ["Title", "Instructor", "Visibility", "Term", "Status", "Enrollments", "Created"];
    const csvRows = courses.map((c) => [
      c.title,
      c.creator?.profile?.first_name ? `${c.creator.profile.first_name} ${c.creator.profile.last_name ?? ""}` : c.creator?.email ?? "",
      c.visibility, c.term?.name ?? "", c.visibility === "public" ? c.approval_status : "active",
      String(c._count.enrollments), new Date(c.created_at).toISOString().split("T")[0],
    ]);
    return toCsv(headers, csvRows);
  }

  // ── Academic terms & cohorts (academia app, institution self-service) ──────
  // Purely organizational — unlike domains, this carries no trust/security
  // implications, so (unlike adminAddDomain) institution owners/admins
  // manage this themselves rather than needing PAII staff.

  async getTerms(institutionId: string) {
    return this.prisma.academicTerm.findMany({
      where: { institution_id: institutionId },
      include: { _count: { select: { cohorts: true, courses: true } } },
      orderBy: { start_date: "desc" },
    });
  }

  async createTerm(institutionId: string, dto: { name: string; start_date: string; end_date: string; status?: "upcoming" | "active" | "completed" }, actorUserId?: string) {
    if (!dto.name?.trim()) throw new BadRequestException("Term name is required");
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException("End date must be after start date");
    }
    const term = await this.prisma.academicTerm.create({
      data: { institution_id: institutionId, name: dto.name.trim(), start_date: start, end_date: end, status: dto.status ?? "upcoming" },
    });
    await this.auditLog.log({ userId: actorUserId, action: "institution.term_created", entityType: "Institution", entityId: institutionId, newValue: { name: term.name } });
    return term;
  }

  async updateTerm(institutionId: string, termId: string, dto: Partial<{ name: string; start_date: string; end_date: string; status: "upcoming" | "active" | "completed" }>) {
    const term = await this.prisma.academicTerm.findFirst({ where: { id: termId, institution_id: institutionId } });
    if (!term) throw new NotFoundException("Term not found");
    return this.prisma.academicTerm.update({
      where: { id: termId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.start_date ? { start_date: new Date(dto.start_date) } : {}),
        ...(dto.end_date ? { end_date: new Date(dto.end_date) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  async deleteTerm(institutionId: string, termId: string) {
    const term = await this.prisma.academicTerm.findFirst({ where: { id: termId, institution_id: institutionId } });
    if (!term) throw new NotFoundException("Term not found");
    // Cohorts/courses referencing this term have onDelete: SetNull — deleting
    // a term un-scopes them rather than cascading, so this is always safe.
    await this.prisma.academicTerm.delete({ where: { id: termId } });
    return { deleted: true };
  }

  async getCohorts(institutionId: string) {
    const cohorts = await this.prisma.cohort.findMany({
      where: { institution_id: institutionId },
      include: { term: { select: { id: true, name: true } }, _count: { select: { memberships: true } } },
      orderBy: { created_at: "desc" },
    });
    return cohorts;
  }

  async createCohort(institutionId: string, dto: { name: string; description?: string; term_id?: string | null }) {
    if (!dto.name?.trim()) throw new BadRequestException("Cohort name is required");
    if (dto.term_id) {
      const term = await this.prisma.academicTerm.findFirst({ where: { id: dto.term_id, institution_id: institutionId } });
      if (!term) throw new NotFoundException("Term not found for this institution");
    }
    return this.prisma.cohort.create({
      data: { institution_id: institutionId, name: dto.name.trim(), description: dto.description?.trim() || null, term_id: dto.term_id || null },
    });
  }

  async updateCohort(institutionId: string, cohortId: string, dto: Partial<{ name: string; description: string | null; term_id: string | null }>) {
    const cohort = await this.prisma.cohort.findFirst({ where: { id: cohortId, institution_id: institutionId } });
    if (!cohort) throw new NotFoundException("Cohort not found");
    return this.prisma.cohort.update({ where: { id: cohortId }, data: dto });
  }

  async deleteCohort(institutionId: string, cohortId: string) {
    const cohort = await this.prisma.cohort.findFirst({ where: { id: cohortId, institution_id: institutionId } });
    if (!cohort) throw new NotFoundException("Cohort not found");
    await this.prisma.cohort.delete({ where: { id: cohortId } });
    return { deleted: true };
  }

  async getCohortMembers(institutionId: string, cohortId: string) {
    const cohort = await this.prisma.cohort.findFirst({ where: { id: cohortId, institution_id: institutionId } });
    if (!cohort) throw new NotFoundException("Cohort not found");
    return this.prisma.cohortMembership.findMany({
      where: { cohort_id: cohortId },
      include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
      orderBy: { joined_at: "desc" },
    });
  }

  // Bulk-add — only accepts students who are already active members of
  // THIS institution (never an arbitrary userId from the client), same
  // tenant-isolation principle as everywhere else in this module.
  async addCohortMembers(institutionId: string, cohortId: string, userIds: string[]) {
    const cohort = await this.prisma.cohort.findFirst({ where: { id: cohortId, institution_id: institutionId } });
    if (!cohort) throw new NotFoundException("Cohort not found");

    const validStudents = await this.prisma.institutionMembership.findMany({
      where: { institution_id: institutionId, user_id: { in: userIds }, role: InstitutionRole.student, status: "active" },
      select: { user_id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.user_id));
    const skipped = userIds.filter((id) => !validIds.has(id));

    for (const userId of validIds) {
      await this.prisma.cohortMembership.upsert({
        where: { cohort_id_user_id: { cohort_id: cohortId, user_id: userId } },
        create: { cohort_id: cohortId, user_id: userId },
        update: {},
      });
    }
    return { added: validIds.size, skipped: skipped.length };
  }

  async removeCohortMember(institutionId: string, cohortId: string, membershipId: string) {
    const membership = await this.prisma.cohortMembership.findFirst({ where: { id: membershipId, cohort_id: cohortId }, include: { cohort: true } });
    if (!membership || membership.cohort.institution_id !== institutionId) throw new NotFoundException("Membership not found");
    await this.prisma.cohortMembership.delete({ where: { id: membershipId } });
    return { removed: true };
  }

  // ── Public storefront (marketing-site) ──────────────────────────────────────
  // Anonymous, unauthenticated access — only ever exposes public-facing
  // profile fields (never domains, memberships, or private course data).

  async getPublicList() {
    const active = await this.prisma.institution.findMany({
      where: { status: "active" },
      select: {
        id: true, name: true, slug: true, code: true, logo_url: true, description: true,
        courses: { where: { visibility: "public", is_listed: true, status: "active" }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    });
    return active.map(({ courses, ...rest }) => ({ ...rest, public_course_count: courses.length }));
  }

  async getPublicBySlug(slug: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { slug, status: "active" },
      select: { id: true, name: true, slug: true, code: true, logo_url: true, description: true, website: true },
    });
    if (!institution) throw new NotFoundException("Institution not found");
    return institution;
  }

  // ── Professor's own view (professors app) ──────────────────────────────────

  // Institutions this professor can attribute a new private course to —
  // used by the course-creation form to decide whether to offer an
  // institution/private option at all.
  async getMyInstitutions(userId: string) {
    const memberships = await this.prisma.institutionMembership.findMany({
      where: { user_id: userId, status: "active", role: { in: [InstitutionRole.professor, InstitutionRole.admin, InstitutionRole.owner] } },
      include: { institution: { select: { id: true, name: true, code: true, logo_url: true } } },
    });
    return memberships.map((m) => ({ institution: m.institution, role: m.role }));
  }

  // Every active membership regardless of role — powers the student
  // portal's "My University" link (a student needs this just as much as a
  // professor/admin does, just for a different purpose: browsing that
  // institution's catalog rather than creating courses in it).
  async getMyMemberships(userId: string) {
    const memberships = await this.prisma.institutionMembership.findMany({
      where: { user_id: userId, status: "active" },
      include: { institution: { select: { id: true, name: true, code: true, logo_url: true } } },
    });
    return memberships.map((m) => ({ institution: m.institution, role: m.role }));
  }
}
