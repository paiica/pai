import { Injectable, NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, role: true, is_active: true,
        email_verified: true, last_login_at: true,
        created_at: true, updated_at: true,
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
               p.first_name, p.last_name, p.avatar_url, p.phone, p.country, p.date_of_birth, p.pai_id
        FROM lms.users u
        LEFT JOIN lms.profiles p ON p.user_id = u.id
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
      "PAI ID", "ID", "Email", "First Name", "Last Name", "Role", "Status",
      "Phone", "Country", "Date of Birth", "Email Verified", "Registered", "Last Login",
    ];
    const rows = (data as any[]).map((u) => [
      u.pai_id ?? "",
      u.id,
      u.email,
      u.first_name ?? "",
      u.last_name ?? "",
      u.role,
      u.is_active ? "Active" : "Inactive",
      u.phone ?? "",
      u.country ?? "",
      u.date_of_birth ? new Date(u.date_of_birth).toISOString().split("T")[0] : "",
      u.email_verified ? "Yes" : "No",
      new Date(u.created_at).toISOString().split("T")[0],
      u.last_login_at ? new Date(u.last_login_at).toISOString().split("T")[0] : "",
    ]);
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

  async changeRole(userId: string, role: Role) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
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

  async bulkChangeRole(ids: string[], role: Role) {
    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { role },
    });
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
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT tabs FROM lms.admin_permissions WHERE user_id = $1`,
      userId,
    );
    return { tabs: rows[0]?.tabs ?? [] };
  }

  async setAdminPermissions(userId: string, tabs: string[]) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO lms.admin_permissions (user_id, tabs)
       VALUES ($1, $2::text[])
       ON CONFLICT (user_id) DO UPDATE SET tabs = $2::text[], updated_at = NOW()`,
      userId,
      tabs,
    );
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
    const paiId = `PAI-${Math.floor(10000000 + Math.random() * 90000000)}`;

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
