import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./strategies/jwt.strategy";

const BCRYPT_ROUNDS = 12;

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de",
  "live.com", "live.co.uk", "live.fr", "live.ca",
  "msn.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.fr", "yahoo.ca", "yahoo.com.au",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "aim.com",
  "protonmail.com", "proton.me",
  "mail.com", "inbox.com", "zoho.com",
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const emailDomain = dto.email.toLowerCase().split("@")[1] ?? "";
    const skipVerification = !FREE_EMAIL_DOMAINS.has(emailDomain);

    const emailVerifyToken = skipVerification ? null : randomBytes(32).toString("hex");
    const emailVerifyTokenExpiresAt = skipVerification ? null : new Date(Date.now() + 48 * 60 * 60 * 1000);

    const paiId = `PAII-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const isSalesRep = dto.role === "sales_rep";
    const isProfessor = dto.role === "professor";
    const referralCode = isSalesRep
      ? randomBytes(4).toString("hex").toUpperCase()
      : undefined;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password_hash: passwordHash,
        email_verified: skipVerification,
        email_verify_token: emailVerifyToken,
        email_verify_token_expires_at: emailVerifyTokenExpiresAt,
        role: isSalesRep ? ("sales_rep" as any) : isProfessor ? ("professor" as any) : undefined,
        // Professor applications need manual admin review before they can log
        // in and touch course content/grades — reuses the existing is_active
        // gate (login already blocks on it) rather than adding new state.
        is_active: isProfessor ? false : undefined,
        profile: {
          create: {
            first_name: dto.first_name,
            last_name: dto.last_name,
            display_name: `${dto.first_name} ${dto.last_name}`,
            pai_id: paiId,
            ...(dto.phone ? { phone: dto.phone } : {}),
            ...(dto.country ? { country: dto.country } : {}),
            ...(dto.date_of_birth ? { date_of_birth: new Date(dto.date_of_birth) } : {}),
          },
        },
        ...(isSalesRep
          ? {
              affiliate_profile: {
                create: {
                  referral_code: referralCode!,
                  status: "pending",
                },
              },
            }
          : {}),
      },
      include: { profile: true },
    });

    this.logger.log(`New user registered: ${user.email} (role: ${isSalesRep ? "sales_rep" : isProfessor ? "professor" : "student"}, verified: ${skipVerification})`);

    // Wire up affiliate lead immediately for any referred registration
    if (!isSalesRep && dto.referral_code) {
      const affiliateProfile = await this.prisma.affiliateProfile.findFirst({
        where: { referral_code: dto.referral_code },
      });
      if (affiliateProfile) {
        const name = `${dto.first_name} ${dto.last_name}`.trim();
        await this.prisma.affiliateLead.create({
          data: {
            affiliate_id: affiliateProfile.id,
            user_id: user.id,
            email: user.email,
            name: name || undefined,
            status: "registered" as any,
          },
        });
        await this.prisma.affiliateInvite.updateMany({
          where: { affiliate_id: affiliateProfile.id, email: user.email, status: "pending" as any },
          data: { status: "registered" as any },
        });
      }
    }

    if (!skipVerification) {
      const verifyBaseUrl = this.getBaseUrlForRole(isSalesRep ? "sales_rep" : isProfessor ? "professor" : "student");
      await this.mail.sendVerificationEmail(user.email, dto.first_name, emailVerifyToken!, verifyBaseUrl);
    }

    return {
      user: this.sanitizeUser(user),
      message: isSalesRep || isProfessor
        ? "Application submitted! Your account will be reviewed and approved by our team."
        : skipVerification
          ? "Account created successfully. You can now log in."
          : "Account created. Please verify your email to continue.",
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { profile: true, affiliate_profile: true },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.is_active) {
      // Distinguish "never approved yet" (professor application awaiting
      // review) from "was active, later disabled" using last_login_at as a
      // signal — a pending applicant has never logged in at all.
      if (user.role === ("professor" as any) && !user.last_login_at) {
        throw new UnauthorizedException("Your professor application is still under review. We'll email you once it's approved.");
      }
      throw new UnauthorizedException("Account has been deactivated");
    }

    if (!user.email_verified) {
      throw new UnauthorizedException("Please verify your email before logging in");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokenPair(user.id, user.email, user.role, ipAddress, userAgent, dto.device_info);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // Advance lead status from registered → logged_in on first login
    if (user.role === "student" as any || user.role === "professor" as any) {
      const ap = await this.prisma.affiliateProfile.findFirst({
        where: { leads: { some: { email: user.email, status: "registered" as any } } },
        select: { id: true },
      });
      if (ap) {
        await this.prisma.affiliateLead.updateMany({
          where: { affiliate_id: ap.id, email: user.email, status: "registered" as any },
          data: { status: "logged_in" as any },
        });
      }
    }

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>("jwt.refreshSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!stored || stored.is_revoked || stored.expires_at < new Date()) {
      // Potential token reuse — revoke all tokens for this user (security measure)
      if (stored && stored.is_revoked) {
        await this.prisma.refreshToken.updateMany({
          where: { user_id: payload.sub, is_revoked: false },
          data: { is_revoked: true },
        });
        throw new UnauthorizedException("Token reuse detected. Please log in again.");
      }
      throw new UnauthorizedException("Refresh token not found or expired");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, is_active: true },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException("Account not found or deactivated");
    }

    // Revoke old token and create new token pair atomically
    const newRefreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, jti: uuidv4() } as JwtPayload,
      { secret: this.config.get<string>("jwt.refreshSecret"), expiresIn: this.config.get("jwt.refreshExpiry", "7d") as any },
    );
    const newAccessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role } as JwtPayload,
      { secret: this.config.get<string>("jwt.accessSecret"), expiresIn: this.config.get("jwt.accessExpiry", "15m") as any },
    );
    const newTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({ where: { id: stored.id }, data: { is_revoked: true } }),
      this.prisma.refreshToken.create({
        data: { user_id: user.id, token_hash: newTokenHash, ip_address: ipAddress, device_info: userAgent, expires_at: expiresAt },
      }),
    ]);

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash, user_id: userId },
        data: { is_revoked: true },
      });
    } else {
      // Revoke all refresh tokens (logout from all devices)
      await this.prisma.refreshToken.updateMany({
        where: { user_id: userId, is_revoked: false },
        data: { is_revoked: true },
      });
    }
    return { message: "Logged out successfully" };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, affiliate_profile: true },
    });

    // Always return success to prevent user enumeration
    if (!user) return { message: "If that email is registered, you will receive a reset link." };

    const token = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: { user_id: user.id, token_hash: tokenHash, expires_at: expiresAt },
    });

    const resetBaseUrl = this.getBaseUrlForRole(user.role);

    await this.mail.sendPasswordResetEmail(user.email, user.profile?.first_name ?? "there", token, resetBaseUrl);

    return { message: "If that email is registered, you will receive a reset link." };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!reset || reset.used_at || reset.expires_at < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.user_id },
        data: { password_hash: passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used_at: new Date() },
      }),
      // Revoke all refresh tokens on password reset
      this.prisma.refreshToken.updateMany({
        where: { user_id: reset.user_id, is_revoked: false },
        data: { is_revoked: true },
      }),
    ]);

    return { message: "Password reset successfully. Please log in." };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { email_verify_token: token },
    });

    if (!user) throw new BadRequestException("Invalid verification token");
    if (user.email_verified) return { message: "Email already verified" };

    const expires = (user as any).email_verify_token_expires_at;
    if (expires && new Date(expires) < new Date()) {
      throw new BadRequestException("Verification link has expired. Please request a new one.");
    }

    // Read pending_referral_code via raw SQL (fallback for users who registered before immediate-lead fix)
    let pendingReferralCode: string | null = null;
    try {
      const [refRow] = await this.prisma.$queryRawUnsafe<{ pending_referral_code: string | null }[]>(
        `SELECT pending_referral_code FROM lms.users WHERE id = $1`,
        user.id,
      );
      pendingReferralCode = refRow?.pending_referral_code ?? null;
    } catch {
      // Column may not exist in older DB versions; safe to ignore
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.users SET email_verified = true, email_verify_token = NULL,
       email_verify_token_expires_at = NULL WHERE id = $1`,
      user.id,
    );

    // Fallback: create lead if not already created during registration
    if (pendingReferralCode) {
      const affiliateProfile = await this.prisma.affiliateProfile.findFirst({
        where: { referral_code: pendingReferralCode },
      });
      if (affiliateProfile) {
        const existing = await this.prisma.affiliateLead.findFirst({
          where: { affiliate_id: affiliateProfile.id, email: user.email },
        });
        if (!existing) {
          const userProfile = await this.prisma.profile.findUnique({ where: { user_id: user.id } });
          const name = userProfile
            ? `${userProfile.first_name ?? ""} ${userProfile.last_name ?? ""}`.trim()
            : undefined;
          await this.prisma.affiliateLead.create({
            data: {
              affiliate_id: affiliateProfile.id,
              user_id: user.id,
              email: user.email,
              name: name || undefined,
              status: "registered" as any,
            },
          });
          await this.prisma.affiliateInvite.updateMany({
            where: { affiliate_id: affiliateProfile.id, email: user.email, status: "pending" as any },
            data: { status: "registered" as any },
          });
        }
        // Clean up pending_referral_code
        try {
          await this.prisma.$executeRawUnsafe(
            `UPDATE lms.users SET pending_referral_code = NULL WHERE id = $1`,
            user.id,
          );
        } catch { /* ignore */ }
      }
    }

    return { message: "Email verified successfully" };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, affiliate_profile: true },
    });

    // Always return success to prevent user enumeration
    if (!user || user.email_verified) {
      return { message: "If that email is registered and unverified, a new email has been sent." };
    }

    const emailVerifyToken = randomBytes(32).toString("hex");
    const emailVerifyTokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { email_verify_token: emailVerifyToken, email_verify_token_expires_at: emailVerifyTokenExpiresAt } as any,
    });

    const verifyBaseUrl = this.getBaseUrlForRole(user.role);

    await this.mail.sendVerificationEmail(user.email, user.profile?.first_name ?? "there", emailVerifyToken, verifyBaseUrl);
    return { message: "If that email is registered and unverified, a new email has been sent." };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, affiliate_profile: true },
    });

    if (!user) throw new NotFoundException("User not found");
    const sanitized = this.sanitizeUser(user);

    if (user.role === "admin") {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT tabs FROM lms.admin_permissions WHERE user_id = $1`,
        userId,
      );
      return { ...sanitized, admin_tabs: rows[0]?.tabs ?? [] };
    }

    return sanitized;
  }

  async verifyExamLink(linkToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(linkToken, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
    } catch {
      throw new UnauthorizedException("Exam link is invalid or has expired");
    }
    if (payload.type !== "student_exam_link") throw new UnauthorizedException("Invalid link type");

    const booking = await (this.prisma as any).examBooking.findUnique({
      where: { id: payload.booking_id },
      include: {
        exam_session: true,
        enrollment: { include: { certification: true } },
        user: { include: { profile: true } },
      },
    });
    if (!booking || booking.status !== "confirmed") throw new NotFoundException("Booking not found or cancelled");

    const session = booking.exam_session;
    const now = new Date();
    const unlockAt = new Date(new Date(session.scheduled_at).getTime() - 5 * 60 * 1000);
    if (now < unlockAt) {
      const mins = Math.ceil((unlockAt.getTime() - now.getTime()) / 60000);
      throw new BadRequestException(`Exam link becomes active ${mins} minute(s) before the session starts`);
    }

    const enrollment = booking.enrollment;
    const cert = enrollment.certification;

    // Resume in-progress attempt if exists
    const existing = await this.prisma.examAttempt.findFirst({
      where: { enrollment_id: enrollment.id, status: "in_progress" },
    });
    if (existing) {
      const tokens = await this.generateTokenPair(booking.user.id, booking.user.email, booking.user.role);
      return { ...tokens, user: this.sanitizeUser(booking.user), attempt_id: existing.id };
    }

    // Create new attempt — use session's specific exam if set, else fall back to cert pool
    const examId: string | null = session.exam_id ?? null;
    const bankQuestions = await this.prisma.examBank.findMany({
      where: examId
        ? ({ exam_id: examId, is_active: true } as any)
        : { certification_id: cert.id, is_active: true },
      take: cert.exam_questions_count,
      orderBy: { created_at: "asc" },
    });
    if (bankQuestions.length < cert.exam_questions_count) {
      throw new BadRequestException("Exam bank is not ready. Please contact support.");
    }

    const shuffled = [...bankQuestions].sort(() => Math.random() - 0.5).map(q => ({
      id: q.id, question_text: q.question_text, options: q.options, topic_tag: q.topic_tag,
    }));

    const attemptCount = await this.prisma.examAttempt.count({ where: { enrollment_id: enrollment.id } });
    const attempt = await this.prisma.examAttempt.create({
      data: {
        user_id: booking.user.id,
        enrollment_id: enrollment.id,
        attempt_number: attemptCount + 1,
        status: "in_progress",
        total_questions: shuffled.length,
        passing_score: cert.passing_score,
        time_limit_seconds: session.duration_minutes * 60,
        answers: { questions: shuffled },
      },
    });

    const tokens = await this.generateTokenPair(booking.user.id, booking.user.email, booking.user.role);
    return { ...tokens, user: this.sanitizeUser(booking.user), attempt_id: attempt.id };
  }

  async generateExamToken(userId: string): Promise<{ exam_token: string }> {
    const payload = { sub: userId, type: "exam_otp" };
    const exam_token = this.jwtService.sign(payload, {
      secret: this.config.get<string>("jwt.accessSecret"),
      expiresIn: "5m" as any,
    });
    return { exam_token };
  }

  async exchangeExamToken(examToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(examToken, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired exam token");
    }
    if (payload.type !== "exam_otp") throw new UnauthorizedException("Invalid token type");

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: true },
    });
    if (!user || !user.is_active) throw new UnauthorizedException("User not found or deactivated");

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async generateStructuredExamPreviewLink(examId: string): Promise<{ preview_url: string }> {
    const exam = await this.prisma.structuredExam.findUnique({
      where: { id: examId },
      select: { id: true },
    });
    if (!exam) throw new NotFoundException("Structured exam not found");

    const token = this.jwtService.sign(
      { type: "admin_structured_exam_preview", exam_id: examId },
      { secret: this.config.get<string>("jwt.accessSecret"), expiresIn: "4h" as any },
    );

    const paiiexamsUrl = this.config.get("PAIIEXAMS_URL", "https://exams.paii.ca");
    return { preview_url: `${paiiexamsUrl}/preview?token=${token}` };
  }

  async verifyPreviewLink(previewToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(previewToken, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
    } catch {
      throw new UnauthorizedException("Preview link is invalid or has expired");
    }

    // Direct structured-exam preview (no session required)
    if (payload.type === "admin_structured_exam_preview") {
      const exam = await this.prisma.structuredExam.findUnique({
        where: { id: payload.exam_id },
        include: {
          certification: { select: { id: true, title: true, acronym: true, exam_questions_count: true, passing_score: true, exam_duration_minutes: true } },
          sections: {
            orderBy: { sort_order: "asc" },
            include: {
              questions: {
                orderBy: { sort_order: "asc" },
                include: { options: { orderBy: { sort_order: "asc" } } },
              },
              instruction_pages: { orderBy: { sort_order: "asc" } },
            },
          },
        },
      });
      if (!exam) throw new NotFoundException("Structured exam not found");

      const sectionData = exam.sections.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        time_limit_minutes: s.time_limit_minutes ?? null,
        questions: [...s.questions].sort(() => Math.random() - 0.5).map((q: any) => ({
          id: q.id, type: q.type, question_text: q.question_text, points: q.points, options: q.options, metadata: q.metadata,
        })),
      }));

      const instructions = exam.sections.flatMap((s: any) =>
        (s.instruction_pages ?? []).map((p: any) => ({ id: p.id, title: p.title ?? null, content: p.content, section_title: s.title }))
      );

      return {
        is_admin_preview: true,
        session: {
          id: `preview-${exam.id}`,
          title: `Preview: ${exam.title}`,
          scheduled_at: new Date().toISOString(),
          duration_minutes: exam.certification?.exam_duration_minutes ?? 90,
        },
        certification: exam.certification,
        sections: sectionData,
        questions: sectionData.flatMap((s) => s.questions),
        instructions,
      };
    }

    if (payload.type !== "admin_exam_preview") throw new UnauthorizedException("Invalid link type");

    const session = await (this.prisma as any).examSession.findUnique({
      where: { id: payload.session_id },
      include: {
        certification: { select: { id: true, title: true, acronym: true, exam_questions_count: true, passing_score: true, exam_duration_minutes: true } },
        structured_exam: {
          include: {
            sections: {
              orderBy: { sort_order: "asc" },
              include: {
                questions: {
                  orderBy: { sort_order: "asc" },
                  include: { options: { orderBy: { sort_order: "asc" } } },
                },
                instruction_pages: { orderBy: { sort_order: "asc" } },
              },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException("Session not found");

    const sections: any[] = session.structured_exam?.sections ?? [];

    // Build per-section data, shuffling questions within each section
    const sectionData = sections.map((s: any) => {
      const shuffledQs = [...s.questions]
        .sort(() => Math.random() - 0.5)
        .map((q: any) => ({
          id: q.id,
          type: q.type,
          question_text: q.question_text,
          points: q.points,
          options: q.options,
          metadata: q.metadata,
        }));
      return {
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        time_limit_minutes: s.time_limit_minutes ?? null,
        questions: shuffledQs,
      };
    });

    // Flat question list kept for backward compat
    const allQuestions = sectionData.flatMap((s) => s.questions);

    const instructions = sections.flatMap((s: any) =>
      (s.instruction_pages ?? []).map((p: any) => ({
        id: p.id,
        title: p.title ?? null,
        content: p.content,
        section_title: s.title,
      }))
    );

    return {
      is_admin_preview: false,
      session: {
        id: session.id,
        title: session.title,
        scheduled_at: session.scheduled_at,
        duration_minutes: session.duration_minutes,
      },
      certification: session.certification,
      sections: sectionData,
      questions: allQuestions,
      instructions,
    };
  }

  async saveStudentPhoto(previewToken: string, imageBase64: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(previewToken, {
        secret: this.config.get<string>("jwt.accessSecret"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const sessionId: string = payload.session_id ?? payload.sub ?? "unknown";
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const photosDir = path.join(process.cwd(), "students-photos");
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }

    const filename = `${sessionId}_${Date.now()}.jpg`;
    const filepath = path.join(photosDir, filename);
    fs.writeFileSync(filepath, buffer);

    this.logger.log(`Student photo saved: ${filename}`);
    return { saved: true, filename, path: filepath };
  }

  // Proctoring photos are biometric data with no business need to exist past the exam
  // window. STUDENT_PHOTO_RETENTION_DAYS defaults to 30 as a placeholder — confirm the
  // real retention period with legal/compliance (PIPEDA governs this for a Canada-based
  // institute) and set the env var accordingly.
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async purgeExpiredStudentPhotos() {
    const retentionDays = Number(this.config.get("STUDENT_PHOTO_RETENTION_DAYS", 30));
    const photosDir = path.join(process.cwd(), "students-photos");
    if (!fs.existsSync(photosDir)) return;

    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;
    for (const filename of fs.readdirSync(photosDir)) {
      const filepath = path.join(photosDir, filename);
      const stat = fs.statSync(filepath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filepath);
        deleted++;
      }
    }
    if (deleted > 0) {
      this.logger.log(`Purged ${deleted} student proctoring photo(s) older than ${retentionDays} days`);
    }
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: string,
  ) {
    const accessToken = this.jwtService.sign({ sub: userId, email, role } as JwtPayload, {
      secret: this.config.get<string>("jwt.accessSecret"),
      expiresIn: this.config.get("jwt.accessExpiry", "15m") as any,
    });

    // jti ensures concurrent token generations for the same user never collide
    // on the refresh_token table's unique token_hash constraint (same payload +
    // same-second iat would otherwise sign to the byte-identical JWT).
    const refreshToken = this.jwtService.sign({ sub: userId, email, role, jti: uuidv4() } as JwtPayload, {
      secret: this.config.get<string>("jwt.refreshSecret"),
      expiresIn: this.config.get("jwt.refreshExpiry", "7d") as any,
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        ip_address: ipAddress,
        device_info: deviceInfo || userAgent,
        expires_at: expiresAt,
      },
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private getBaseUrlForRole(role: string): string | undefined {
    switch (role) {
      case "sales_rep":   return this.config.get<string>("AFFILIATE_URL",  "https://sales.paii.ca");
      case "admin":
      case "super_admin": return this.config.get<string>("ADMIN_URL",      "https://admin.paii.ca");
      case "professor":   return this.config.get<string>("PROFESSOR_URL",  "https://professors.paii.ca");
      default:            return undefined; // students fall back to FRONTEND_URL in mail.service
    }
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private sanitizeUser(user: any) {
    const { password_hash, email_verify_token, affiliate_profile, ...safe } = user;

    // Flatten affiliate_profile fields for any user who has one (sales_rep or multi-role)
    if (affiliate_profile) {
      return {
        ...safe,
        first_name: user.profile?.first_name ?? null,
        last_name: user.profile?.last_name ?? null,
        phone: user.profile?.phone ?? null,
        avatar_url: user.profile?.avatar_url ?? null,
        status: affiliate_profile.status,
        referral_code: affiliate_profile.referral_code,
        commission_rate: Number(affiliate_profile.commission_rate),
        payout_method: affiliate_profile.payout_method ?? null,
        payout_details: affiliate_profile.payout_details ?? null,
      };
    }

    return safe;
  }
}
