import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrepCoursesService } from "../prep-courses/prep-courses.service";

@Injectable()
export class ProfessorStudentsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
    private prepCourses: PrepCoursesService,
  ) {}

  private professorDisplayName(professor: { profile: { first_name: string; last_name: string } | null; email: string }) {
    const name = professor.profile ? `${professor.profile.first_name} ${professor.profile.last_name}`.trim() : "";
    return name || professor.email;
  }

  // ─── Roster ──────────────────────────────────────────────────────────────

  async listStudents(professorId: string, q?: string) {
    const where: any = { professor_id: professorId, status: "active" };
    if (q) {
      where.student = {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { profile: { first_name: { contains: q, mode: "insensitive" } } },
          { profile: { last_name: { contains: q, mode: "insensitive" } } },
        ],
      };
    }
    const rows = await this.prisma.professorStudent.findMany({
      where,
      include: {
        student: {
          select: {
            id: true, email: true, last_login_at: true,
            profile: { select: { first_name: true, last_name: true, country: true, phone: true } },
            invitations_received: { select: { status: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
    return rows.map((r) => ({
      id: r.student.id,
      email: r.student.email,
      first_name: r.student.profile?.first_name ?? "",
      last_name: r.student.profile?.last_name ?? "",
      country: r.student.profile?.country ?? null,
      phone: r.student.profile?.phone ?? null,
      last_login_at: r.student.last_login_at,
      joined_at: r.created_at,
      invitations_sent: r.student.invitations_received.length,
      invitations_accepted: r.student.invitations_received.filter((i) => i.status === "accepted").length,
    }));
  }

  async removeStudent(professorId: string, studentId: string) {
    const row = await this.prisma.professorStudent.findUnique({
      where: { professor_id_student_id: { professor_id: professorId, student_id: studentId } },
    });
    if (!row) throw new NotFoundException("Student not found in your roster");
    await this.prisma.professorStudent.update({ where: { id: row.id }, data: { status: "removed" } });
    return { message: "Student removed from your roster" };
  }

  // Shared by invite/bulkInvite/addExisting — looks up an existing account
  // by email first so the same person's account is reused across however
  // many professors add them (never creates a duplicate User).
  private async findOrCreateStudent(email: string, name?: string): Promise<{ user: { id: string; email: string; profile: { first_name: string } | null }; isNew: boolean }> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, profile: { select: { first_name: true } } },
    });
    if (existing) return { user: existing, isNew: false };

    const [first_name, ...rest] = (name ?? "").trim().split(/\s+/).filter(Boolean);
    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const created = await this.prisma.user.create({
      data: {
        email: normalized,
        password_hash: passwordHash,
        role: Role.student,
        email_verified: true,
        profile: { create: { first_name: first_name ?? "", last_name: rest.join(" ") } },
      },
      select: { id: true, email: true, profile: { select: { first_name: true } } },
    });
    return { user: created, isNew: true };
  }

  private async ensureRosterRow(professorId: string, studentId: string): Promise<"added" | "already_your_student"> {
    const existing = await this.prisma.professorStudent.findUnique({
      where: { professor_id_student_id: { professor_id: professorId, student_id: studentId } },
    });
    if (existing) {
      if (existing.status === "removed") {
        await this.prisma.professorStudent.update({ where: { id: existing.id }, data: { status: "active" } });
        return "added";
      }
      return "already_your_student";
    }
    await this.prisma.professorStudent.create({ data: { professor_id: professorId, student_id: studentId } });
    return "added";
  }

  async inviteStudent(professorId: string, dto: { email: string; name?: string }) {
    const professor = await this.prisma.user.findUniqueOrThrow({
      where: { id: professorId },
      select: { email: true, profile: { select: { first_name: true, last_name: true } } },
    });
    const professorName = this.professorDisplayName(professor);

    const { user, isNew } = await this.findOrCreateStudent(dto.email, dto.name);
    const rosterResult = await this.ensureRosterRow(professorId, user.id);

    if (isNew) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await this.prisma.passwordReset.create({
        data: { user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 60 * 60 * 1000) },
      });
      this.mail.sendStudentInvite({ to: user.email, firstName: user.profile?.first_name || "there", professorName, token }).catch(() => {});
      return { email: user.email, status: "invited" as const };
    }

    if (rosterResult === "added") {
      this.notifications.create(
        user.id,
        "system_announcement",
        "You've been added by a professor",
        `${professorName} added you to their PAII roster.`,
      ).catch(() => {});
    }
    return { email: user.email, status: rosterResult === "added" ? ("added_existing" as const) : ("already_your_student" as const) };
  }

  async bulkInviteStudents(professorId: string, emails: string[]) {
    const deduped = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
    const results: { email: string; status: string }[] = [];
    for (const email of deduped) {
      const result = await this.inviteStudent(professorId, { email });
      results.push(result);
    }
    return { results };
  }

  async addExistingStudent(professorId: string, email: string) {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalized }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException("No PAII account exists for this email yet — use Invite instead.");
    const result = await this.ensureRosterRow(professorId, user.id);
    return { email: user.email, status: result };
  }

  // ─── Course invitations (professor side) ────────────────────────────────

  async assertOwnStudents(professorId: string, studentIds: string[]) {
    const rows = await this.prisma.professorStudent.findMany({
      where: { professor_id: professorId, student_id: { in: studentIds }, status: "active" },
      select: { student_id: true },
    });
    const owned = new Set(rows.map((r) => r.student_id));
    const notOwned = studentIds.filter((id) => !owned.has(id));
    if (notOwned.length > 0) {
      throw new ForbiddenException(`These students are not in your roster: ${notOwned.join(", ")}`);
    }
  }

  // Allowed if the professor teaches the course (normal invitation), or —
  // failing that — if the course is in the public catalog (status: active,
  // is_listed: true, same gate prep-courses.service.ts findAll() uses),
  // in which case it's a recommendation rather than a teaching invitation.
  private async resolveInvitationMode(courseId: string, professorId: string, role: Role, course: { status: string; is_listed: boolean }): Promise<boolean> {
    try {
      await this.prepCourses.assertTeacherAccess(courseId, professorId, role);
      return false;
    } catch (err) {
      if (course.status === "active" && course.is_listed) return true;
      throw err;
    }
  }

  async createInvitations(professorId: string, courseId: string, studentIds: string[], role: Role) {
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId }, select: { title: true, price: true, status: true, is_listed: true } });
    const isRecommendation = await this.resolveInvitationMode(courseId, professorId, role, course);
    await this.assertOwnStudents(professorId, studentIds);

    const professor = await this.prisma.user.findUniqueOrThrow({
      where: { id: professorId },
      select: { email: true, profile: { select: { first_name: true, last_name: true } } },
    });
    const professorName = this.professorDisplayName(professor);
    const isPaid = Number(course.price) > 0;

    const students = await this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, email: true, profile: { select: { first_name: true } } },
    });

    const results: { student_id: string; email: string; status: string }[] = [];

    for (const student of students) {
      const existing = await this.prisma.courseInvitation.findFirst({
        where: { professor_id: professorId, student_id: student.id, course_id: courseId },
      });

      if (existing?.status === "accepted") {
        results.push({ student_id: student.id, email: student.email, status: "already_accepted" });
        continue;
      }
      if (existing?.status === "pending") {
        results.push({ student_id: student.id, email: student.email, status: "already_pending" });
        continue;
      }

      if (existing) {
        await this.prisma.courseInvitation.update({
          where: { id: existing.id },
          data: { status: "pending", invited_at: new Date(), responded_at: null, rejection_reason: null, is_recommendation: isRecommendation },
        });
      } else {
        await this.prisma.courseInvitation.create({
          data: { professor_id: professorId, student_id: student.id, course_id: courseId, is_recommendation: isRecommendation },
        });
      }

      this.notifications.create(
        student.id,
        "course_invitation_received",
        isRecommendation ? "Course recommendation" : "New course invitation",
        isRecommendation
          ? `${professorName} recommends "${course.title}" for you.`
          : `${professorName} invited you to join "${course.title}".`,
        { course_id: courseId },
      ).catch(() => {});
      this.mail.sendCourseInvitation({
        to: student.email,
        firstName: student.profile?.first_name || "there",
        professorName,
        courseTitle: course.title,
        isPaid,
        isRecommendation,
      }).catch(() => {});

      results.push({ student_id: student.id, email: student.email, status: "invited" });
    }

    return { results };
  }

  async getCourseInvitations(professorId: string, courseId: string, role: Role) {
    try {
      await this.prepCourses.assertTeacherAccess(courseId, professorId, role);
    } catch (err) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { status: true, is_listed: true } });
      if (!course || !(course.status === "active" && course.is_listed)) throw err;
    }
    const rows = await this.prisma.courseInvitation.findMany({
      where: { professor_id: professorId, course_id: courseId },
      include: {
        student: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
      },
      orderBy: { invited_at: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      email: r.student.email,
      name: r.student.profile ? `${r.student.profile.first_name} ${r.student.profile.last_name}`.trim() : r.student.email,
      status: r.status,
      payment_status: r.payment_status,
      invited_at: r.invited_at,
      responded_at: r.responded_at,
      rejection_reason: r.rejection_reason,
      is_recommendation: r.is_recommendation,
    }));
  }

  // ─── Certification recommendations ──────────────────────────────────────
  // No accept/reject/enrollment state here — certification enrollment always
  // requires the student to independently complete the admin-reviewed
  // Application flow, so a recommendation can't itself produce an
  // enrollment. This is purely an informational, idempotent notify.

  async createCertificationRecommendations(professorId: string, certificationId: string, studentIds: string[]) {
    const cert = await this.prisma.certification.findUniqueOrThrow({ where: { id: certificationId }, select: { title: true, slug: true, status: true } });
    if (cert.status !== "active") {
      throw new BadRequestException("This certification isn't available to recommend yet");
    }
    await this.assertOwnStudents(professorId, studentIds);

    const professor = await this.prisma.user.findUniqueOrThrow({
      where: { id: professorId },
      select: { email: true, profile: { select: { first_name: true, last_name: true } } },
    });
    const professorName = this.professorDisplayName(professor);

    const students = await this.prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, email: true, profile: { select: { first_name: true } } },
    });

    const results: { student_id: string; email: string; status: string }[] = [];

    for (const student of students) {
      await this.prisma.certificationRecommendation.upsert({
        where: { professor_id_student_id_certification_id: { professor_id: professorId, student_id: student.id, certification_id: certificationId } },
        create: { professor_id: professorId, student_id: student.id, certification_id: certificationId },
        update: { updated_at: new Date() },
      });

      this.notifications.create(
        student.id,
        "certification_recommendation_received",
        "Certification recommendation",
        `${professorName} recommends "${cert.title}" for you.`,
        { certification_id: certificationId },
      ).catch(() => {});
      this.mail.sendCertificationRecommendation({
        to: student.email,
        firstName: student.profile?.first_name || "there",
        professorName,
        certTitle: cert.title,
        certSlug: cert.slug,
      }).catch(() => {});

      results.push({ student_id: student.id, email: student.email, status: "recommended" });
    }

    return { results };
  }
}
