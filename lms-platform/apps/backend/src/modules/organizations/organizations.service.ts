import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { UsersService } from "../users/users.service";
import { PaymentsService } from "../payments/payments.service";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private users: UsersService,
    private payments: PaymentsService,
    private config: ConfigService,
  ) {}

  // ── Org admin: dashboard / employees ───────────────────────────────────────

  // A "seat" is a distinct employee with ANY org-scoped enrollment — whether
  // a Certification Enrollment or a Program ProgramEnrollment. Both draw
  // from the same shared org.seats_purchased pool (Programs don't get their
  // own separate seat count).
  private async getOrgMemberUserIds(organizationId: string): Promise<Set<string>> {
    const [certMembers, programMembers] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { organization_id: organizationId }, distinct: ["user_id"], select: { user_id: true } }),
      this.prisma.programEnrollment.findMany({ where: { organization_id: organizationId }, distinct: ["user_id"], select: { user_id: true } }),
    ]);
    return new Set([...certMembers.map((m) => m.user_id), ...programMembers.map((m) => m.user_id)]);
  }

  async getDashboard(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

    const memberIds = await this.getOrgMemberUserIds(organizationId);

    const [certStatusCounts, programStatusCounts] = await Promise.all([
      this.prisma.enrollment.groupBy({ by: ["status"], where: { organization_id: organizationId }, _count: true }),
      this.prisma.programEnrollment.groupBy({ by: ["status"], where: { organization_id: organizationId }, _count: true }),
    ]);
    const statusCounts = new Map<string, number>();
    for (const s of certStatusCounts) statusCounts.set(s.status, (statusCounts.get(s.status) ?? 0) + s._count);
    for (const s of programStatusCounts) statusCounts.set(s.status, (statusCounts.get(s.status) ?? 0) + s._count);

    return {
      name: org.name,
      seats_purchased: org.seats_purchased,
      seats_used: memberIds.size,
      seats_available: Math.max(0, org.seats_purchased - memberIds.size),
      status_counts: Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count })),
    };
  }

  async getBilling(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const memberIds = await this.getOrgMemberUserIds(organizationId);

    return {
      price_per_seat: org.price_per_seat,
      seats_purchased: org.seats_purchased,
      seats_used: memberIds.size,
      renewal_period_months: org.renewal_period_months,
      subscription_expires_at: org.subscription_expires_at,
      is_expired: !!org.subscription_expires_at && org.subscription_expires_at < new Date(),
    };
  }

  async checkoutSeats(userId: string, organizationId: string, seatCount: number) {
    return this.payments.createOrgSeatsCheckoutSession(userId, organizationId, seatCount);
  }

  async checkoutRenewal(userId: string, organizationId: string) {
    return this.payments.createOrgRenewalCheckoutSession(userId, organizationId);
  }

  // Lazily generated so pre-existing orgs don't need a backfill migration —
  // the first time an org admin opens the Invite Employees page, they get one.
  async getInviteLink(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const token = org.invite_token ?? await this.assignNewInviteToken(organizationId);
    return { token, url: this.inviteLinkUrl(token) };
  }

  async regenerateInviteLink(organizationId: string) {
    const token = await this.assignNewInviteToken(organizationId);
    return { token, url: this.inviteLinkUrl(token) };
  }

  private async assignNewInviteToken(organizationId: string): Promise<string> {
    const token = randomBytes(16).toString("hex");
    await this.prisma.organization.update({ where: { id: organizationId }, data: { invite_token: token } });
    return token;
  }

  private inviteLinkUrl(token: string): string {
    const orgPortalUrl = this.config.get<string>("ORG_PORTAL_URL", "http://localhost:3007");
    return `${orgPortalUrl.replace(/\/$/, "")}/join/${token}`;
  }

  // ── Public: self-service employee sign-up via invite link ─────────────────

  async getJoinInfo(token: string) {
    const org = await this.prisma.organization.findUnique({ where: { invite_token: token } });
    if (!org) throw new NotFoundException("This invite link is invalid or has been deactivated.");

    const members = await this.prisma.enrollment.findMany({
      where: { organization_id: org.id },
      distinct: ["user_id"],
      select: { user_id: true },
    });

    return {
      organization_name: org.name,
      is_expired: !!org.subscription_expires_at && org.subscription_expires_at < new Date(),
      seats_available: Math.max(0, org.seats_purchased - members.length),
    };
  }

  async joinViaLink(token: string, dto: { email: string; password: string; first_name: string; last_name: string; certification_ids: string[] }) {
    const org = await this.prisma.organization.findUnique({ where: { invite_token: token } });
    if (!org) throw new NotFoundException("This invite link is invalid or has been deactivated.");
    if (org.subscription_expires_at && org.subscription_expires_at < new Date()) {
      throw new BadRequestException("This organization's subscription has expired. Contact your org admin.");
    }

    const email = dto.email.toLowerCase().trim();
    const certificationIds = dto.certification_ids ?? [];
    if (certificationIds.length === 0) throw new BadRequestException("Select at least one certification");

    const certs = await this.prisma.certification.findMany({ where: { id: { in: certificationIds } } });
    if (certs.length !== certificationIds.length) throw new BadRequestException("One or more certifications not found");

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists. Sign in instead, or ask your org admin to add you.");
    }

    const members = await this.prisma.enrollment.findMany({
      where: { organization_id: org.id },
      distinct: ["user_id"],
      select: { user_id: true },
    });
    if (members.length >= org.seats_purchased) {
      throw new BadRequestException("This organization has no seats available. Contact your org admin.");
    }

    // Self-service signup via an unauthenticated link — unlike the admin-driven
    // bulk invite (where a trusted staff member typed the email), we can't
    // assume the caller owns this email address, so it goes through the same
    // verify-before-login gate as the public /register flow.
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const verifyToken = randomBytes(32).toString("hex");
    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: passwordHash,
        role: Role.student,
        email_verified: false,
        email_verify_token: verifyToken,
        email_verify_token_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
        last_organization_id: org.id,
        profile: { create: { first_name: dto.first_name, last_name: dto.last_name, display_name: `${dto.first_name} ${dto.last_name}` } },
      },
    });

    for (const certId of certificationIds) {
      await this.prisma.enrollment.create({
        data: { user_id: user.id, certification_id: certId, organization_id: org.id, status: "active" },
      });
    }

    const frontendUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3001");
    await this.mail.sendVerificationEmail(user.email, dto.first_name, verifyToken, frontendUrl);

    return { message: "Account created! Check your email to verify your address, then sign in." };
  }

  async getEmployees(organizationId: string) {
    const [certEnrollments, programEnrollments] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { organization_id: organizationId },
        include: {
          user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
          certification: { select: { id: true, title: true, acronym: true } },
        },
        orderBy: { enrolled_at: "desc" },
      }),
      this.prisma.programEnrollment.findMany({
        where: { organization_id: organizationId },
        include: {
          user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
          program: { select: { id: true, title: true } },
        },
        orderBy: { enrolled_at: "desc" },
      }),
    ]);
    return [
      ...certEnrollments.map((e) => ({ ...e, item_type: "certification" as const })),
      ...programEnrollments.map((e) => ({ ...e, item_type: "program" as const })),
    ].sort((a, b) => b.enrolled_at.getTime() - a.enrolled_at.getTime());
  }

  // Emails/certs/programs apply to the whole batch — a different combination
  // is a separate invite action (see plan: avoids a per-employee-per-item
  // matrix UI in v1). Re-inviting an existing org member into an additional
  // cert/program just adds the enrollment, doesn't consume a new seat.
  // Certifications and Programs draw from the SAME shared seats_purchased
  // pool (see getOrgMemberUserIds) — an org doesn't buy separate seat pools
  // per product type.
  async inviteEmployees(organizationId: string, dto: { emails: string[]; certification_ids?: string[]; program_ids?: string[] }) {
    const emails = [...new Set((dto.emails ?? []).map((e) => e.toLowerCase().trim()).filter(Boolean))];
    const certificationIds = dto.certification_ids ?? [];
    const programIds = dto.program_ids ?? [];
    if (emails.length === 0) throw new BadRequestException("At least one email is required");
    if (certificationIds.length === 0 && programIds.length === 0) {
      throw new BadRequestException("At least one certification or program is required");
    }

    const [certs, programs] = await Promise.all([
      certificationIds.length ? this.prisma.certification.findMany({ where: { id: { in: certificationIds } } }) : Promise.resolve([]),
      programIds.length ? this.prisma.program.findMany({ where: { id: { in: programIds } }, include: { courses: { select: { course_id: true } } } }) : Promise.resolve([]),
    ]);
    if (certs.length !== certificationIds.length) throw new BadRequestException("One or more certifications not found");
    if (programs.length !== programIds.length) throw new BadRequestException("One or more programs not found");

    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (org.subscription_expires_at && org.subscription_expires_at < new Date()) {
      throw new BadRequestException("Your organization's subscription has expired. Renew to invite more employees.");
    }
    const itemTitles = [...certs.map((c) => c.title), ...programs.map((p) => p.title)];

    // Collected inside the transaction, emailed after it commits — email
    // dispatch is a network call and shouldn't run inside a DB transaction.
    const pendingInvites: { userId: string; email: string; firstName: string; token: string }[] = [];
    const results: { email: string; status: "invited" | "enrolled" }[] = [];

    await this.prisma.$transaction(async (tx) => {
      const [alreadyCertMembers, alreadyProgramMembers] = await Promise.all([
        tx.enrollment.findMany({
          where: { organization_id: organizationId, user: { email: { in: emails } } },
          select: { user: { select: { email: true } } },
          distinct: ["user_id"],
        }),
        tx.programEnrollment.findMany({
          where: { organization_id: organizationId, user: { email: { in: emails } } },
          select: { user: { select: { email: true } } },
          distinct: ["user_id"],
        }),
      ]);
      const alreadyMemberEmails = new Set([...alreadyCertMembers, ...alreadyProgramMembers].map((m) => m.user.email));
      const [existingCertSeats, existingProgramSeats] = await Promise.all([
        tx.enrollment.findMany({ where: { organization_id: organizationId }, distinct: ["user_id"], select: { user_id: true } }),
        tx.programEnrollment.findMany({ where: { organization_id: organizationId }, distinct: ["user_id"], select: { user_id: true } }),
      ]);
      const existingSeatCount = new Set([...existingCertSeats.map((m) => m.user_id), ...existingProgramSeats.map((m) => m.user_id)]).size;
      const newSeatEmails = emails.filter((e) => !alreadyMemberEmails.has(e));

      if (existingSeatCount + newSeatEmails.length > org.seats_purchased) {
        throw new BadRequestException(
          `This invite needs ${newSeatEmails.length} new seat(s), which would exceed the organization's ${org.seats_purchased}-seat limit (${existingSeatCount} already used).`,
        );
      }

      const existingUsers = await tx.user.findMany({
        where: { email: { in: emails } },
        include: { profile: true },
      });
      const emailToUser = new Map(existingUsers.map((u) => [u.email, u]));

      for (const email of emails) {
        let user = emailToUser.get(email);
        let isNewUser = false;

        if (!user) {
          const tempPassword = randomBytes(16).toString("hex");
          const passwordHash = await bcrypt.hash(tempPassword, 12);
          user = await tx.user.create({
            data: {
              email,
              password_hash: passwordHash,
              role: Role.student,
              email_verified: true,
              last_organization_id: organizationId,
              profile: { create: { first_name: "", last_name: "" } },
            },
            include: { profile: true },
          });
          isNewUser = true;
        } else {
          await tx.user.update({ where: { id: user.id }, data: { last_organization_id: organizationId } });
        }

        for (const certId of certificationIds) {
          const existingEnrollment = await tx.enrollment.findUnique({
            where: { user_id_certification_id: { user_id: user.id, certification_id: certId } },
          });
          if (existingEnrollment) {
            await tx.enrollment.update({
              where: { id: existingEnrollment.id },
              data: {
                organization_id: organizationId,
                // Reactivate an enrollment left suspended by a prior org
                // removal — a completed one needs no reactivating, the
                // certificate already stands.
                ...(existingEnrollment.status === "suspended" ? { status: "active" } : {}),
              },
            });
          } else {
            await tx.enrollment.create({
              data: { user_id: user.id, certification_id: certId, organization_id: organizationId, status: "active" },
            });
          }
        }

        for (const program of programs) {
          const existingProgramEnrollment = await tx.programEnrollment.findUnique({
            where: { user_id_program_id: { user_id: user.id, program_id: program.id } },
          });
          if (existingProgramEnrollment) {
            await tx.programEnrollment.update({
              where: { id: existingProgramEnrollment.id },
              data: {
                organization_id: organizationId,
                ...(existingProgramEnrollment.status === "suspended" ? { status: "active" } : {}),
              },
            });
          } else {
            await tx.programEnrollment.create({
              data: { user_id: user.id, program_id: program.id, organization_id: organizationId, status: "active" },
            });
          }
          // Same ON CONFLICT DO NOTHING helper every course purchase goes
          // through — an employee who already owns a bundled course (bought
          // separately, or via another program) keeps their existing
          // enrollment/progress untouched.
          for (const pc of program.courses) {
            await tx.$executeRawUnsafe(
              `INSERT INTO lms.course_enrollments (id, user_id, course_id, progress_percentage, enrolled_at)
               VALUES (gen_random_uuid(), $1, $2, 0, now())
               ON CONFLICT (user_id, course_id) DO NOTHING`,
              user.id, pc.course_id,
            );
          }
        }

        results.push({ email, status: isNewUser ? "invited" : "enrolled" });

        if (isNewUser) {
          const token = randomBytes(32).toString("hex");
          const tokenHash = createHash("sha256").update(token).digest("hex");
          await tx.passwordReset.create({
            data: { user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 60 * 60 * 1000) },
          });
          pendingInvites.push({ userId: user.id, email: user.email, firstName: user.profile?.first_name || "there", token });
        }
      }
    });

    for (const invite of pendingInvites) {
      this.mail
        .sendEmployeeInvite({ to: invite.email, firstName: invite.firstName, orgName: org.name, certTitles: itemTitles, token: invite.token })
        .catch(() => {});
    }

    return { results };
  }

  async removeEmployee(organizationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, email_verified: true, profile: { select: { first_name: true, last_name: true } } },
    });
    if (!user) throw new NotFoundException("Employee not found in this organization");

    const [enrollments, programEnrollments] = await Promise.all([
      this.prisma.enrollment.findMany({ where: { organization_id: organizationId, user_id: userId } }),
      this.prisma.programEnrollment.findMany({ where: { organization_id: organizationId, user_id: userId } }),
    ]);
    if (enrollments.length === 0 && programEnrollments.length === 0) {
      throw new NotFoundException("Employee not found in this organization");
    }

    const fullName = `${user.profile?.first_name ?? ""} ${user.profile?.last_name ?? ""}`.trim() || null;
    const accountDeleted = !user.email_verified;
    await this.prisma.organizationRemovalLog.create({
      data: { organization_id: organizationId, email: user.email, full_name: fullName, account_deleted: accountDeleted },
    });

    // An account that never verified its email never actually became a real
    // person using the product — most likely a self-service join that was
    // added by mistake or never followed through on. Delete it outright
    // instead of leaving an orphaned, org-less student record behind.
    if (accountDeleted) {
      await this.prisma.user.delete({ where: { id: userId } });
      return { removed: true, account_deleted: true };
    }

    // An already-verified account is a real person who may have real
    // progress (or an already-issued certificate) tied to these enrollments
    // — hard-deleting them would cascade-wipe lesson progress/exam attempts,
    // and would outright fail on a completed enrollment (Certificate has no
    // cascade rule). Unenroll instead: drop the org link (frees the seat,
    // removes them from this org's employee list) and suspend anything not
    // already completed, so they can't keep progressing on PAII's dime once
    // the org has stopped paying for their seat — but nothing already done
    // or earned is destroyed. Re-inviting them later (inviteEmployees)
    // reactivates a suspended enrollment; a completed one is left alone.
    // Bundled CourseEnrollments granted by the program are deliberately
    // left untouched — same reasoning as everywhere else this session:
    // access already granted isn't clawed back, only forward progress
    // toward a *new* org-funded seat is gated.
    for (const e of enrollments) {
      await this.prisma.enrollment.update({
        where: { id: e.id },
        data: {
          organization_id: null,
          ...(e.status !== "completed" ? { status: "suspended" } : {}),
        },
      });
    }
    for (const pe of programEnrollments) {
      await this.prisma.programEnrollment.update({
        where: { id: pe.id },
        data: {
          organization_id: null,
          ...(pe.status !== "completed" ? { status: "suspended" } : {}),
        },
      });
    }
    return { removed: true, account_deleted: false };
  }

  // ── PAII staff (admin app): organization CRUD + provisioning ──────────────

  async adminList() {
    return this.prisma.organization.findMany({
      include: {
        admins: { include: { user: { select: { email: true } } } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async adminGetDetail(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        admins: {
          include: { user: { select: { id: true, email: true, last_login_at: true } } },
          orderBy: { created_at: "asc" },
        },
      },
    });
    if (!org) throw new NotFoundException("Organization not found");

    const enrollments = await this.prisma.enrollment.findMany({
      where: { organization_id: id },
      include: {
        user: { select: { id: true, email: true, is_active: true, profile: { select: { first_name: true, last_name: true } } } },
        certification: { select: { id: true, title: true, acronym: true } },
      },
      orderBy: { enrolled_at: "desc" },
    });

    const payments = await this.prisma.payment.findMany({
      where: { organization_id: id },
      orderBy: { created_at: "desc" },
    });

    const removalLogs = await this.prisma.organizationRemovalLog.findMany({
      where: { organization_id: id },
      orderBy: { removed_at: "desc" },
    });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const removedLast30Days = removalLogs.filter((r) => r.removed_at >= thirtyDaysAgo).length;

    return {
      organization: org,
      employees: enrollments,
      seats_used: new Set(enrollments.map((e) => e.user_id)).size,
      payments,
      removals: removalLogs,
      removed_last_30_days: removedLast30Days,
    };
  }

  async adminCreate(dto: { name: string; contact_email: string; seats_purchased?: number; notes?: string; price_per_seat?: number; renewal_period_months?: number }) {
    if (!dto.name?.trim()) throw new BadRequestException("Organization name is required");
    return this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        contact_email: dto.contact_email?.trim() ?? "",
        seats_purchased: dto.seats_purchased ?? 0,
        notes: dto.notes,
        price_per_seat: dto.price_per_seat ?? null,
        renewal_period_months: dto.renewal_period_months ?? 12,
      },
    });
  }

  async adminUpdate(id: string, dto: Partial<{ name: string; contact_email: string; seats_purchased: number; notes: string; price_per_seat: number | null; renewal_period_months: number; subscription_expires_at: string | null }>) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException("Organization not found");
    const { subscription_expires_at, ...rest } = dto;
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...rest,
        ...(subscription_expires_at !== undefined
          ? { subscription_expires_at: subscription_expires_at ? new Date(subscription_expires_at) : null }
          : {}),
      },
    });
  }

  async adminProvisionAdmin(organizationId: string, dto: { email: string; first_name: string; last_name: string }) {
    const normalized = dto.email.toLowerCase().trim();
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException("Organization not found");

    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      const existingOrgAdmin = await this.prisma.organizationAdmin.findUnique({ where: { user_id: existing.id } });
      if (existingOrgAdmin) throw new ConflictException("This user is already an org admin for an organization.");
      await this.prisma.organizationAdmin.create({ data: { user_id: existing.id, organization_id: organizationId } });
      // Only promote a plain student account — never downgrade an existing
      // admin/super_admin/professor/sales_rep by overwriting their role.
      if (existing.role === Role.student) {
        await this.prisma.user.update({ where: { id: existing.id }, data: { role: Role.org_admin } });
      }
      return { id: existing.id, email: existing.email, message: "This email already had a PAII account — granted org admin access directly. No email was sent since they already have a password." };
    }

    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = await this.prisma.user.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        role: Role.org_admin,
        email_verified: true,
        profile: {
          create: { first_name: dto.first_name, last_name: dto.last_name, display_name: `${dto.first_name} ${dto.last_name}` },
        },
        organization_admin: { create: { organization_id: organizationId } },
      },
    });

    await this.users.requirePasswordReset(user.id);

    return { id: user.id, email: user.email, message: "Org admin invited — password setup email sent." };
  }
}
