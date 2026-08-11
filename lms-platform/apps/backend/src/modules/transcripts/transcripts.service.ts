import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ProgramsService } from "../programs/programs.service";
import { percentageToLetter, percentageToGpaPoints } from "./grading-scale";

type TranscriptRow = { id: string; transcript_number: string; user_id: string; program_id: string; program_enrollment_id: string; issued_at: Date };

@Injectable()
export class TranscriptsService {
  constructor(
    private prisma: PrismaService,
    private programsService: ProgramsService,
  ) {}

  private generateTranscriptNumber(): string {
    const year = new Date().getFullYear();
    const rand = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
    return `TR-${year}-${rand}`;
  }

  // No student-ID-number concept exists anywhere in the platform today (every
  // `student_id` field elsewhere is a plain FK, not a display identifier) —
  // rather than build a whole new ID-issuance subsystem for this one feature,
  // derive a stable, deterministic display value on read. Same input always
  // produces the same output, so it's consistent across every transcript view
  // without needing a new schema column.
  private studentDisplayId(user: { id: string; created_at: Date }): string {
    let hash = 0;
    for (const ch of user.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const digits = String(hash % 100000).padStart(5, "0");
    return `PAII-${user.created_at.getFullYear()}-${digits}`;
  }

  private computeAcademicStanding(enrollment: { status: string; completed_at: Date | null; access_expires_at: Date | null }): string {
    if (enrollment.status === "completed") return "Completed";
    if (enrollment.status === "suspended") return "Withdrawn";
    if (enrollment.access_expires_at && enrollment.access_expires_at < new Date() && !enrollment.completed_at) return "Not Completed";
    return "In Progress";
  }

  // ─── Identity ────────────────────────────────────────────────────────────

  async getOrCreateTranscript(userId: string, programId: string): Promise<TranscriptRow> {
    const enrollment = await this.prisma.programEnrollment.findUnique({
      where: { user_id_program_id: { user_id: userId, program_id: programId } },
    });
    if (!enrollment) throw new NotFoundException("You're not enrolled in this program");

    const existing = await this.prisma.transcript.findUnique({
      where: { user_id_program_id: { user_id: userId, program_id: programId } },
    });
    if (existing) return existing;

    return this.prisma.transcript.create({
      data: {
        transcript_number: this.generateTranscriptNumber(),
        user_id: userId,
        program_id: programId,
        program_enrollment_id: enrollment.id,
      },
    });
  }

  // `id` is only attached here — the private, owner-authenticated view — not
  // in the base payload, so the public share endpoint never leaks the raw
  // database id (it has no legitimate use for a stranger viewing a share
  // link; sharing/revoking always goes through the owner's own routes).
  async getMyTranscriptPayload(userId: string, programId: string) {
    const transcript = await this.getOrCreateTranscript(userId, programId);
    const payload = await this.buildTranscriptPayload(transcript);
    return { ...payload, id: transcript.id };
  }

  // ─── Live-computed payload ───────────────────────────────────────────────
  // Deliberately reads current CourseEnrollment/AssignmentSubmission/
  // ProgramEnrollment state every call — no grade data is duplicated onto the
  // Transcript row, so an admin's grade correction shows up immediately on
  // an already-issued (or already-shared) transcript with zero sync logic.
  private async buildTranscriptPayload(transcript: TranscriptRow) {
    const [dashboard, user, enrollment, program] = await Promise.all([
      this.programsService.getProgramDashboard(transcript.program_id, transcript.user_id),
      this.prisma.user.findUniqueOrThrow({ where: { id: transcript.user_id }, include: { profile: true } }),
      this.prisma.programEnrollment.findUniqueOrThrow({ where: { id: transcript.program_enrollment_id } }),
      this.prisma.program.findUniqueOrThrow({ where: { id: transcript.program_id }, select: { title: true, code: true } }),
    ]);

    const courseIds = dashboard.curriculum.map((c: any) => c.course.id);
    const submissions = courseIds.length
      ? await this.prisma.assignmentSubmission.findMany({
          // is_latest: true — each assignment can now have multiple historical
          // attempt rows; only the current attempt should count toward a
          // course's grade, or every past attempt would double-count.
          where: { user_id: transcript.user_id, grade: { not: null }, is_latest: true, lesson: { module: { course_id: { in: courseIds } } } },
          select: { grade: true, max_grade: true, lesson: { select: { module: { select: { course_id: true } } } } },
        })
      : [];
    const gradesByCourse = new Map<string, number[]>();
    for (const s of submissions) {
      const cid = s.lesson.module.course_id;
      if (!cid || s.grade == null) continue;
      const pct = (s.grade / s.max_grade) * 100;
      if (!gradesByCourse.has(cid)) gradesByCourse.set(cid, []);
      gradesByCourse.get(cid)!.push(pct);
    }
    const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
    const statusLabel = (state: string) => (state === "completed" ? "Completed" : state === "in_progress" ? "In Progress" : "Not Started");

    const rows = dashboard.curriculum.map((c: any) => {
      const grades = gradesByCourse.get(c.course.id);
      const gradePct = grades?.length ? Math.round(avg(grades) * 10) / 10 : null;
      const meta = (c.special_metadata && typeof c.special_metadata === "object") ? c.special_metadata : {};
      const passingScore = typeof meta.passing_score === "number" ? meta.passing_score : null;
      let passFail: string | null = null;
      if (c.special_type) {
        if (gradePct != null && passingScore != null) passFail = gradePct >= passingScore ? "Pass" : "Not Passed";
        else if (c.state === "completed") passFail = "Pass";
      }
      return {
        course_code: (c.course.slug as string).toUpperCase(),
        course_title: c.course.title as string,
        hours: Number(c.course.duration_hours) || 0,
        grade_percentage: gradePct,
        letter_grade: gradePct != null ? percentageToLetter(gradePct) : null,
        status: statusLabel(c.state),
        is_required: c.is_required as boolean,
        waived: c.waived as boolean,
        special_type: c.special_type as "capstone" | "internship" | null,
        pass_fail: passFail,
      };
    });

    const academicRecord = rows.filter((r) => !r.special_type);
    const capstone = rows.filter((r) => !!r.special_type);

    const completedCourses = academicRecord.filter((r) => r.status === "Completed");
    const hoursTotal = academicRecord.reduce((sum, r) => sum + r.hours, 0);
    const hoursCompleted = completedCourses.reduce((sum, r) => sum + r.hours, 0);
    const gradedRows = academicRecord.filter((r) => r.grade_percentage != null);
    const overallAverage = gradedRows.length ? Math.round(avg(gradedRows.map((r) => r.grade_percentage!)) * 10) / 10 : null;
    const gpaWeightTotal = gradedRows.reduce((sum, r) => sum + (r.hours || 1), 0);
    const gpa = gradedRows.length
      ? Math.round((gradedRows.reduce((sum, r) => sum + percentageToGpaPoints(r.grade_percentage!) * (r.hours || 1), 0) / gpaWeightTotal) * 100) / 100
      : null;

    const studentName = user.profile
      ? `${user.profile.first_name ?? ""} ${user.profile.last_name ?? ""}`.trim() || user.email
      : user.email;

    return {
      transcript_number: transcript.transcript_number,
      issued_at: transcript.issued_at,
      student: { name: studentName, student_id: this.studentDisplayId(user) },
      program: { title: program.title, code: program.code },
      enrollment: { status: enrollment.status, enrolled_at: enrollment.enrolled_at, completed_at: enrollment.completed_at },
      academic_record: academicRecord,
      capstone,
      summary: {
        courses_completed: completedCourses.length,
        courses_total: academicRecord.length,
        hours_completed: hoursCompleted,
        hours_total: hoursTotal,
        overall_average: overallAverage,
        gpa,
        program_status: enrollment.status === "completed" ? "Completed" : enrollment.status === "suspended" ? "Withdrawn" : "In Progress",
        completed_at: enrollment.completed_at,
      },
      academic_standing: this.computeAcademicStanding(enrollment),
    };
  }

  // ─── Shares ──────────────────────────────────────────────────────────────

  async listShares(transcriptId: string, userId: string) {
    const transcript = await this.prisma.transcript.findUnique({ where: { id: transcriptId } });
    if (!transcript) throw new NotFoundException("Transcript not found");
    if (transcript.user_id !== userId) throw new ForbiddenException("Not your transcript");
    return this.prisma.transcriptShare.findMany({ where: { transcript_id: transcriptId }, orderBy: { created_at: "desc" } });
  }

  async createShare(transcriptId: string, userId: string) {
    const transcript = await this.prisma.transcript.findUnique({ where: { id: transcriptId } });
    if (!transcript) throw new NotFoundException("Transcript not found");
    if (transcript.user_id !== userId) throw new ForbiddenException("Not your transcript");
    const token = randomBytes(24).toString("hex");
    return this.prisma.transcriptShare.create({ data: { transcript_id: transcriptId, token } });
  }

  async revokeShare(shareId: string, userId: string) {
    const share = await this.prisma.transcriptShare.findUnique({ where: { id: shareId }, include: { transcript: true } });
    if (!share) throw new NotFoundException("Share not found");
    if (share.transcript.user_id !== userId) throw new ForbiddenException("Not your transcript");
    return this.prisma.transcriptShare.update({
      where: { id: shareId },
      data: { status: "revoked", revoked_at: new Date() },
    });
  }

  // ─── Public (no auth — gated entirely by possession of the token) ────────

  async getBySharedToken(token: string) {
    const share = await this.prisma.transcriptShare.findUnique({ where: { token }, include: { transcript: true } });
    if (!share || share.status !== "active") throw new NotFoundException("Transcript not available");
    if (share.expires_at && share.expires_at < new Date()) throw new NotFoundException("Transcript not available");
    return this.buildTranscriptPayload(share.transcript);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────

  async adminList({ search, page = 1, limit = 20 }: { search?: string; page?: number; limit?: number }) {
    const where: Record<string, any> = search
      ? {
          OR: [
            { transcript_number: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { user: { profile: { first_name: { contains: search, mode: "insensitive" } } } },
            { user: { profile: { last_name: { contains: search, mode: "insensitive" } } } },
            { program: { title: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.transcript.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
          program: { select: { title: true } },
          program_enrollment: { select: { status: true, completed_at: true } },
          _count: { select: { shares: true } },
        },
      }),
      this.prisma.transcript.count({ where }),
    ]);
    return {
      data: items.map((t) => ({
        id: t.id,
        transcript_number: t.transcript_number,
        student_name: t.user.profile ? `${t.user.profile.first_name ?? ""} ${t.user.profile.last_name ?? ""}`.trim() || t.user.email : t.user.email,
        student_email: t.user.email,
        program_title: t.program.title,
        status: t.program_enrollment.status === "completed" ? "Completed" : t.program_enrollment.status === "suspended" ? "Withdrawn" : "In Progress",
        issued_at: t.issued_at,
        share_count: t._count.shares,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminGetOne(id: string) {
    const transcript = await this.prisma.transcript.findUnique({ where: { id } });
    if (!transcript) throw new NotFoundException("Transcript not found");
    const [payload, shares] = await Promise.all([
      this.buildTranscriptPayload(transcript),
      this.prisma.transcriptShare.findMany({ where: { transcript_id: id }, orderBy: { created_at: "desc" } }),
    ]);
    return { ...payload, id: transcript.id, shares };
  }

  async adminRevokeShare(shareId: string, reason?: string) {
    const share = await this.prisma.transcriptShare.findUnique({ where: { id: shareId } });
    if (!share) throw new NotFoundException("Share not found");
    return this.prisma.transcriptShare.update({
      where: { id: shareId },
      data: { status: "revoked", revoked_at: new Date(), revocation_reason: reason ?? null },
    });
  }
}
