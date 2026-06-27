import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type AssignmentSection = {
  id: string;
  title: string;
  description: string;
  points: number;
  sort_order: number;
};

export type SectionResponse = {
  section_id: string;
  text_content: string;
  grade?: number | null;
  feedback?: string | null;
};

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminList(certId?: string) {
    const where: any = certId ? { certification_id: certId } : {};
    return this.prisma.assignment.findMany({
      where,
      include: {
        certification: { select: { id: true, acronym: true, title: true } },
        _count: { select: { entries: true } },
      },
      orderBy: [{ certification_id: "asc" }, { sort_order: "asc" }, { created_at: "desc" }],
    });
  }

  async adminGetOne(id: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        certification: { select: { id: true, acronym: true, title: true } },
        _count: { select: { entries: true } },
      },
    });
    if (!a) throw new NotFoundException("Assignment not found");
    return a;
  }

  async adminCreate(dto: {
    certification_id: string;
    title: string;
    type?: string;
    description?: string;
    instructions?: string;
    sections?: AssignmentSection[];
    due_date?: string;
    max_score?: number;
    status?: string;
    sort_order?: number;
  }) {
    if (!dto.certification_id || !dto.title?.trim()) {
      throw new BadRequestException("certification_id and title are required");
    }
    const cert = await this.prisma.certification.findUnique({ where: { id: dto.certification_id } });
    if (!cert) throw new NotFoundException("Certification not found");

    const sections: AssignmentSection[] = dto.sections ?? [];
    const maxScore = sections.length > 0 ? sections.reduce((s, sec) => s + sec.points, 0) : (dto.max_score ?? 100);

    return this.prisma.assignment.create({
      data: {
        certification_id: dto.certification_id,
        title: dto.title.trim(),
        type: dto.type ?? "assignment",
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        sections: sections as any,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        max_score: maxScore,
        status: dto.status ?? "draft",
        sort_order: dto.sort_order ?? 0,
      },
      include: {
        certification: { select: { id: true, acronym: true, title: true } },
      },
    });
  }

  async adminUpdate(id: string, dto: Partial<{
    title: string;
    type: string;
    description: string | null;
    instructions: string | null;
    sections: AssignmentSection[];
    due_date: string | null;
    max_score: number;
    grades_released: boolean;
    status: string;
    sort_order: number;
    certification_id: string;
  }>) {
    await this.findOneOrFail(id);
    const data: any = {};

    if (dto.title !== undefined)             data.title             = dto.title.trim();
    if (dto.type !== undefined)              data.type              = dto.type;
    if (dto.description !== undefined)       data.description       = dto.description?.trim() || null;
    if (dto.instructions !== undefined)      data.instructions      = dto.instructions?.trim() || null;
    if (dto.due_date !== undefined)          data.due_date          = dto.due_date ? new Date(dto.due_date) : null;
    if (dto.grades_released !== undefined)   data.grades_released   = dto.grades_released;
    if (dto.status !== undefined)            data.status            = dto.status;
    if (dto.sort_order !== undefined)        data.sort_order        = dto.sort_order;
    if (dto.certification_id !== undefined)  data.certification_id  = dto.certification_id;

    if (dto.sections !== undefined) {
      data.sections = dto.sections as any;
      // Recompute max_score from sections
      data.max_score = dto.sections.length > 0
        ? dto.sections.reduce((s, sec) => s + sec.points, 0)
        : (dto.max_score ?? 100);
    } else if (dto.max_score !== undefined) {
      data.max_score = dto.max_score;
    }

    return this.prisma.assignment.update({
      where: { id },
      data,
      include: { certification: { select: { id: true, acronym: true, title: true } } },
    });
  }

  async adminDelete(id: string) {
    await this.findOneOrFail(id);
    await this.prisma.assignment.delete({ where: { id } });
    return { message: "Assignment deleted" };
  }

  async adminReleaseGrades(id: string) {
    await this.findOneOrFail(id);
    await this.prisma.assignment.update({ where: { id }, data: { grades_released: true } });
    return { message: "Grades released to students" };
  }

  async adminGetEntries(assignmentId: string) {
    await this.findOneOrFail(assignmentId);
    return this.prisma.assignmentEntry.findMany({
      where: { assignment_id: assignmentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { first_name: true, last_name: true } },
          },
        },
        grader: {
          select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } },
        },
      },
      orderBy: { submitted_at: "desc" },
    });
  }

  async adminGradeEntry(
    entryId: string,
    graderId: string,
    dto: { section_grades: { section_id: string; grade: number; feedback?: string }[]; overall_feedback?: string },
  ) {
    const entry = await this.prisma.assignmentEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException("Submission not found");

    const existing: SectionResponse[] = (entry.section_responses as any) ?? [];

    // Merge section grades into existing responses
    const updated = existing.map((resp) => {
      const g = dto.section_grades.find((sg) => sg.section_id === resp.section_id);
      if (!g) return resp;
      return { ...resp, grade: g.grade, feedback: g.feedback ?? null };
    });

    // Total grade = sum of all section grades
    const totalGrade = updated.reduce((sum, r) => sum + (r.grade ?? 0), 0);

    return this.prisma.assignmentEntry.update({
      where: { id: entryId },
      data: {
        section_responses: updated as any,
        grade: totalGrade,
        feedback: dto.overall_feedback?.trim() || null,
        status: "graded",
        graded_by: graderId,
        graded_at: new Date(),
      },
    });
  }

  // ── Student ───────────────────────────────────────────────────────────────

  async getMyAssignments(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: userId, status: "active" },
      select: { certification_id: true, certification: { select: { id: true, acronym: true, title: true } } },
    });
    if (!enrollments.length) return [];

    const certIds = enrollments.map((e) => e.certification_id);
    const certMap = Object.fromEntries(enrollments.map((e) => [e.certification_id, e.certification]));

    const assignments = await this.prisma.assignment.findMany({
      where: { certification_id: { in: certIds }, status: "published" },
      include: { entries: { where: { user_id: userId } } },
      orderBy: [{ sort_order: "asc" }, { due_date: "asc" }],
    });

    return assignments.map((a) => {
      const entry = a.entries[0] ?? null;
      // Only expose section grades if grades_released
      const entryForStudent = entry
        ? {
            ...entry,
            section_responses: a.grades_released
              ? entry.section_responses
              : (entry.section_responses as SectionResponse[]).map((r) => ({ ...r, grade: null, feedback: null })),
            grade: a.grades_released ? entry.grade : null,
          }
        : null;

      return {
        id: a.id,
        title: a.title,
        type: a.type,
        description: a.description,
        instructions: a.instructions,
        sections: a.sections,
        due_date: a.due_date,
        max_score: a.max_score,
        grades_released: a.grades_released,
        certification: certMap[a.certification_id],
        entry: entryForStudent,
      };
    });
  }

  async submitEntry(
    userId: string,
    assignmentId: string,
    dto: { section_responses?: SectionResponse[]; text_content?: string; file_url?: string; file_name?: string },
  ) {
    const assignment = await this.findOneOrFail(assignmentId);
    if (assignment.status !== "published") {
      throw new BadRequestException("This assignment is not open for submissions");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, certification_id: assignment.certification_id, status: "active" },
    });
    if (!enrollment) throw new ForbiddenException("You are not enrolled in this certification");

    const sections = assignment.sections as AssignmentSection[];
    // Build section_responses skeleton preserving any existing grades
    const existing = await this.prisma.assignmentEntry.findUnique({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } },
    });
    const existingResponses: SectionResponse[] = (existing?.section_responses as any) ?? [];

    const mergedResponses: SectionResponse[] = sections.map((sec) => {
      const incoming = dto.section_responses?.find((r) => r.section_id === sec.id);
      const prev = existingResponses.find((r) => r.section_id === sec.id);
      return {
        section_id: sec.id,
        text_content: incoming?.text_content ?? prev?.text_content ?? "",
        grade: prev?.grade ?? null,
        feedback: prev?.feedback ?? null,
      };
    });

    return this.prisma.assignmentEntry.upsert({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } },
      create: {
        assignment_id: assignmentId,
        user_id: userId,
        section_responses: mergedResponses as any,
        text_content: dto.text_content?.trim() || null,
        file_url: dto.file_url || null,
        file_name: dto.file_name || null,
        status: "submitted",
      },
      update: {
        section_responses: mergedResponses as any,
        text_content: dto.text_content?.trim() || null,
        file_url: dto.file_url || null,
        file_name: dto.file_name || null,
        status: "submitted",
        submitted_at: new Date(),
      },
    });
  }

  async getMyEntry(userId: string, assignmentId: string) {
    const assignment = await this.findOneOrFail(assignmentId);
    const entry = await this.prisma.assignmentEntry.findUnique({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } },
    });
    if (!entry) return null;

    if (!assignment.grades_released) {
      return {
        ...entry,
        section_responses: (entry.section_responses as SectionResponse[]).map((r) => ({
          ...r, grade: null, feedback: null,
        })),
        grade: null,
      };
    }
    return entry;
  }

  private async findOneOrFail(id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Assignment not found");
    return a;
  }
}
