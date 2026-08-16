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
import { LearningService } from "../learning/learning.service";
import { ContentImportService } from "../content-import/content-import.service";
import { UploadsService } from "../uploads/uploads.service";
import { AiService } from "../ai/ai.service";
import { NotificationsService } from "../notifications/notifications.service";
import { renderBlockItems, wrapLessonContent, ImportPlan, stripHtmlExcerpt } from "../content-import/rise-html-blocks";

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private learningService: LearningService,
    private contentImport: ContentImportService,
    private uploads: UploadsService,
    private aiService: AiService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────

  // member_discount_percentage is an internal pricing lever (set by admins,
  // consumed server-side at course checkout), and stripe_price_id is an
  // internal Stripe integration detail — neither has a public UI or any
  // reason to be readable by anyone hitting these public endpoints, so both
  // are stripped from both public responses below.
  private omitInternalFields<T extends { member_discount_percentage?: unknown; stripe_price_id?: unknown }>(
    cert: T,
  ): Omit<T, "member_discount_percentage" | "stripe_price_id"> {
    const { member_discount_percentage: _omit1, stripe_price_id: _omit2, ...rest } = cert;
    return rest;
  }

  async findAll(status?: CertificationStatus) {
    const certs = await this.prisma.certification.findMany({
      where: status ? { status } : { status: { in: [CertificationStatus.active, CertificationStatus.coming_soon] } },
      include: {
        modules: {
          orderBy: { sort_order: "asc" },
          include: {
            // visible_in_structure excludes Sublessons from the public/main
            // navigation — see schema.prisma's Lesson model comment.
            lessons: { where: { is_published: true, visible_in_structure: true }, orderBy: { sort_order: "asc" } },
          },
        },
        instructors: {
          include: {
            user: { select: { id: true, profile: { select: { first_name: true, last_name: true, avatar_url: true } } } },
          },
        },
      },
      orderBy: { sort_order: "asc" },
    });
    return certs.map((c) => this.omitInternalFields(c));
  }

  // Lightweight list for browse/catalog UIs (e.g. the student portal's
  // Online Tools page) that only need card-level fields — no nested
  // modules/lessons/instructors, and no internal-only pricing fields.
  async findCatalogList(status?: CertificationStatus) {
    return this.prisma.certification.findMany({
      where: status ? { status } : { status: { in: [CertificationStatus.active, CertificationStatus.coming_soon] } },
      select: {
        id: true, slug: true, acronym: true, title: true, level: true,
        price: true, badge_icon: true, description: true, duration_weeks: true,
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
              where: { is_published: true, visible_in_structure: true },
              orderBy: { sort_order: "asc" },
              include: { resources: true },
            },
          },
        },
        faqs: { orderBy: { sort_order: "asc" } },
        instructors: {
          include: {
            user: { select: { id: true, profile: { select: {
              first_name: true, last_name: true, avatar_url: true, bio: true,
              job_title: true, company: true, years_experience: true,
              education_entries: true, experience_entries: true,
            } } } },
          },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");
    return this.omitInternalFields(cert);
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
            include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
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
          include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true, avatar_url: true } } } } },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");
    return cert;
  }

  // Imports an Articulate Rise 360 export (.zip) as new modules/lessons on
  // top of whatever's already in the certification — an additive alternative
  // to building modules by hand, not a replacement for it.
  async importRiseExport(certId: string, zipBuffer: Buffer, userId: string, role: Role, mode: "decompose" | "preserve" | "scorm" = "decompose") {
    await this.assertProfessorAccess(certId, userId, role);

    let plan: ImportPlan;
    if (mode === "scorm") {
      const { title, launchHref, contentRoot } = this.contentImport.parseScormManifest(zipBuffer);
      const { launchUrl } = await this.contentImport.hostScormPackageAsStaticSite(zipBuffer, contentRoot, launchHref);
      plan = this.contentImport.buildScormPlan(title, launchUrl);
    } else {
      const { course, assets } = this.contentImport.parseRiseExport(zipBuffer);
      plan = mode === "preserve"
        ? this.contentImport.buildOriginalDesignPlan(course, (await this.contentImport.hostRiseExportAsStaticSite(zipBuffer)).indexUrl)
        : await this.contentImport.buildImportPlan(course, assets);
    }

    let modulesCreated = 0, lessonsCreated = 0, questionsCreated = 0;
    for (const plannedModule of plan.modules) {
      const mod = await this.createModule(certId, { title: plannedModule.title } as CreateModuleDto, userId, role);
      modulesCreated++;
      for (const lesson of plannedModule.lessons) {
        const created = await this.createLesson(mod.id, {
          title: lesson.title,
          type: lesson.type,
          content_body: lesson.content_html,
          external_url: lesson.external_url,
        } as CreateLessonDto, userId, role);
        lessonsCreated++;
        for (const q of lesson.questions ?? []) {
          await this.createQuestion(created.id, q as CreateQuestionDto, userId, role);
          questionsCreated++;
        }
      }
    }

    return {
      modules_created: modulesCreated,
      lessons_created: lessonsCreated,
      questions_created: questionsCreated,
      images_uploaded: plan.images_uploaded,
      flagged: plan.flagged,
    };
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
      include: { lessons: { select: { content_body: true, external_url: true } } },
    });
    if (!mod) throw new NotFoundException("Module not found");
    await this.assertProfessorAccess(mod.certification_id!, userId, role);
    await Promise.all(mod.lessons.map((l) => this.uploads.cleanupLessonStorage(l)));
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { message: "Module deleted" };
  }

  // Wipes every module (and, by cascade, every lesson/quiz question) for a
  // certification in one shot — the "start over with a fresh import" button.
  // Irreversible; the caller is responsible for confirming with the admin.
  async deleteAllModules(certId: string, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);
    const modules = await this.prisma.module.findMany({
      where: { certification_id: certId },
      include: { lessons: { select: { content_body: true, external_url: true } } },
    });
    if (!modules.length) return { message: "Nothing to delete", deleted_count: 0 };
    const allLessons = modules.flatMap((m) => m.lessons);
    await Promise.all(allLessons.map((l) => this.uploads.cleanupLessonStorage(l)));
    await this.prisma.module.deleteMany({ where: { certification_id: certId } });
    return { message: "All modules deleted", deleted_count: modules.length };
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

  // A Sublesson is a Lesson row like any other (same content system, same
  // editor) with parent_lesson_id set — see schema.prisma's Lesson model
  // comment. sort_order is scoped to siblings under THIS parent, not the
  // whole module's lesson list, since sublessons never appear in that list
  // (visible_in_structure: false) and reordering them shouldn't touch
  // regular lesson ordering at all.
  async createSublesson(parentLessonId: string, title: string, userId: string, role: Role) {
    const parent = await this.assertLessonProfessorAccess(parentLessonId, userId, role);
    const maxSort = await this.prisma.lesson.aggregate({
      where: { parent_lesson_id: parentLessonId },
      _max: { sort_order: true },
    });
    return this.prisma.lesson.create({
      data: {
        module_id: parent.module_id,
        parent_lesson_id: parentLessonId,
        title,
        type: "reading",
        sort_order: (maxSort._max.sort_order ?? -1) + 1,
        is_published: false,
        visible_in_structure: false,
      },
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

  // Renders a manually-built block list to HTML the same way Rise imports
  // are rendered (shared dispatch in rise-html-blocks.ts) — no persistence,
  // used for the block builder's live preview.
  async previewLessonBlocks(lessonId: string, blocks: any[], userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id!, userId, role);
    const flags: string[] = [];
    const { html } = await renderBlockItems(blocks, new Map(), this.uploads.uploadBufferServerSide.bind(this.uploads), flags);
    return { content_body: wrapLessonContent(html), flags };
  }

  // Renders and persists — both `blocks_json` (so the builder can reopen
  // the same blocks later) and `content_body` (what students/Preview
  // actually render) are written together so they never drift apart.
  async saveLessonBlocks(lessonId: string, blocks: any[], userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id!, userId, role);
    const flags: string[] = [];
    const { html } = await renderBlockItems(blocks, new Map(), this.uploads.uploadBufferServerSide.bind(this.uploads), flags);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { blocks_json: blocks, content_body: wrapLessonContent(html) },
    });
  }

  async deleteLesson(lessonId: string, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id!, userId, role);
    await this.uploads.cleanupLessonStorage(lesson);
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

  async reorderSublessons(parentLessonId: string, dto: ReorderItemsDto, userId: string, role: Role) {
    await this.assertLessonProfessorAccess(parentLessonId, userId, role);
    await this.prisma.$transaction(
      dto.ordered_ids.map((id, index) =>
        this.prisma.lesson.update({ where: { id, parent_lesson_id: parentLessonId }, data: { sort_order: index } })
      )
    );
    return { message: "Sublessons reordered" };
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
          select: { id: true, email: true, last_login_at: true, profile: { select: { first_name: true, last_name: true, avatar_url: true, display_name: true, phone: true, country: true } } },
        },
        _count: { select: { lesson_progress: { where: { completed: true } }, assignment_submissions: { where: { is_latest: true } } } },
      },
      orderBy: { enrolled_at: "desc" },
    });
  }

  async getCertificationSubmissions(certId: string, userId: string, role: Role) {
    await this.assertProfessorAccess(certId, userId, role);
    return this.prisma.assignmentSubmission.findMany({
      where: {
        lesson: { module: { certification_id: certId } },
        is_latest: true,
      },
      include: {
        user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true, display_name: true } } } },
        lesson: { select: { id: true, title: true, max_score: true, due_date: true } },
        files: true,
      },
      orderBy: { submitted_at: "desc" },
    });
  }

  async getSubmissionAttempts(lessonId: string, studentUserId: string, requesterId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson || !lesson.module.certification_id) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id, requesterId, role);
    return this.prisma.assignmentSubmission.findMany({
      where: { lesson_id: lessonId, user_id: studentUserId },
      include: { files: true },
      orderBy: { attempt_number: "asc" },
    });
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, graderId: string, role: Role) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { lesson: { include: { module: true } } },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    await this.assertProfessorAccess(submission.lesson.module.certification_id!, graderId, role);

    const graded = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        graded_by: graderId,
        graded_at: new Date(),
        status: "graded",
      },
    });

    await this.learningService.completeGradedAssignment(
      submission.enrollment_id!, submission.lesson_id, submission.user_id
    );

    await this.notificationsService.create(
      submission.user_id,
      "assignment_graded",
      "Assignment graded",
      `Your submission for "${submission.lesson.title}" has been graded.`,
      { lesson_id: submission.lesson_id, submission_id: submission.id }
    );

    return graded;
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
        user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
        lesson_progress: { where: { quiz_passed: { not: null } } },
        assignment_submissions: { where: { grade: { not: null }, is_latest: true } },
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

  // ─── Assignment statistics ──────────────────────────────────────────────

  private async assertLessonProfessorAccess(lessonId: string, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson || !lesson.module.certification_id) throw new NotFoundException("Lesson not found");
    await this.assertProfessorAccess(lesson.module.certification_id, userId, role);
    return lesson;
  }

  async getAssignmentStatistics(lessonId: string, userId: string, role: Role) {
    const lesson = await this.assertLessonProfessorAccess(lessonId, userId, role);
    if (!lesson.module.certification_id) throw new NotFoundException("Lesson not found");

    const [enrolledCount, latestAttempts] = await Promise.all([
      this.prisma.enrollment.count({ where: { certification_id: lesson.module.certification_id, status: "active" } }),
      this.prisma.assignmentSubmission.findMany({
        where: { lesson_id: lessonId, is_latest: true },
        select: { grade: true, max_grade: true, status: true, is_late: true },
      }),
    ]);

    const submitted = latestAttempts.length;
    const graded = latestAttempts.filter((a) => a.grade != null);
    const percentages = graded.map((a) => (a.grade! / a.max_grade) * 100);

    return {
      enrolled: enrolledCount,
      submitted,
      not_submitted: Math.max(0, enrolledCount - submitted),
      graded: graded.length,
      awaiting_grading: submitted - graded.length,
      average: percentages.length ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10 : null,
      highest: percentages.length ? Math.round(Math.max(...percentages) * 10) / 10 : null,
      lowest: percentages.length ? Math.round(Math.min(...percentages) * 10) / 10 : null,
      late: latestAttempts.filter((a) => a.is_late).length,
    };
  }

  // ─── Duplicate a lesson (settings + structure, never submissions/progress) ─
  // Mirrors PrepCoursesService.duplicateLesson() for the Course Builder.

  async duplicateLesson(lessonId: string, userId: string, role: Role) {
    const lesson = await this.assertLessonProfessorAccess(lessonId, userId, role);
    // A sublesson's duplicate stays under the same parent, ordered among its
    // siblings — not appended to the whole module's lesson list, which is a
    // different, unrelated ordering (see createSublesson above).
    const isSublesson = !!lesson.parent_lesson_id;
    const [resources, questions, maxSort] = await Promise.all([
      this.prisma.lessonResource.findMany({ where: { lesson_id: lessonId } }),
      this.prisma.quizQuestion.findMany({ where: { lesson_id: lessonId } }),
      this.prisma.lesson.aggregate({
        where: isSublesson ? { parent_lesson_id: lesson.parent_lesson_id } : { module_id: lesson.module_id },
        _max: { sort_order: true },
      }),
    ]);

    const duplicate = await this.prisma.lesson.create({
      data: {
        module_id: lesson.module_id,
        parent_lesson_id: lesson.parent_lesson_id,
        title: `${lesson.title} (Copy)`,
        description: lesson.description,
        type: lesson.type,
        sort_order: (maxSort._max.sort_order ?? 0) + 1,
        duration_minutes: lesson.duration_minutes,
        is_published: false,
        is_free_preview: false,
        video_url: lesson.video_url,
        content_body: lesson.content_body,
        blocks_json: lesson.blocks_json ?? undefined,
        download_url: lesson.download_url,
        allow_download: lesson.allow_download,
        external_url: lesson.external_url,
        passing_score: lesson.passing_score,
        max_attempts: lesson.max_attempts,
        time_limit_minutes: lesson.time_limit_minutes,
        due_date: lesson.due_date,
        max_score: lesson.max_score,
        allow_text_response: lesson.allow_text_response,
        text_word_limit: lesson.text_word_limit,
        available_from: lesson.available_from,
        accept_submissions: lesson.accept_submissions,
        allow_late_submissions: lesson.allow_late_submissions,
        late_submission_deadline: lesson.late_submission_deadline,
        late_penalty_type: lesson.late_penalty_type,
        late_penalty_value: lesson.late_penalty_value,
        allow_file_upload: lesson.allow_file_upload,
        max_files: lesson.max_files,
        accepted_file_types: lesson.accepted_file_types,
        max_file_size_mb: lesson.max_file_size_mb,
        rubric_json: lesson.rubric_json ?? undefined,
        lab_cells_json: lesson.lab_cells_json ?? undefined,
        sublesson_kind: lesson.sublesson_kind,
        visible_in_structure: lesson.visible_in_structure,
        available_via_link: lesson.available_via_link,
        sublesson_required: lesson.sublesson_required,
        track_views: lesson.track_views,
        open_behavior: lesson.open_behavior,
      },
    });

    if (resources.length) {
      await this.prisma.lessonResource.createMany({
        data: resources.map((r) => ({
          lesson_id: duplicate.id, title: r.title, url: r.url, file_type: r.file_type,
          file_name: r.file_name, sort_order: r.sort_order,
        })),
      });
    }
    if (questions.length) {
      await this.prisma.quizQuestion.createMany({
        data: questions.map((q) => ({
          lesson_id: duplicate.id, question_text: q.question_text, question_type: q.question_type,
          options: q.options as any, correct_index: q.correct_index, explanation: q.explanation,
          points: q.points, sort_order: q.sort_order,
        })),
      });
    }

    return duplicate;
  }

  // ─── Lesson resources (assignment instructions, datasets, templates) ────

  async getLessonResources(lessonId: string, userId: string, role: Role) {
    await this.assertLessonProfessorAccess(lessonId, userId, role);
    return this.prisma.lessonResource.findMany({ where: { lesson_id: lessonId }, orderBy: { sort_order: "asc" } });
  }

  async createLessonResource(lessonId: string, dto: { title: string; url: string; file_name?: string; file_type?: string }, userId: string, role: Role) {
    await this.assertLessonProfessorAccess(lessonId, userId, role);
    const maxSort = await this.prisma.lessonResource.aggregate({ where: { lesson_id: lessonId }, _max: { sort_order: true } });
    return this.prisma.lessonResource.create({
      data: {
        lesson_id: lessonId, title: dto.title, url: dto.url,
        file_name: dto.file_name, file_type: dto.file_type,
        sort_order: (maxSort._max.sort_order ?? -1) + 1,
      },
    });
  }

  async updateLessonResource(lessonId: string, resourceId: string, dto: { title?: string; url?: string }, userId: string, role: Role) {
    await this.assertLessonProfessorAccess(lessonId, userId, role);
    const resource = await this.prisma.lessonResource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.lesson_id !== lessonId) throw new NotFoundException("Resource not found");
    return this.prisma.lessonResource.update({ where: { id: resourceId }, data: dto });
  }

  async deleteLessonResource(lessonId: string, resourceId: string, userId: string, role: Role) {
    await this.assertLessonProfessorAccess(lessonId, userId, role);
    const resource = await this.prisma.lessonResource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.lesson_id !== lessonId) throw new NotFoundException("Resource not found");
    await this.prisma.lessonResource.delete({ where: { id: resourceId } });
    return { message: "Resource deleted" };
  }

  // ─── CSV export ───────────────────────────────────────────────────────

  private toCsv(headers: string[], rows: (string | number)[][]): string {
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  }

  async exportCertificationSubmissions(certId: string, userId: string, role: Role): Promise<string> {
    await this.assertProfessorAccess(certId, userId, role);
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { lesson: { module: { certification_id: certId } }, is_latest: true },
      include: {
        user: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
        lesson: { select: { title: true, max_score: true } },
      },
      orderBy: [{ lesson: { title: "asc" } }, { submitted_at: "desc" }],
    });
    const rows = submissions.map((s) => [
      `${s.user.profile?.first_name ?? ""} ${s.user.profile?.last_name ?? ""}`.trim() || s.user.email,
      s.user.email,
      s.lesson.title,
      s.attempt_number,
      s.submitted_at.toISOString(),
      s.is_late ? "Yes" : "No",
      s.grade ?? "",
      s.max_grade,
      s.status,
    ]);
    return this.toCsv(
      ["Student", "Email", "Assignment", "Attempt", "Submitted At", "Late", "Grade", "Max Grade", "Status"],
      rows,
    );
  }

  // ─── Admin ────────────────────────────────────────────────────────────

  async adminGetCertification(certId: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: {
        _count: { select: { enrollments: true, applications: true } },
        faqs: { orderBy: { sort_order: "asc" } },
        modules: { orderBy: { sort_order: "asc" }, include: { _count: { select: { lessons: true } } } },
        instructors: {
          include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true, avatar_url: true } } } } },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");
    const [raw] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT is_featured FROM lms.certifications WHERE id = $1`,
      certId,
    );
    return { ...cert, is_featured: raw?.is_featured ?? false };
  }

  // Drafts the Overview/Content tab fields (badge icon, description,
  // long description, curriculum overview) from the certification's actual
  // built modules/lessons, rather than a free-text prompt — for certs where
  // the curriculum already exists but the catalog copy is blank or stale.
  async generateOverviewFromBuild(certId: string) {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      select: {
        title: true,
        acronym: true,
        level: true,
        modules: {
          orderBy: { sort_order: "asc" },
          select: {
            title: true,
            lessons: {
              orderBy: { sort_order: "asc" },
              select: { title: true, type: true, description: true, content_body: true, duration_minutes: true },
            },
          },
        },
      },
    });
    if (!cert) throw new NotFoundException("Certification not found");

    const hasLessons = cert.modules.some((m) => m.lessons.length > 0);
    if (!cert.modules.length || !hasLessons) {
      throw new BadRequestException(
        "This certification doesn't have any built modules or lessons yet — add content in the builder first.",
      );
    }

    const modules = cert.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        type: l.type,
        excerpt: stripHtmlExcerpt(l.content_body) || l.description || "",
      })),
    }));

    const draft = await this.aiService.generateCertificationOverviewFromBuild({
      title: cert.title,
      acronym: cert.acronym,
      level: cert.level,
      modules,
    });

    // total_lessons/total_hours aren't something to ask an LLM to guess —
    // they're exact counts already sitting in the real build, so compute
    // them directly instead of risking a hallucinated number.
    const allLessons = cert.modules.flatMap((m) => m.lessons);
    const totalMinutes = allLessons.reduce((sum, l) => sum + (l.duration_minutes ?? 0), 0);

    return {
      ...draft,
      total_lessons: allLessons.length,
      total_hours: Math.round((totalMinutes / 60) * 10) / 10,
    };
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
            include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
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
        badge_icon: dto.badge_icon ?? "graduation-cap",
        price: dto.price ?? 0,
        description: dto.description ?? "",
        long_description: dto.long_description ?? "",
        learning_outcomes: dto.learning_outcomes ?? [],
        target_audience: dto.target_audience ?? [],
        duration_weeks: dto.duration_weeks ?? 12,
        passing_score: dto.passing_score ?? 70,
        registration_validity_days: dto.registration_validity_days ?? 365,
        retake_window_days: dto.retake_window_days ?? 60,
        sort_order: dto.sort_order ?? 99,
      },
    });
  }

  async findFeaturedCertifications() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.slug, c.acronym, c.title, c.level::text, c.status::text,
             c.badge_icon, c.price, c.description, c.sort_order, c.is_flagship,
             c.marketing_meta
      FROM lms.certifications c
      WHERE c.status IN ('active', 'coming_soon') AND c.is_featured = true
      ORDER BY c.sort_order ASC
    `);
  }

  // Persists the exact display order for the homepage's Featured
  // Certifications carousel — `sort_order` previously defaulted to the same
  // value (99) for every certification, so ties fell back to whatever
  // arbitrary order Postgres happened to return, which could silently
  // change after any unrelated update. Sequential values here make it
  // deterministic and admin-controlled.
  async adminReorderFeaturedCertifications(orderedIds: string[]) {
    await this.prisma.$transaction(
      orderedIds.map((id, i) =>
        this.prisma.certification.update({ where: { id }, data: { sort_order: i } }),
      ),
    );
    return { message: "Order updated" };
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
    // Module/Lesson cascade at the DB level below, which would silently skip
    // R2 cleanup (that only happens in the per-module/per-lesson delete
    // methods) — clean up every lesson under this certification first.
    const lessons = await this.prisma.lesson.findMany({
      where: { module: { certification_id: certId } },
      select: { content_body: true, external_url: true },
    });
    await Promise.all(lessons.map((l) => this.uploads.cleanupLessonStorage(l)));

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
