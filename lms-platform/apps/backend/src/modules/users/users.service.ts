import { Injectable, NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { MailService } from "../mail/mail.service";
import { CertificatesService } from "../certificates/certificates.service";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private mail: MailService,
    private certificates: CertificatesService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, role: true, is_active: true,
        email_verified: true, last_login_at: true,
        created_at: true, updated_at: true,
        last_organization: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException("User not found");

    // Use raw SQL so new schema columns (nationality, addresses, etc.) are always returned
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.profiles WHERE "user_id" = $1`,
      id,
    );
    return { ...user, profile: rows[0] ?? null };
  }

  // Full cross-domain view of one student for the admin "Students" tab —
  // certification enrollments (+ certificate/renewal, exam attempts,
  // bookings, assignments), prep-course enrollments (+ assignments),
  // and payment history, all in one call.
  async adminGetStudentDetail(userId: string) {
    const base = await this.findById(userId);

    const [enrollments, courseEnrollments, payments] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { user_id: userId },
        include: {
          certification: {
            select: {
              id: true, acronym: true, title: true, level: true,
              validity_years: true, renewal_pdu_required: true,
              renewal_window_days: true, renewal_grace_period_days: true,
              renewal_fee: true,
            },
          },
          application: {
            select: { id: true, status: true, payment_status: true, amount_paid: true, paid_at: true, reviewed_at: true, rejection_reason: true },
          },
          organization: { select: { id: true, name: true } },
          certificate: true,
          exam_attempts: { orderBy: { started_at: "desc" }, take: 5 },
          exam_bookings: {
            include: { exam_session: { select: { id: true, title: true, scheduled_at: true } } },
            orderBy: { booked_at: "desc" },
          },
          assignment_submissions: {
            include: { lesson: { select: { title: true } } },
            orderBy: { submitted_at: "desc" },
          },
        },
        orderBy: { enrolled_at: "desc" },
      }),
      this.prisma.courseEnrollment.findMany({
        where: { user_id: userId },
        include: {
          course: { select: { id: true, title: true, slug: true, pdu_value: true, certification_id: true, status: true } },
          assignment_submissions: {
            include: { lesson: { select: { title: true } } },
            orderBy: { submitted_at: "desc" },
          },
        },
        orderBy: { enrolled_at: "desc" },
      }),
      this.prisma.payment.findMany({ where: { user_id: userId }, orderBy: { created_at: "desc" } }),
    ]);

    // Attach PDU-earned + eligibility to each issued certificate — same
    // computation CertificatesService.getRenewalProgress uses, scoped the
    // same way (only activity since the certificate was last renewed, or
    // issued if never renewed, counts).
    const enrollmentsWithRenewal = await Promise.all(
      enrollments.map(async (e) => {
        if (!e.certificate || !e.certification) return e;
        const sinceDate = e.certificate.renewed_at ?? e.certificate.issued_at;
        const pduEarned = await this.certificates.computePduEarned(userId, e.certification.id, sinceDate);
        const pduRequired = e.certification.renewal_pdu_required;
        const windowOpensAt = new Date(e.certificate.expires_at);
        windowOpensAt.setDate(windowOpensAt.getDate() - e.certification.renewal_window_days);
        const hardDeadline = new Date(e.certificate.expires_at);
        hardDeadline.setDate(hardDeadline.getDate() + e.certification.renewal_grace_period_days);
        const now = new Date();
        const eligible =
          pduRequired > 0 &&
          e.certificate.status !== "lapsed" && e.certificate.status !== "revoked" &&
          now >= windowOpensAt && now <= hardDeadline && pduEarned >= pduRequired;

        return {
          ...e,
          certificate: {
            ...e.certificate,
            pdu_earned: pduEarned,
            pdu_required: pduRequired,
            renewal_window_opens_at: windowOpensAt,
            renewal_hard_deadline: hardDeadline,
            renewal_eligible: eligible,
          },
        };
      }),
    );

    // Free required courses bundled into an active certification merge their
    // lessons directly into that certification's player instead of getting
    // their own CourseEnrollment row (see getMyAllCourses in
    // prep-courses.service.ts for the student-facing equivalent of this same
    // stitch) — without this, a student's bundled courses were invisible on
    // their admin profile even though they have real access to them.
    const bundledCourseEnrollments = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        'bundled-' || e.id || '-' || c.id AS id,
        c.id AS course_id, c.title, c.slug, c.pdu_value, c.status,
        cert.acronym AS cert_acronym,
        e.enrolled_at,
        (
          SELECT COUNT(*) FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          WHERE m.course_id = c.id AND l.is_published = true
        )::int AS total_lessons,
        (
          SELECT COUNT(*) FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          JOIN lms.lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id AND lp.completed = true
          WHERE m.course_id = c.id AND l.is_published = true
        )::int AS completed_lessons,
        (
          SELECT MAX(lp.completed_at) FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          JOIN lms.lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id AND lp.completed = true
          WHERE m.course_id = c.id AND l.is_published = true
        ) AS last_completed_at
      FROM lms.enrollments e
      JOIN lms.certifications cert ON cert.id = e.certification_id
      JOIN lms.course_cert_recommendations ccr
        ON ccr.certification_id = e.certification_id AND ccr.is_required = true AND ccr.is_free = true
      JOIN lms.courses c ON c.id = ccr.course_id
      WHERE e.user_id = $1 AND e.status = 'active' AND c.status = 'active'
      ORDER BY e.enrolled_at DESC
    `, userId);

    const directCourseIds = new Set(courseEnrollments.map((ce) => ce.course_id));
    const bundledMapped = bundledCourseEnrollments
      .filter((b) => !directCourseIds.has(b.course_id))
      .map((b) => {
        const total = b.total_lessons ?? 0;
        const completedCount = b.completed_lessons ?? 0;
        const progress_percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        return {
          id: b.id,
          enrolled_at: b.enrolled_at,
          completed_at: progress_percentage === 100 ? b.last_completed_at : null,
          progress_percentage,
          amount_paid: 0,
          source: "certification" as const,
          cert_acronym: b.cert_acronym,
          course: { id: b.course_id, title: b.title, slug: b.slug, pdu_value: b.pdu_value, status: b.status },
          assignment_submissions: [],
        };
      });

    return {
      ...base,
      enrollments: enrollmentsWithRenewal,
      course_enrollments: [...courseEnrollments, ...bundledMapped],
      payments,
    };
  }

  async findAll({ page = 1, limit = 25, q, role, status }: {
    page: number; limit: number; q?: string; role?: string; status?: string;
  }) {
    const skip = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let p = 1;

    if (q) {
      conditions.push(`(u.email ILIKE $${p} OR p.first_name ILIKE $${p} OR p.last_name ILIKE $${p} OR p.pai_id ILIKE $${p})`);
      params.push(`%${q}%`);
      p++;
    }
    if (role) {
      conditions.push(`u.role::text = $${p}`);
      params.push(role);
      p++;
    }
    if (status === "active")   { conditions.push(`u.is_active = true`); }
    if (status === "inactive") { conditions.push(`u.is_active = false`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT u.id, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.created_at,
               u.can_view_exam_answers,
               p.first_name, p.last_name, p.avatar_url, p.phone, p.country, p.date_of_birth, p.pai_id,
               p.industry, p.job_title, p.company, p.university, p.degree_program,
               p.addresses, p.education_entries, p.experience_entries,
               EXISTS (SELECT 1 FROM lms.affiliate_profiles ap WHERE ap.user_id = u.id) AS has_affiliate,
               oa.organization_id AS organization_admin_org_id,
               (SELECT o.name FROM lms.enrollments e2
                JOIN lms.organizations o ON o.id = e2.organization_id
                WHERE e2.user_id = u.id AND e2.organization_id IS NOT NULL
                ORDER BY e2.enrolled_at DESC LIMIT 1) AS enrolled_via_organization,
               lo.id AS previously_organization_id,
               lo.name AS previously_organization_name
        FROM lms.users u
        LEFT JOIN lms.profiles p ON p.user_id = u.id
        LEFT JOIN lms.organization_admins oa ON oa.user_id = u.id
        LEFT JOIN lms.organizations lo ON lo.id = u.last_organization_id
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $${p} OFFSET $${p + 1}
      `, ...params, limit, skip),
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int AS count
        FROM lms.users u
        LEFT JOIN lms.profiles p ON p.user_id = u.id
        ${where}
      `, ...params),
    ]);

    const total = countRows[0]?.count ?? 0;
    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    try {
      await this.prisma.user.delete({ where: { id: userId } });
      return { deleted: true };
    } catch (err: any) {
      if (err.code === "P2003" || err.code === "P2014") {
        throw new BadRequestException(
          "Cannot delete a user with enrollments or certificates. Disable their access instead.",
        );
      }
      throw err;
    }
  }

  async requirePasswordReset(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt },
    });

    await this.mail.sendPasswordResetEmail(
      user.email,
      user.profile?.first_name ?? "there",
      token,
    );
    return { message: "Password reset email sent" };
  }

  async exportCsv({ q, role, status }: { q?: string; role?: string; status?: string }) {
    const { data } = await this.findAll({ page: 1, limit: 10000, q, role, status });
    const headers = [
      "PAII ID", "ID", "Email", "First Name", "Last Name", "Role", "Status",
      "Phone", "Country", "City", "Full Address", "Date of Birth",
      "Occupation", "Job Title", "Work History", "Education",
      "Email Verified", "Registered", "Last Login",
    ];
    const rows = (data as any[]).map((u) => {
      const addresses = Array.isArray(u.addresses) ? u.addresses : [];
      const educationEntries = Array.isArray(u.education_entries) ? u.education_entries : [];
      const experienceEntries = Array.isArray(u.experience_entries) ? u.experience_entries : [];
      const primaryAddress = addresses[0];
      const city = primaryAddress?.city ?? "";
      const fullAddress = primaryAddress
        ? [primaryAddress.line1, primaryAddress.line2, primaryAddress.city, primaryAddress.state, primaryAddress.zip, primaryAddress.country]
            .filter(Boolean).join(", ")
        : "";
      const education = u.university || educationEntries[0]?.institution
        ? [u.university || educationEntries[0]?.institution, u.degree_program || educationEntries[0]?.degree].filter(Boolean).join(" — ")
        : "";
      const workHistory = experienceEntries.length > 0
        ? experienceEntries.map((e: any) => [e.title, e.company].filter(Boolean).join(" @ ")).join("; ")
        : [u.job_title, u.company].filter(Boolean).join(" @ ");
      return [
        u.pai_id ?? "",
        u.id,
        u.email,
        u.first_name ?? "",
        u.last_name ?? "",
        u.role,
        u.is_active ? "Active" : "Inactive",
        u.phone ?? "",
        u.country ?? "",
        city,
        fullAddress,
        u.date_of_birth ? new Date(u.date_of_birth).toISOString().split("T")[0] : "",
        u.industry ?? "",
        u.job_title ?? "",
        workHistory,
        education,
        u.email_verified ? "Yes" : "No",
        new Date(u.created_at).toISOString().split("T")[0],
        u.last_login_at ? new Date(u.last_login_at).toISOString().split("T")[0] : "",
      ];
    });
    return [headers, ...rows]
      .map((row) => row.map((cell: any) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
  }

  async updateProfile(userId: string, dto: Record<string, any>) {
    // Use raw SQL so new JSON/nullable columns work even before `prisma generate` reruns
    const colTypes: Record<string, 'text' | 'int' | 'date' | 'bool' | 'json'> = {
      first_name: 'text', last_name: 'text', display_name: 'text',
      avatar_url: 'text', bio: 'text', phone: 'text',
      date_of_birth: 'date', gender: 'text', country: 'text',
      timezone: 'text', language: 'text',
      career_status: 'text',
      job_title: 'text', company: 'text', industry: 'text',
      years_experience: 'int', linkedin_url: 'text',
      university: 'text', degree_program: 'text', graduation_year: 'int',
      nationality: 'text',
      education_entries: 'json', experience_entries: 'json', addresses: 'json',
      resume_url: 'text',
      email_notifications: 'bool', marketing_emails: 'bool',
    };

    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;

    for (const [col, type] of Object.entries(colTypes)) {
      if (!(col in dto)) continue;
      const raw = dto[col];
      if (type === 'json') {
        sets.push(`"${col}" = $${p}::jsonb`);
        vals.push(JSON.stringify(raw));
      } else if (type === 'int') {
        sets.push(`"${col}" = $${p}::int`);
        vals.push(raw !== null && raw !== '' ? parseInt(raw, 10) : null);
      } else if (type === 'date') {
        sets.push(`"${col}" = $${p}::timestamptz`);
        vals.push(raw ? new Date(raw).toISOString() : null);
      } else if (type === 'bool') {
        sets.push(`"${col}" = $${p}::boolean`);
        vals.push(Boolean(raw));
      } else if (col === 'career_status') {
        // Enum needs explicit cast from text parameter
        sets.push(raw ? `"${col}" = $${p}::lms."CareerStatus"` : `"${col}" = $${p}`);
        vals.push(raw ?? null);
      } else {
        sets.push(`"${col}" = $${p}`);
        vals.push(raw ?? null);
      }
      p++;
    }

    if (sets.length === 0) {
      return this.prisma.profile.findUnique({ where: { user_id: userId } });
    }

    sets.push(`"updated_at" = $${p++}::timestamptz`);
    vals.push(new Date().toISOString());
    vals.push(userId);

    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.profiles SET ${sets.join(', ')} WHERE "user_id" = $${p}`,
      ...vals,
    );

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.profiles WHERE "user_id" = $1`,
      userId,
    );
    return rows[0] ?? null;
  }

  async requestEmailChange(userId: string, newEmail: string) {
    const normalized = newEmail.toLowerCase().trim();

    const conflict = await this.prisma.user.findFirst({
      where: { email: normalized, NOT: { id: userId } },
    });
    if (conflict) throw new BadRequestException("That email address is already in use");

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.users SET "pending_email" = $1, "email_change_token_hash" = $2, "email_change_expires_at" = $3 WHERE "id" = $4`,
      normalized, tokenHash, expiresAt.toISOString(), userId,
    );

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT p.first_name FROM lms.profiles p WHERE p.user_id = $1`, userId,
    );
    const firstName = rows[0]?.first_name ?? "there";

    const frontendUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3001");
    // /api/users/* is proxied by Next.js rewrites to the backend
    const verifyUrl = `${frontendUrl}/api/users/email-change/verify?token=${token}`;

    await this.email.sendEmailChangeVerification(normalized, verifyUrl, firstName);
    return { message: `Verification email sent to ${normalized}` };
  }

  async verifyEmailChange(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, pending_email, email_change_expires_at FROM lms.users WHERE email_change_token_hash = $1`,
      tokenHash,
    );

    if (!rows.length) throw new BadRequestException("Invalid or expired verification link");

    const user = rows[0];
    if (!user.pending_email) throw new BadRequestException("No pending email change found");
    if (new Date(user.email_change_expires_at) < new Date()) {
      throw new BadRequestException("Verification link has expired. Please request a new one.");
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.users SET "email" = $1, "pending_email" = NULL, "email_change_token_hash" = NULL, "email_change_expires_at" = NULL WHERE "id" = $2`,
      user.pending_email, user.id,
    );

    return { message: "Email address updated successfully", email: user.pending_email };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedException("Current password is incorrect");
    if (newPassword.length < 8) throw new BadRequestException("Password must be at least 8 characters");
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password_hash: hash } });
    return { message: "Password changed successfully" };
  }

  async changeRole(userId: string, role: Role, affiliateAccess?: boolean, canViewExamAnswers?: boolean, organizationId?: string) {
    // Fetched before the update so we can tell a genuine grant (wasn't
    // professor, now is) from an admin re-saving other fields on someone
    // who already holds the role — the latter must not re-send the email.
    const before = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, profile: { select: { first_name: true } } },
    });
    if (!before) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role,
        // Only touch this field when the caller explicitly set it — leaving
        // it undefined must not silently revoke an existing grant on every
        // unrelated role edit.
        ...(canViewExamAnswers !== undefined ? { can_view_exam_answers: canViewExamAnswers } : {}),
      },
      select: { id: true, email: true, role: true, can_view_exam_answers: true },
    });

    if (role === Role.professor && before.role !== Role.professor) {
      this.mail.sendProfessorGranted({ to: updated.email, firstName: before.profile?.first_name ?? "there" }).catch(() => {});
    }

    const wantsAffiliate = affiliateAccess ?? (role === ("sales_rep" as Role));
    if (wantsAffiliate) {
      const existing = await this.prisma.affiliateProfile.findUnique({ where: { user_id: userId } });
      if (!existing) {
        await this.prisma.affiliateProfile.create({
          data: {
            user_id: userId,
            referral_code: randomBytes(4).toString("hex").toUpperCase(),
            status: "pending" as any,
          },
        });
      }
    }

    // Attaches org-admin capability for a specific organization to whatever
    // primary role this user already has — mirrors the affiliate flow above,
    // which grants sales_rep/affiliate access without forcing a role change.
    // Never revokes here (matches affiliate's grant-only behavior in this
    // shared modal); removal happens explicitly elsewhere.
    if (organizationId) {
      const existingOrgAdmin = await this.prisma.organizationAdmin.findUnique({ where: { user_id: userId } });
      if (!existingOrgAdmin) {
        await this.prisma.organizationAdmin.create({ data: { user_id: userId, organization_id: organizationId } });
      } else if (existingOrgAdmin.organization_id !== organizationId) {
        await this.prisma.organizationAdmin.update({ where: { user_id: userId }, data: { organization_id: organizationId } });
      }
    }

    return updated;
  }

  async setActive(userId: string, is_active: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { is_active },
      select: { id: true, email: true, is_active: true },
    });
  }

  async bulkSetActive(ids: string[], is_active: boolean) {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { is_active },
    });
    return { updated: result.count };
  }

  async bulkChangeRole(ids: string[], role: Role, affiliateAccess?: boolean) {
    // Same before/after check as changeRole, batched — only the users who
    // weren't already professors get the email.
    const newlyProfessor = role === Role.professor
      ? await this.prisma.user.findMany({
          where: { id: { in: ids }, role: { not: Role.professor } },
          select: { email: true, profile: { select: { first_name: true } } },
        })
      : [];

    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role },
    });

    for (const u of newlyProfessor) {
      this.mail.sendProfessorGranted({ to: u.email, firstName: u.profile?.first_name ?? "there" }).catch(() => {});
    }

    if (affiliateAccess) {
      const existing = await this.prisma.affiliateProfile.findMany({
        where: { user_id: { in: ids } },
        select: { user_id: true },
      });
      const existingIds = new Set(existing.map((a) => a.user_id));
      const toCreate = ids.filter((id) => !existingIds.has(id));
      if (toCreate.length > 0) {
        await this.prisma.affiliateProfile.createMany({
          data: toCreate.map((user_id) => ({
            user_id,
            referral_code: randomBytes(4).toString("hex").toUpperCase(),
            status: "pending" as any,
          })),
        });
      }
    }

    return { updated: result.count };
  }

  async bulkRequirePasswordReset(ids: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      include: { profile: { select: { first_name: true } } },
    });

    const resets = users.map((user) => {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      return { user, token, tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) };
    });

    await this.prisma.passwordReset.createMany({
      data: resets.map(({ user, tokenHash, expiresAt }) => ({
        user_id: user.id, token_hash: tokenHash, expires_at: expiresAt,
      })),
    });

    for (const { user, token } of resets) {
      this.mail.sendPasswordResetEmail(user.email, user.profile?.first_name ?? "there", token).catch(() => {});
    }

    return { sent: resets.length };
  }

  async bulkDelete(ids: string[]) {
    try {
      const result = await this.prisma.user.deleteMany({ where: { id: { in: ids } } });
      return { deleted: result.count };
    } catch (err: any) {
      if (err.code === "P2003" || err.code === "P2014") {
        throw new BadRequestException(
          "One or more selected users have enrollments or certificates and cannot be deleted.",
        );
      }
      throw err;
    }
  }

  // ── Admin Permissions ────────────────────────────────────────────────────────

  async getAdminPermissions(userId: string) {
    const row = await this.prisma.adminPermission.findUnique({ where: { user_id: userId } });
    return { tabs: row?.tabs ?? [] };
  }

  async setAdminPermissions(userId: string, tabs: string[]) {
    await this.prisma.adminPermission.upsert({
      where: { user_id: userId },
      create: { user_id: userId, tabs },
      update: { tabs },
    });
    return { tabs };
  }

  async inviteAdmin(dto: { email: string; first_name: string; last_name: string; tabs: string[] }) {
    const { email, first_name, last_name, tabs } = dto;
    const normalized = email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      throw new ConflictException(
        "A user with this email already exists. Change their role to Admin instead.",
      );
    }

    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const paiId = `PAII-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        role: Role.admin,
        email_verified: true,
        profile: {
          create: { first_name, last_name, display_name: `${first_name} ${last_name}`, pai_id: paiId },
        },
      },
    });

    if (tabs.length > 0) {
      await this.setAdminPermissions(user.id, tabs);
    }

    await this.requirePasswordReset(user.id);

    return { id: user.id, email: user.email, message: "Admin invited — password setup email sent." };
  }
}
