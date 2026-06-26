import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException,
} from "@nestjs/common";
import { CertificationStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateModuleDto } from "./dto/create-module.dto";
import { UpdateModuleDto } from "./dto/update-module.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { ReorderItemsDto } from "./dto/reorder-items.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { GradeSubmissionDto } from "./dto/grade-submission.dto";

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  // ─── Public ──────────────────────────────────────────────────────────

  async findAll(status?: CertificationStatus) {
    return this.prisma.certification.findMany({
      where: status ? { status } : { status: { in: [CertificationStatus.active, CertificationStatus.coming_soon] } },
      include: {
        modules: {
          orderBy: { sort_order: "asc" },
          include: {
            lessons: { where: { is_published: true }, orderBy: { sort_order: "asc" } },
          },
        },
        instructors: {
          include: {
            user: { include: { profile: { select: { first_name: true, last_name: true, avatar_url: true } } } },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    });
  }

  async findBySlug(slug: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { sort_order: "asc" },
          include: {
            lessons: {
              where: { is_published: true },
              orderBy: { sort_order: "asc" },
              include: { resources: true },
            },
          },
        },
        faqs: { orderBy: { sort_order: "asc" } },
        instructors: {
          include: {
            user: { include: { profile: { select: { first_name: true, last_name: true, avatar_url: true, bio: true } } } },
          },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");
    return cert;
  }

  // Public lesson access (gated by enrollment)
  async findLesson(lessonId: string, userId: string, enrollmentId?: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        resources: true,
        quiz_questions: { orderBy: { sort_order: "asc" } },
        module: { include: { certification: true } },
      },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (!lesson.is_free_preview) {
      if (!enrollmentId) {
        return { ...lesson, content_body: null, video_url: null, quiz_questions: [] };
      }
      // Verify the enrollment actually belongs to the requesting user
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        select: { user_id: true },
      });
      if (!enrollment || enrollment.user_id !== userId) {
        return { ...lesson, content_body: null, video_url: null, quiz_questions: [] };
      }
    }
    return lesson;
  }

  // ─── Professor helpers ────────────────────────────────────────────────

  async assertProfessorAccess(certificationId: string, userId: string, role: Role) {
    if (role === Role.super_admin || role === Role.admin) return;
    const instructor = await this.prisma.courseInstructor.findUnique({
      where: { certification_id_user_id: { certification_id: certificationId, user_id: userId } },
    });
    if (!instructor) throw new ForbiddenException("You are not assigned to this certification");
  }

  async getProfessorCertifications(userId: string, role: Role) {
    if (role === Role.super_admin || role === Role.admin) {
      return this.prisma.certification.findMany({
        include: {
          _count: { select: { modules: true, enrollments: true } },
          instructors: {
            include: { user: { include: { profile: { select: { first_name: true, last_name: true } } } } },
          },
        },
        orderBy: { sort_order: "asc" },
      });
    }
    const assignments = await this.prisma.courseInstructor.findMany({
      where: { user_id: userId },
      include: {
        certification: {
          include: { _count: { select: { modules: true, enrollments: true } } },
        },
      },
    });
    return assignments.map((a) => ({ ...a.certification, is_lead: a.is_lead }));
  }

  async getCertificationForBuilder(certId: string, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: {
        modules: {
          orderBy: { sort_order: "asc" },
          include: {
            lessons: {
              orderBy: { sort_order: "asc" },
              include: {
                quiz_questions: { orderBy: { sort_order: "asc" } },
                resources: true,
                _count: { select: { assignment_submissions: true } },
              },
            },
          },
        },
        instructors: {
          include: { user: { include: { profile: { select: { first_name: true, last_name: true, avatar_url: true } } } } },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");
    return cert;
  }

  // ─── Modules ─────────────────────────────────────────────────────────

  async createModule(certId: string, dto: CreateModuleDto, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);

    const lastModule = await this.prisma.module.findFirst({
      where: { certification_id: certId },
      orderBy: { sort_order: "desc" },
    });
    const sortOrder = dto.sort_order ?? (lastModule ? lastModule.sort_order + 1 : 0);

    return this.prisma.module.create({
      data: { ...dto, certification_id: certId, sort_order: sortOrder },
    });
  }

  async updateModule(moduleId: string, dto: UpdateModuleDto, userId: string, role: Role) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException("Module not found");
    await this.assertProfessorAccess(mod.certification_id!, userId, role);
    return this.prisma.module.update({ where: { id: moduleId }, data: dto });
  }

  async deleteModule(moduleId: string, userId: string, role: Role) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { _count: { select: { lessons: true } } },
    });
    if (!mod) throw new NotFoundException("Module not found");
    await this.assertProfessorAccess(mod.certification_id!, userId, role);
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { message: "Module deleted" };
  }

  async reorderModules(certId: string, dto: ReorderItemsDto, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);
    await this.prisma.$transaction(
      dto.ordered_ids.map((id, index) =>
        this.prisma.module.update({ where: { id }, data: { sort_order: index } })
      )
    );
    return { message: "Modules reordered" };
  }

  // ─── Lessons ─────────────────────────────────────────────────────────

  async createLesson(moduleId: string, dto: CreateLessonDto, userId: string, role: Role) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException("Module not found");
    await this.assertProfessorAccess(mod.certification_id!, userId, role);

    const lastLesson = await this.prisma.lesson.findFirst({
      where: { module_id: moduleId },
      orderBy: { sort_order: "desc" },
    });
    const sortOrder = dto.sort_order ?? (lastLesson ? lastLesson.sort_order + 1 : 0);

    return this.prisma.lesson.create({
      data: { ...dto, module_id: moduleId, sort_order: sortOrder },
    });
  }

  async updateLesson(lessonId: string, dto: UpdateLessonDto, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id!, userId, role);
    return this.prisma.lesson.update({ where: { id: lessonId }, data: dto as any });
  }

  async deleteLesson(lessonId: string, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id!, userId, role);
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { message: "Lesson deleted" };
  }

  async reorderLessons(moduleId: string, dto: ReorderItemsDto, userId: string, role: Role) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException("Module not found");
    await this.assertProfessorAccess(mod.certification_id!, userId, role);
    await this.prisma.$transaction(
      dto.ordered_ids.map((id, index) =>
        this.prisma.lesson.update({ where: { id }, data: { sort_order: index } })
      )
    );
    return { message: "Lessons reordered" };
  }

  // ─── Quiz Questions ───────────────────────────────────────────────────

  async createQuestion(lessonId: string, dto: CreateQuestionDto, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    if (lesson.type !== "quiz") throw new BadRequestException("Lesson is not a quiz");
    await this.assertProfessorAccess(lesson.module.certification_id!, userId, role);

    const lastQ = await this.prisma.quizQuestion.findFirst({
      where: { lesson_id: lessonId },
      orderBy: { sort_order: "desc" },
    });
    const sortOrder = dto.sort_order ?? (lastQ ? lastQ.sort_order + 1 : 0);

    return this.prisma.quizQuestion.create({
      data: { ...dto, lesson_id: lessonId, sort_order: sortOrder, options: dto.options as any },
    });
  }

  async updateQuestion(questionId: string, dto: Partial<CreateQuestionDto>, userId: string, role: Role) {
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { lesson: { include: { module: true } } },
    });
    if (!q) throw new NotFoundException("Question not found");
    await this.assertProfessorAccess(q.lesson.module.certification_id!, userId, role);
    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: { ...dto, options: dto.options as any },
    });
  }

  async deleteQuestion(questionId: string, userId: string, role: Role) {
    const q = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: { lesson: { include: { module: true } } },
    });
    if (!q) throw new NotFoundException("Question not found");
    await this.assertProfessorAccess(q.lesson.module.certification_id!, userId, role);
    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
    return { message: "Question deleted" };
  }

  // ─── Students & Submissions (professor view) ──────────────────────────

  async getCertificationStudents(certId: string, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);
    return this.prisma.enrollment.findMany({
      where: { certification_id: certId, status: "active" },
      include: {
        user: {
          include: { profile: { select: { first_name: true, last_name: true, avatar_url: true, display_name: true } } },
        },
        _count: { select: { lesson_progress: { where: { completed: true } }, assignment_submissions: true } },
      },
      orderBy: { enrolled_at: "desc" },
    });
  }

  async getCertificationSubmissions(certId: string, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);
    return this.prisma.assignmentSubmission.findMany({
      where: {
        lesson: { module: { certification_id: certId } },
      },
      include: {
        user: { include: { profile: { select: { first_name: true, last_name: true, display_name: true } } } },
        lesson: { select: { id: true, title: true, max_score: true, due_date: true } },
      },
      orderBy: { submitted_at: "desc" },
    });
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, graderId: string, role: Role) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { lesson: { include: { module: true } } },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    await this.assertProfessorAccess(submission.lesson.module.certification_id!, graderId, role);

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        graded_by: graderId,
        graded_at: new Date(),
        status: "graded",
      },
    });
  }

  // ─── Gradebook ────────────────────────────────────────────────────────

  async getGradebook(certId: string, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);

    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: {
        modules: {
          include: {
            lessons: {
              where: { type: { in: ["quiz", "assignment"] } },
              select: { id: true, title: true, type: true, max_score: true },
            },
          },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");

    const enrollments = await this.prisma.enrollment.findMany({
      where: { certification_id: certId },
      include: {
        user: { include: { profile: { select: { first_name: true, last_name: true } } } },
        lesson_progress: { where: { quiz_passed: { not: null } } },
        assignment_submissions: { where: { grade: { not: null } } },
      },
    });

    const gradableItems = cert.modules.flatMap((m) => m.lessons);

    return {
      certification: { id: cert.id, title: cert.title, acronym: cert.acronym },
      gradable_items: gradableItems,
      students: enrollments.map((e) => ({
        enrollment_id: e.id,
        user: e.user,
        progress_percentage: e.progress_percentage,
        status: e.status,
        quiz_scores: e.lesson_progress.reduce<Record<string, number>>((acc, lp) => {
          if (lp.quiz_score !== null) acc[lp.lesson_id] = lp.quiz_score;
          return acc;
        }, {}),
        assignment_grades: e.assignment_submissions.reduce<Record<string, number>>((acc, s) => {
          if (s.grade !== null) acc[s.lesson_id] = s.grade;
          return acc;
        }, {}),
      })),
    };
  }

  // ─── Admin ────────────────────────────────────────────────────────────

  async adminGetCertification(certId: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: {
        _count: { select: { enrollments: true, applications: true } },
        faqs: { orderBy: { sort_order: "asc" } },
        modules: { orderBy: { sort_order: "asc" }, include: { _count: { select: { lessons: true } } } },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");
    const [raw] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT is_featured FROM lms.certifications WHERE id = $1`,
      certId,
    );
    return { ...cert, is_featured: raw?.is_featured ?? false };
  }

  async adminGetCertificationEnrollments(certId: string) {
    return this.prisma.enrollment.findMany({
      where: { certification_id: certId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { first_name: true, last_name: true } },
          },
        },
        certificate: { select: { id: true, issued_at: true, certificate_number: true } },
      },
      orderBy: { enrolled_at: "desc" },
    });
  }

  async adminGetAllCertifications() {
    const [certs, examCounts, featuredRows] = await Promise.all([
      this.prisma.certification.findMany({
        include: {
          _count: { select: { modules: true, enrollments: true, applications: true } },
          instructors: {
            include: { user: { include: { profile: { select: { first_name: true, last_name: true } } } } },
          },
        },
        orderBy: { sort_order: "asc" },
      }),
      this.prisma.structuredExam.groupBy({
        by: ["certification_id"],
        _count: { id: true },
        where: { status: "published" },
      }),
      this.prisma.$queryRawUnsafe<{ id: string; is_featured: boolean }[]>(
        `SELECT id, is_featured FROM lms.certifications`,
      ),
    ]);
    const examMap     = new Map(examCounts.map((r) => [r.certification_id, r._count.id]));
    const featuredMap = new Map(featuredRows.map((r) => [r.id, r.is_featured]));
    return certs.map((c) => ({
      ...c,
      published_exam_count: examMap.get(c.id) ?? 0,
      is_featured: featuredMap.get(c.id) ?? false,
    }));
  }

  async adminCreateCertification(dto: any) {
    const slug = dto.slug || dto.acronym.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return this.prisma.certification.create({
      data: {
        slug,
        acronym: dto.acronym,
        title: dto.title,
        level: dto.level,
        status: dto.status ?? "coming_soon",
        badge_icon: dto.badge_icon ?? "🎓",
        price: dto.price ?? 0,
        description: dto.description ?? "",
        long_description: dto.long_description ?? "",
        learning_outcomes: dto.learning_outcomes ?? [],
        target_audience: dto.target_audience ?? [],
        duration_weeks: dto.duration_weeks ?? 12,
        passing_score: dto.passing_score ?? 70,
        sort_order: dto.sort_order ?? 99,
      },
    });
  }

  async findFeaturedCertifications() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.slug, c.acronym, c.title, c.level::text, c.status::text,
             c.badge_icon, c.price, c.description, c.sort_order,
             c.marketing_meta
      FROM lms.certifications c
      WHERE c.status IN ('active', 'coming_soon') AND c.is_featured = true
      ORDER BY c.sort_order ASC
    `);
  }

  async adminUpdateCertification(certId: string, dto: any) {
    const { is_featured, link_grace_minutes, ...rest } = dto;
    try {
      const updated = await this.prisma.certification.update({ where: { id: certId }, data: rest });
      if (is_featured !== undefined) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE lms.certifications SET is_featured = $1::boolean WHERE id = $2`,
          is_featured, certId,
        );
      }
      if (link_grace_minutes !== undefined) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE lms.certifications SET marketing_meta = marketing_meta || $1::jsonb WHERE id = $2`,
          JSON.stringify({ link_grace_minutes: Number(link_grace_minutes) }), certId,
        );
      }
      return updated;
    } catch (e: any) {
      throw new InternalServerErrorException(e?.message ?? "Unknown error updating certification");
    }
  }

  async adminDeleteCertification(certId: string) {
    await this.prisma.$transaction(async (tx) => {
      // Collect enrollment IDs so we can delete child records manually
      // (Enrollment and Application don't have onDelete: Cascade from Certification in schema)
      const enrollments = await tx.enrollment.findMany({
        where: { certification_id: certId },
        select: { id: true },
      });
      const enrollmentIds = enrollments.map((e) => e.id);

      if (enrollmentIds.length > 0) {
        await tx.certificate.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
        await tx.examBooking.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
        await tx.examAttempt.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
        await tx.lessonProgress.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
        await tx.assignmentSubmission.deleteMany({ where: { enrollment_id: { in: enrollmentIds } } });
        await tx.enrollment.deleteMany({ where: { certification_id: certId } });
      }

      // Delete applications (ApplicationDocument cascades from Application)
      await tx.application.deleteMany({ where: { certification_id: certId } });

      // Delete course instructors (no cascade from Certification in schema)
      await tx.courseInstructor.deleteMany({ where: { certification_id: certId } });

      // Delete the certification — remaining relations (Module, ExamBank, ExamSession,
      // CourseFAQ, StructuredExam) all have onDelete: Cascade in the schema
      await tx.certification.delete({ where: { id: certId } });
    });

    return { message: "Certification deleted" };
  }

  async assignInstructor(certId: string, instructorUserId: string, isLead: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: instructorUserId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "professor" && user.role !== "admin" && user.role !== "super_admin") {
      throw new BadRequestException("User must be a professor or admin");
    }
    return this.prisma.courseInstructor.upsert({
      where: { certification_id_user_id: { certification_id: certId, user_id: instructorUserId } },
      create: { certification_id: certId, user_id: instructorUserId, is_lead: isLead },
      update: { is_lead: isLead },
    });
  }

  async removeInstructor(certId: string, instructorUserId: string) {
    await this.prisma.courseInstructor.delete({
      where: { certification_id_user_id: { certification_id: certId, user_id: instructorUserId } },
    });
    return { message: "Instructor removed" };
  }

  // Legacy — keep for existing public controller
  async createCertification(dto: any) {
    return this.prisma.certification.create({ data: dto });
  }
}
