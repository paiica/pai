import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  // ── Admin ─────────────────────────────────────────────────────────────────

  async adminList(certId?: string) {
    const where: any = certId ? { certification_id: certId } : {};
    const assignments = await this.prisma.assignment.findMany({
      where,
      include: {
        certification: { select: { id: true, acronym: true, title: true } },
        _count: { select: { entries: true } },
      },
      orderBy: [{ certification_id: "asc" }, { sort_order: "asc" }, { created_at: "desc" }],
    });
    return assignments;
  }

  async adminCreate(dto: {
    certification_id: string;
    title: string;
    description?: string;
    instructions?: string;
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

    return this.prisma.assignment.create({
      data: {
        certification_id: dto.certification_id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        max_score: dto.max_score ?? 100,
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
    description: string;
    instructions: string;
    due_date: string | null;
    max_score: number;
    status: string;
    sort_order: number;
    certification_id: string;
  }>) {
    await this.findOneOrFail(id);
    const data: any = {};
    if (dto.title !== undefined)          data.title          = dto.title.trim();
    if (dto.description !== undefined)    data.description    = dto.description?.trim() || null;
    if (dto.instructions !== undefined)   data.instructions   = dto.instructions?.trim() || null;
    if (dto.due_date !== undefined)       data.due_date       = dto.due_date ? new Date(dto.due_date) : null;
    if (dto.max_score !== undefined)      data.max_score      = dto.max_score;
    if (dto.status !== undefined)         data.status         = dto.status;
    if (dto.sort_order !== undefined)     data.sort_order     = dto.sort_order;
    if (dto.certification_id !== undefined) data.certification_id = dto.certification_id;

    return this.prisma.assignment.update({
      where: { id },
      data,
      include: {
        certification: { select: { id: true, acronym: true, title: true } },
      },
    });
  }

  async adminDelete(id: string) {
    await this.findOneOrFail(id);
    await this.prisma.assignment.delete({ where: { id } });
    return { message: "Assignment deleted" };
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
        grader: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
      },
      orderBy: { submitted_at: "desc" },
    });
  }

  async adminGradeEntry(entryId: string, graderId: string, dto: { grade: number; feedback?: string }) {
    const entry = await this.prisma.assignmentEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException("Submission not found");

    return this.prisma.assignmentEntry.update({
      where: { id: entryId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback?.trim() || null,
        status: "graded",
        graded_by: graderId,
        graded_at: new Date(),
      },
    });
  }

  // ── Student ───────────────────────────────────────────────────────────────

  async getMyAssignments(userId: string) {
    // Get active certification enrollments
    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: userId, status: "active" },
      select: { certification_id: true, certification: { select: { id: true, acronym: true, title: true } } },
    });
    if (!enrollments.length) return [];

    const certIds = enrollments.map((e) => e.certification_id);
    const certMap = Object.fromEntries(enrollments.map((e) => [e.certification_id, e.certification]));

    const assignments = await this.prisma.assignment.findMany({
      where: { certification_id: { in: certIds }, status: "published" },
      include: {
        entries: { where: { user_id: userId } },
      },
      orderBy: [{ sort_order: "asc" }, { due_date: "asc" }],
    });

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      due_date: a.due_date,
      max_score: a.max_score,
      certification: certMap[a.certification_id],
      entry: a.entries[0] ?? null,
    }));
  }

  async submitEntry(userId: string, assignmentId: string, dto: {
    text_content?: string;
    file_url?: string;
    file_name?: string;
  }) {
    const assignment = await this.findOneOrFail(assignmentId);
    if (assignment.status !== "published") {
      throw new BadRequestException("This assignment is not open for submissions");
    }

    // Verify student is enrolled in the cert
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, certification_id: assignment.certification_id, status: "active" },
    });
    if (!enrollment) throw new ForbiddenException("You are not enrolled in this certification");

    return this.prisma.assignmentEntry.upsert({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } },
      create: {
        assignment_id: assignmentId,
        user_id: userId,
        text_content: dto.text_content?.trim() || null,
        file_url: dto.file_url || null,
        file_name: dto.file_name || null,
        status: "submitted",
      },
      update: {
        text_content: dto.text_content?.trim() || null,
        file_url: dto.file_url || null,
        file_name: dto.file_name || null,
        status: "submitted",
        submitted_at: new Date(),
      },
    });
  }

  async getMyEntry(userId: string, assignmentId: string) {
    await this.findOneOrFail(assignmentId);
    const entry = await this.prisma.assignmentEntry.findUnique({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } },
    });
    return entry ?? null;
  }

  private async findOneOrFail(id: string) {
    const a = await this.prisma.assignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException("Assignment not found");
    return a;
  }
}
