import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../email/email.service";

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
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

  async findAll({ page = 1, limit = 20, q }: { page: number; limit: number; q?: string }) {
    const skip = (page - 1) * limit;
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { profile: { first_name: { contains: q, mode: "insensitive" as const } } },
            { profile: { last_name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { profile: { select: { first_name: true, last_name: true, avatar_url: true } } },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(({ password_hash, email_verify_token, ...u }) => u),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
}
