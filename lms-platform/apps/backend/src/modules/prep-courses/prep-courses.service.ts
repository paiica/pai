import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from "@nestjs/common";
// ─── Types ───────────────────────────────────────────────────────────────────
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MailService } from "../mail/mail.service";
import { SubmitAssignmentDto } from "../learning/dto/submit-assignment.dto";
import { GradeSubmissionDto } from "../courses/dto/grade-submission.dto";
import { CompleteLessonDto } from "../learning/dto/complete-lesson.dto";
import { UpdateProgressDto } from "../learning/dto/update-progress.dto";
import { ContentImportService } from "../content-import/content-import.service";
import { UploadsService } from "../uploads/uploads.service";
import { AiService } from "../ai/ai.service";
import { ProgramsService } from "../programs/programs.service";
import { renderBlockItems, wrapLessonContent, ImportPlan, stripHtmlExcerpt } from "../content-import/rise-html-blocks";
import { localize, localizeMany } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

@Injectable()
export class PrepCoursesService {
  private readonly logger = new Logger(PrepCoursesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private mail: MailService,
    private contentImport: ContentImportService,
    private uploads: UploadsService,
    private aiService: AiService,
    private programs: ProgramsService,
    private translationsService: TranslationsService,
  ) {}

  // ─── Auth helpers ────────────────────────────────────────────────────

  async assertTeacherAccess(courseId: string, userId: string, role: Role) {
    if (role === Role.super_admin || role === Role.admin) return;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.course_teachers WHERE course_id = $1 AND user_id = $2`,
      courseId, userId,
    );
    if (!rows.length) throw new ForbiddenException("You are not assigned to this course");
  }

  async assertModuleCourseAccess(moduleId: string, userId: string, role: Role) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT course_id FROM lms.modules WHERE id = $1 AND course_id IS NOT NULL`,
      moduleId,
    );
    if (!rows.length) throw new NotFoundException("Module not found");
    await this.assertTeacherAccess(rows[0].course_id, userId, role);
  }

  async assertLessonCourseAccess(lessonId: string, userId: string, role: Role) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT m.course_id, l.module_id FROM lms.lessons l JOIN lms.modules m ON m.id = l.module_id WHERE l.id = $1 AND m.course_id IS NOT NULL`,
      lessonId,
    );
    if (!rows.length) throw new NotFoundException("Lesson not found");
    await this.assertTeacherAccess(rows[0].course_id, userId, role);
    return { course_id: rows[0].course_id as string, module_id: rows[0].module_id as string };
  }

  // ─── Student learn view ──────────────────────────────────────────────

  async getCourseLearnView(enrollmentId: string, userId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT ce.id, ce.course_id, ce.progress_percentage, ce.enrolled_at,
             c.title, c.slug, c.description, c.thumbnail_url, c.level, c.duration_hours,
             c.ai_professor_enabled,
             cert.acronym AS cert_acronym, cert.title AS cert_title
      FROM lms.course_enrollments ce
      JOIN lms.courses c ON c.id = ce.course_id
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE ce.id = $1 AND ce.user_id = $2
    `, enrollmentId, userId);
    if (!rows.length) throw new ForbiddenException('Enrollment not found');
    const enrollment = rows[0];

    const modules = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT m.id, m.title, m.description, m.sort_order::int,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', l.id, 'title', l.title, 'type', l.type::text,
            'duration_minutes', l.duration_minutes::int,
            'is_free_preview', l.is_free_preview::bool,
            'sort_order', l.sort_order::int
          ) ORDER BY l.sort_order)
          FROM lms.lessons l WHERE l.module_id = m.id AND l.is_published = true AND l.visible_in_structure = true
        ), '[]'::json) AS lessons
      FROM lms.modules m
      WHERE m.course_id = $1 AND m.is_published = true
      ORDER BY m.sort_order ASC
    `, enrollment.course_id);

    // If this course is bundled into a Program the student is enrolled in
    // (most commonly a capstone/internship course), surface that so the
    // player can show a "back to program" link instead of "My Courses" —
    // otherwise a student working through it has no way back to the
    // program dashboard.
    const programEnrollment = await this.prisma.programEnrollment.findFirst({
      where: { user_id: userId, program: { courses: { some: { course_id: enrollment.course_id } } } },
      select: { program: { select: { id: true, title: true } } },
    });

    return { ...enrollment, modules, program: programEnrollment?.program ?? null };
  }

  async getCourseLessonContent(enrollmentId: string, lessonId: string, userId: string) {
    const enrollRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT course_id FROM lms.course_enrollments WHERE id = $1 AND user_id = $2
    `, enrollmentId, userId);
    if (!enrollRows.length) throw new ForbiddenException('Enrollment not found');

    const lessonRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT l.id, l.title, l.description, l.type::text AS type, l.content_body, l.video_url,
             l.download_url, l.allow_download, l.external_url, l.blocks_json, l.lab_cells_json,
             l.duration_minutes::int, l.passing_score::int, l.max_attempts::int,
             l.max_score::int, l.due_date, l.allow_text_response, l.text_word_limit::int,
             l.available_from, l.accept_submissions, l.allow_late_submissions,
             l.late_submission_deadline, l.late_penalty_type, l.late_penalty_value,
             l.allow_file_upload, l.max_files::int, l.accepted_file_types,
             l.max_file_size_mb::int, l.rubric_json,
             m.id AS module_id, m.title AS module_title, m.sort_order::int AS module_order
      FROM lms.lessons l
      JOIN lms.modules m ON m.id = l.module_id
      WHERE l.id = $1 AND m.course_id = $2 AND l.is_published = true
    `, lessonId, enrollRows[0].course_id);
    if (!lessonRows.length) throw new NotFoundException('Lesson not found');
    const lesson = lessonRows[0];

    // Every lesson type can carry supplementary resources (e.g. the
    // hands-on-notebook links added alongside reading lessons), not just
    // assignments — previously scoped to assignment-only, which silently
    // hid them everywhere else.
    lesson.resources = await this.prisma.lessonResource.findMany({
      where: { lesson_id: lessonId },
      orderBy: { sort_order: "asc" },
    });

    if (lesson.type === 'quiz') {
      lesson.questions = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT id, question_text, question_type::text, options,
               correct_index::int, explanation, points::int, sort_order::int
        FROM lms.quiz_questions
        WHERE lesson_id = $1
        ORDER BY sort_order ASC
      `, lessonId);
    }

    if (lesson.type === 'assignment') {
      const attempts = await this.prisma.assignmentSubmission.findMany({
        where: { lesson_id: lessonId, user_id: userId },
        include: { files: true },
        orderBy: { attempt_number: "asc" },
      });
      lesson.submission = attempts.find((a) => a.is_latest) ?? null;
      lesson.submission_attempts = attempts;
    }

    // Sent along so the reader can resolve a `data-sublesson-link` click
    // without a second round trip — see getCourseSublessonContent below.
    lesson.sublessons = await this.prisma.lesson.findMany({
      where: { parent_lesson_id: lessonId },
      orderBy: { sort_order: "asc" },
      select: { id: true, title: true, sublesson_kind: true, available_via_link: true, open_behavior: true },
    });

    return lesson;
  }

  // A Sublesson isn't independently enrolled in — access is inherited
  // entirely from its PARENT lesson. Records a view (LessonProgress row,
  // not a completion) when track_views is on — see the identical method in
  // learning.service.ts (certification track) for the full rationale.
  async getCourseSublessonContent(enrollmentId: string, parentLessonId: string, sublessonId: string, userId: string) {
    await this.getCourseLessonContent(enrollmentId, parentLessonId, userId);

    const sublesson = await this.prisma.lesson.findFirst({
      where: { id: sublessonId, parent_lesson_id: parentLessonId },
      include: { resources: true },
    });
    if (!sublesson) throw new NotFoundException("Sublesson not found");
    if (!sublesson.available_via_link) throw new ForbiddenException("This sublesson isn't available");

    if (sublesson.track_views) {
      const existing = await this.prisma.lessonProgress.findUnique({
        where: { user_id_lesson_id: { user_id: userId, lesson_id: sublessonId } },
      });
      if (!existing) {
        await this.prisma.lessonProgress.create({
          data: { user_id: userId, course_enrollment_id: enrollmentId, lesson_id: sublessonId, completed: false },
        });
      }
    }

    return { sublesson, parent_lesson_id: parentLessonId };
  }

  // ─── Progress (student) ───────────────────────────────────────────────

  private async assertCourseEnrollment(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
    });
    if (!enrollment) throw new ForbiddenException("Enrollment not found");
    return enrollment;
  }

  async updateCourseLessonProgress(enrollmentId: string, lessonId: string, userId: string, dto: UpdateProgressDto) {
    await this.assertCourseEnrollment(enrollmentId, userId);
    return this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        course_enrollment_id: enrollmentId,
        lesson_id: lessonId,
        watch_seconds: dto.watch_seconds ?? 0,
        last_position: dto.last_position ?? 0,
      },
      update: {
        watch_seconds: dto.watch_seconds,
        last_position: dto.last_position,
        updated_at: new Date(),
      },
    });
  }

  // Sublesson completion is optional by default — this only blocks
  // completing the PARENT lesson when it has sublessons explicitly marked
  // sublesson_required, until the student has opened each one (any
  // LessonProgress row, not necessarily completed). See the identical
  // helper in learning.service.ts (certification track) for the full
  // rationale.
  private async assertRequiredSublessonsViewed(lessonId: string, userId: string) {
    const required = await this.prisma.lesson.findMany({
      where: { parent_lesson_id: lessonId, sublesson_required: true },
      select: { id: true, title: true },
    });
    if (!required.length) return;
    const viewed = await this.prisma.lessonProgress.findMany({
      where: { user_id: userId, lesson_id: { in: required.map((s) => s.id) } },
      select: { lesson_id: true },
    });
    const viewedIds = new Set(viewed.map((v) => v.lesson_id));
    const missing = required.filter((s) => !viewedIds.has(s.id));
    if (missing.length) {
      throw new BadRequestException(
        `View ${missing.map((s) => `"${s.title}"`).join(", ")} before completing this lesson.`,
      );
    }
  }

  async completeCourseLesson(enrollmentId: string, lessonId: string, userId: string, dto: CompleteLessonDto) {
    await this.assertCourseEnrollment(enrollmentId, userId);
    await this.assertRequiredSublessonsViewed(lessonId, userId);

    const progress = await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        course_enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date(),
        watch_seconds: dto.watch_seconds ?? 0,
        last_position: dto.last_position ?? 0,
      },
      update: {
        completed: true,
        completed_at: new Date(),
        watch_seconds: dto.watch_seconds,
        last_position: dto.last_position,
        updated_at: new Date(),
      },
    });

    await this.recalculateCourseProgress(enrollmentId);
    return progress;
  }

  async updateCourseScormProgress(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    dto: { completed: boolean; score?: number; cmi_snapshot: any },
  ) {
    await this.assertCourseEnrollment(enrollmentId, userId);

    const progress = await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        course_enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: dto.completed,
        completed_at: dto.completed ? new Date() : undefined,
        quiz_score: dto.score,
        scorm_data: dto.cmi_snapshot,
      },
      update: {
        completed: dto.completed,
        completed_at: dto.completed ? new Date() : undefined,
        quiz_score: dto.score,
        scorm_data: dto.cmi_snapshot,
        updated_at: new Date(),
      },
    });

    if (dto.completed) await this.recalculateCourseProgress(enrollmentId);
    return progress;
  }

  // ─── Notes ────────────────────────────────────────────────────────────
  // A student's private per-lesson notes — one row per user+lesson, never
  // visible to instructors/admins. Shares the LessonNote table with the
  // certification-track player (learning.service.ts).

  async getCourseNote(enrollmentId: string, lessonId: string, userId: string) {
    await this.assertCourseEnrollment(enrollmentId, userId);
    const note = await this.prisma.lessonNote.findUnique({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    });
    return { content: note?.content ?? "" };
  }

  async upsertCourseNote(enrollmentId: string, lessonId: string, userId: string, content: string) {
    await this.assertCourseEnrollment(enrollmentId, userId);
    const note = await this.prisma.lessonNote.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: { user_id: userId, lesson_id: lessonId, content },
      update: { content },
    });
    return { content: note.content };
  }

  // ─── AI Professor ─────────────────────────────────────────────────────

  async chatWithCourseAiProfessor(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    dto: { message: string; history?: { role: "user" | "assistant"; content: string }[] },
  ) {
    const enrollRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT ce.course_id, c.title AS course_title, c.ai_professor_enabled
      FROM lms.course_enrollments ce
      JOIN lms.courses c ON c.id = ce.course_id
      WHERE ce.id = $1 AND ce.user_id = $2
    `, enrollmentId, userId);
    if (!enrollRows.length) throw new ForbiddenException("Enrollment not found");
    const enrollment = enrollRows[0];
    if (!enrollment.ai_professor_enabled) {
      throw new BadRequestException("The AI Professor isn't enabled for this course.");
    }

    const lessonRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT l.title, l.content_body
      FROM lms.lessons l
      JOIN lms.modules m ON m.id = l.module_id
      WHERE l.id = $1 AND m.course_id = $2
    `, lessonId, enrollment.course_id);
    if (!lessonRows.length) throw new NotFoundException("Lesson not found");
    const lesson = lessonRows[0];

    return this.aiService.chatWithAiProfessor({
      courseTitle: enrollment.course_title,
      lessonTitle: lesson.title,
      lessonExcerpt: stripHtmlExcerpt(lesson.content_body),
      message: dto.message,
      history: dto.history ?? [],
    });
  }

  private async recalculateCourseProgress(courseEnrollmentId: string) {
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { id: courseEnrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: { where: { is_published: true }, select: { id: true } },
              },
            },
          },
        },
        lesson_progress: { where: { completed: true }, select: { lesson_id: true } },
      },
    });
    if (!enrollment) return;

    const totalLessons = enrollment.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = enrollment.lesson_progress.length;
    const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const justCompleted = pct === 100 && !enrollment.completed_at;
    await this.prisma.courseEnrollment.update({
      where: { id: courseEnrollmentId },
      data: {
        progress_percentage: pct,
        ...(justCompleted ? { completed_at: new Date() } : {}),
      },
    });

    // Cheap no-op for the overwhelming majority of course completions that
    // aren't part of any Program — see ProgramsService.onCourseCompleted.
    // Awaited (not fire-and-forget) so that by the time this call returns,
    // any Program completion it triggers has actually been persisted —
    // callers that immediately re-fetch program/enrollment state right
    // after marking a lesson complete would otherwise see stale data.
    // Wrapped in try/catch so a failure here can't break the student's
    // basic "mark this lesson complete" action.
    if (justCompleted) {
      try {
        await this.programs.onCourseCompleted(enrollment.user_id, enrollment.course_id);
      } catch (err) {
        this.logger.error("onCourseCompleted failed", err);
      }
    }
  }

  // ─── Assignment Submission (student) ──────────────────────────────────

  async submitCourseAssignment(enrollmentId: string, lessonId: string, userId: string, dto: SubmitAssignmentDto) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
    });
    if (!enrollment) throw new ForbiddenException("Enrollment not found");

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: { include: { instructors: true } },
          },
        },
      },
    });
    if (!lesson || lesson.type !== "assignment") throw new BadRequestException("Lesson is not an assignment");
    if (!lesson.module.course_id || lesson.module.course_id !== enrollment.course_id) {
      throw new ForbiddenException("Lesson is not part of your enrollment");
    }

    const allFiles = dto.files?.length ? dto.files : (dto.file_url ? [{ file_url: dto.file_url, file_name: dto.file_name ?? "file", file_size: dto.file_size }] : []);
    if (allFiles.length === 0 && !dto.text_content) {
      throw new BadRequestException("Either file or text content is required");
    }
    if (allFiles.length > 0 && lesson.allow_file_upload === false) {
      throw new BadRequestException("This assignment does not accept file uploads");
    }
    if (dto.text_content && lesson.allow_text_response === false) {
      throw new BadRequestException("This assignment does not accept a text response");
    }
    const maxFiles = lesson.max_files ?? 1;
    if (allFiles.length > maxFiles) {
      throw new BadRequestException(`A maximum of ${maxFiles} file${maxFiles === 1 ? "" : "s"} is allowed for this assignment`);
    }
    if (lesson.accepted_file_types.length > 0) {
      for (const f of allFiles) {
        const ext = "." + (f.file_name.split(".").pop() ?? "").toLowerCase();
        if (!lesson.accepted_file_types.map((t) => t.toLowerCase()).includes(ext)) {
          throw new BadRequestException(`File type ${ext} is not accepted. Allowed: ${lesson.accepted_file_types.join(", ")}`);
        }
      }
    }
    const maxSizeBytes = (lesson.max_file_size_mb ?? 10) * 1024 * 1024;
    for (const f of allFiles) {
      if (f.file_size && f.file_size > maxSizeBytes) {
        throw new BadRequestException(`File "${f.file_name}" exceeds the ${lesson.max_file_size_mb ?? 10}MB limit for this assignment`);
      }
    }

    // ── Availability window + accept-submissions gate ─────────────────────
    const now = new Date();
    if (!lesson.accept_submissions) {
      throw new BadRequestException("Submissions are currently disabled for this assignment");
    }
    if (lesson.available_from && now < lesson.available_from) {
      throw new BadRequestException("This assignment is not yet open for submissions");
    }
    let isLate = false;
    if (lesson.due_date && now > lesson.due_date) {
      if (!lesson.allow_late_submissions) {
        throw new BadRequestException("The submission period for this assignment has closed");
      }
      if (lesson.late_submission_deadline && now > lesson.late_submission_deadline) {
        throw new BadRequestException("The late submission period for this assignment has closed");
      }
      isLate = true;
    }

    // ── Attempt cap (reuses the generic Lesson.max_attempts field also used
    //    by quizzes, rather than a hardcoded/assignment-specific constant) ─
    const priorAttempts = await this.prisma.assignmentSubmission.count({ where: { lesson_id: lessonId, user_id: userId } });
    const maxAttempts = lesson.max_attempts ?? 1;
    if (priorAttempts >= maxAttempts) {
      throw new BadRequestException(`Maximum of ${maxAttempts} submission attempt${maxAttempts === 1 ? "" : "s"} reached.`);
    }

    const primaryFile = allFiles[0];
    const extraFiles = allFiles.slice(1);

    const submission = await this.prisma.$transaction(async (tx) => {
      // Every submit is a NEW attempt row — never overwrites a prior one, so
      // attempt history is preserved (see schema comment on is_latest).
      await tx.assignmentSubmission.updateMany({
        where: { lesson_id: lessonId, user_id: userId, is_latest: true },
        data: { is_latest: false },
      });
      return tx.assignmentSubmission.create({
        data: {
          lesson_id: lessonId,
          user_id: userId,
          course_enrollment_id: enrollmentId,
          file_url: primaryFile?.file_url,
          file_name: primaryFile?.file_name,
          file_size: primaryFile?.file_size,
          text_content: dto.text_content,
          status: "submitted",
          submitted_at: now,
          attempt_count: priorAttempts + 1,
          attempt_number: priorAttempts + 1,
          is_latest: true,
          is_late: isLate,
          files: extraFiles.length ? { createMany: { data: extraFiles.map((f) => ({ file_url: f.file_url, file_name: f.file_name, file_size: f.file_size })) } } : undefined,
        },
      });
    });

    for (const teacher of (lesson.module.course?.instructors ?? [])) {
      await this.notifications.create(
        teacher.user_id,
        "assignment_submitted",
        "New assignment submission",
        `A student submitted "${lesson.title}"${isLate ? " (late)" : ""}`,
        { lesson_id: lessonId, submission_id: submission.id }
      );
    }

    // Submitting an assignment marks its lesson complete — same as every
    // other lesson type (video finishing, reading scrolled, quiz passed).
    // Previously this never happened, so a course made solely of an
    // assignment (e.g. a program's capstone/internship course) could never
    // reach 100% progress. Grading is a separate, advisory feedback loop —
    // it doesn't gate completion, matching how this app has no pass/fail
    // concept for course progress generally (only certifications do, via
    // their own proctored exam).
    await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: { user_id: userId, course_enrollment_id: enrollmentId, lesson_id: lessonId, completed: true, completed_at: new Date() },
      update: { completed: true, completed_at: new Date(), updated_at: new Date() },
    });
    await this.recalculateCourseProgress(enrollmentId);

    return submission;
  }

  // ─── My Assignments (student) ─────────────────────────────────────────

  async getMyCourseAssignments(userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { user_id: userId },
      select: { id: true, course_id: true },
    });
    const courseIds = enrollments.map((e) => e.course_id);
    if (!courseIds.length) return [];

    const assignmentLessons = await this.prisma.lesson.findMany({
      where: {
        type: "assignment",
        is_published: true,
        module: { course_id: { in: courseIds } },
      },
      include: {
        module: {
          select: {
            course_id: true,
            course: { select: { title: true, certification: { select: { acronym: true, title: true } } } },
          },
        },
        assignment_submissions: { where: { user_id: userId } },
      },
    });

    return assignmentLessons.map((lesson) => ({
      lesson_id: lesson.id,
      title: lesson.title,
      due_date: lesson.due_date,
      max_score: lesson.max_score,
      certification: {
        acronym: lesson.module.course?.certification?.acronym ?? lesson.module.course?.title,
        title: lesson.module.course?.certification?.title ?? lesson.module.course?.title,
      },
      submission: lesson.assignment_submissions[0] ?? null,
    }));
  }

  // ─── My Course Grades (every course enrollment — certification-required
  // or fully standalone — not just courses tied to one certification) ────
  // Mirrors LearningService's transcript-style per-course grade averaging
  // (latest-attempt AssignmentSubmission.grade only, is_latest: true) but
  // rooted at CourseEnrollment directly instead of a certification
  // Enrollment, so a purchased-standalone course (no CourseCertRecommendation
  // at all) still gets a grade breakdown and completion certificate.

  private async computeCourseGradeItems(userId: string, courseId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { type: { in: ["quiz", "assignment"] }, is_published: true, module: { course_id: courseId } },
      select: { id: true, title: true, type: true, max_score: true, passing_score: true },
    });
    if (!lessons.length) return { items: [] as any[], grade_percentage: null as number | null };

    const lessonIds = lessons.map((l) => l.id);
    const [quizProgress, assignmentSubs] = await Promise.all([
      this.prisma.lessonProgress.findMany({ where: { user_id: userId, lesson_id: { in: lessonIds }, quiz_score: { not: null } } }),
      this.prisma.assignmentSubmission.findMany({ where: { user_id: userId, lesson_id: { in: lessonIds }, grade: { not: null }, is_latest: true } }),
    ]);
    const quizScores = new Map(quizProgress.map((p) => [p.lesson_id, p.quiz_score!]));
    const assignmentGrades = new Map(assignmentSubs.map((s) => [s.lesson_id, { grade: s.grade!, max_grade: s.max_grade, feedback: s.feedback }]));

    const items = lessons.map((l) => ({
      lesson_id: l.id,
      course_id: courseId,
      title: l.title,
      type: l.type,
      max_score: l.max_score,
      passing_score: l.passing_score,
      ...(l.type === "quiz"
        ? { score: quizScores.get(l.id) ?? null, passed: quizScores.has(l.id) ? quizScores.get(l.id)! >= (l.passing_score ?? 70) : null }
        : { grade: assignmentGrades.get(l.id)?.grade ?? null, feedback: assignmentGrades.get(l.id)?.feedback ?? null }
      ),
    }));

    const percentages = assignmentSubs.map((s) => (s.grade! / s.max_grade) * 100);
    const grade_percentage = percentages.length
      ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 10) / 10
      : null;

    return { items, grade_percentage };
  }

  async getMyCourseGrades(userId: string) {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { user_id: userId },
      include: { course: { select: { id: true, title: true, slug: true, passing_score: true } } },
      orderBy: { enrolled_at: "desc" },
    });
    if (!enrollments.length) return [];

    const courseIds = enrollments.map((e) => e.course_id);
    const [moduleCounts, certLinks] = await Promise.all([
      this.prisma.module.groupBy({ by: ["course_id"], where: { course_id: { in: courseIds } }, _count: { _all: true } }),
      this.prisma.courseCertRecommendation.findMany({
        where: { course_id: { in: courseIds }, is_required: true },
        include: { certification: { select: { id: true, acronym: true, title: true } } },
      }),
    ]);
    const moduleCountByCourse = new Map(moduleCounts.map((m) => [m.course_id, m._count._all]));
    const certsByCourse = new Map<string, { id: string; acronym: string; title: string }[]>();
    for (const link of certLinks) {
      if (!certsByCourse.has(link.course_id)) certsByCourse.set(link.course_id, []);
      certsByCourse.get(link.course_id)!.push(link.certification);
    }

    return Promise.all(enrollments.map(async (e) => {
      const { items, grade_percentage } = await this.computeCourseGradeItems(userId, e.course_id);
      const passingScore = e.course.passing_score ?? 70;
      const passed = !!e.completed_at && (grade_percentage == null || grade_percentage >= passingScore);
      return {
        course_id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        module_count: moduleCountByCourse.get(e.course_id) ?? 0,
        completed_at: e.completed_at,
        grade_percentage,
        passing_score: passingScore,
        passed,
        certifications: certsByCourse.get(e.course_id) ?? [],
        graded_items: items,
      };
    }));
  }

  async getMyCourseCertificate(userId: string, courseId: string) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { user_id: userId, course_id: courseId },
      include: { course: { select: { title: true, slug: true, passing_score: true } }, user: { include: { profile: true } } },
    });
    if (!enrollment) throw new NotFoundException("You are not enrolled in this course");

    const { grade_percentage } = await this.computeCourseGradeItems(userId, courseId);
    const passingScore = enrollment.course.passing_score ?? 70;
    const passed = !!enrollment.completed_at && (grade_percentage == null || grade_percentage >= passingScore);
    if (!passed) throw new ForbiddenException("You haven't earned a completion certificate for this course yet");

    const certLinks = await this.prisma.courseCertRecommendation.findMany({
      where: { course_id: courseId, is_required: true },
      include: { certification: { select: { acronym: true, title: true } } },
    });

    const studentName = enrollment.user.profile
      ? `${enrollment.user.profile.first_name ?? ""} ${enrollment.user.profile.last_name ?? ""}`.trim() || enrollment.user.email
      : enrollment.user.email;

    return {
      student_name: studentName,
      course_title: enrollment.course.title,
      course_slug: enrollment.course.slug,
      completed_at: enrollment.completed_at,
      grade_percentage,
      passing_score: passingScore,
      certifications: certLinks.map((l) => l.certification),
    };
  }

  // ─── Students & Submissions (professor) ───────────────────────────────

  async getCourseStudents(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.prisma.courseEnrollment.findMany({
      where: { course_id: courseId },
      include: {
        user: {
          select: { id: true, email: true, last_login_at: true, profile: { select: { first_name: true, last_name: true, avatar_url: true, display_name: true, phone: true, country: true } } },
        },
        _count: { select: { lesson_progress: { where: { completed: true } }, assignment_submissions: true } },
      },
      orderBy: { enrolled_at: "desc" },
    });
  }

  // Default gradebook view — one row per student (their latest attempt).
  // Full attempt history is available via getSubmissionAttempts().
  async getCourseSubmissions(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.prisma.assignmentSubmission.findMany({
      where: {
        lesson: { module: { course_id: courseId } },
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
    if (!lesson || !lesson.module.course_id) throw new NotFoundException("Lesson not found");
    await this.assertTeacherAccess(lesson.module.course_id, requesterId, role);
    return this.prisma.assignmentSubmission.findMany({
      where: { lesson_id: lessonId, user_id: studentUserId },
      include: { files: true },
      orderBy: { attempt_number: "asc" },
    });
  }

  async gradeCourseSubmission(submissionId: string, dto: GradeSubmissionDto, graderId: string, role: Role) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { lesson: { include: { module: true } } },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    if (!submission.lesson.module.course_id) throw new NotFoundException("Submission not found");
    await this.assertTeacherAccess(submission.lesson.module.course_id, graderId, role);

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

    await this.notifications.create(
      submission.user_id,
      "assignment_graded",
      "Assignment graded",
      `Your submission for "${submission.lesson.title}" has been graded: ${dto.grade}/${submission.max_grade}`,
      { lesson_id: submission.lesson_id, submission_id: submission.id },
    );

    return graded;
  }

  // ─── Recommendations (course ↔ cert, many-to-many) ───────────────────

  async adminGetRecommendations(courseId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT r.certification_id, r.is_required, r.is_free, cert.title, cert.acronym, cert.slug
      FROM lms.course_cert_recommendations r
      JOIN lms.certifications cert ON cert.id = r.certification_id
      WHERE r.course_id = $1
      ORDER BY cert.title
    `, courseId);
  }

  async adminSetRecommendations(courseId: string, items: { certification_id: string; is_required?: boolean; is_free?: boolean }[]) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_cert_recommendations WHERE course_id = $1`, courseId
    );
    for (const item of items) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO lms.course_cert_recommendations (course_id, certification_id, is_required, is_free)
         VALUES ($1, $2, $3::boolean, $4::boolean) ON CONFLICT DO NOTHING`,
        courseId, item.certification_id, item.is_required ?? false, (item.is_required && item.is_free) ?? false,
      );
    }
    return this.adminGetRecommendations(courseId);
  }

  // ─── Certification-side course picker (reverse of the above) ─────────
  // Powers the certification editor's "Prep Courses" section — every
  // active course, flagged with whether it's linked to this certification
  // and whether it's required (vs. merely related/recommended).

  async adminGetCoursesForCertification(certificationId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.title, c.slug,
             (r.course_id IS NOT NULL) AS is_selected,
             COALESCE(r.is_required, false) AS is_required,
             COALESCE(r.is_free, false) AS is_free
      FROM lms.courses c
      LEFT JOIN lms.course_cert_recommendations r
        ON r.course_id = c.id AND r.certification_id = $1
      WHERE c.status = 'active'
      ORDER BY c.title
    `, certificationId);
  }

  async adminSetCoursesForCertification(certificationId: string, items: { course_id: string; is_required?: boolean; is_free?: boolean }[]) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_cert_recommendations WHERE certification_id = $1`, certificationId
    );
    for (const item of items) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO lms.course_cert_recommendations (course_id, certification_id, is_required, is_free)
         VALUES ($1, $2, $3::boolean, $4::boolean) ON CONFLICT DO NOTHING`,
        item.course_id, certificationId, item.is_required ?? false, (item.is_required && item.is_free) ?? false,
      );
    }
    return this.adminGetCoursesForCertification(certificationId);
  }

  // ─── Prerequisites / Co-requisites (course ↔ course, self-referential) ─

  async adminGetPrerequisites(courseId: string) {
    return this.prisma.coursePrerequisite.findMany({
      where: { course_id: courseId },
      include: { prerequisite_course: { select: { id: true, title: true, slug: true } } },
      orderBy: { prerequisite_course: { title: "asc" } },
    });
  }

  async adminSetPrerequisites(courseId: string, items: { course_id: string; type: "prerequisite" | "corequisite" }[]) {
    await this.prisma.coursePrerequisite.deleteMany({ where: { course_id: courseId } });
    const filtered = items.filter((i) => i.course_id !== courseId);
    if (filtered.length) {
      await this.prisma.coursePrerequisite.createMany({
        data: filtered.map((i) => ({ course_id: courseId, prerequisite_course_id: i.course_id, type: i.type })),
        skipDuplicates: true,
      });
    }
    return this.adminGetPrerequisites(courseId);
  }

  async profGetPrerequisites(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminGetPrerequisites(courseId);
  }

  async profSetPrerequisites(courseId: string, items: { course_id: string; type: "prerequisite" | "corequisite" }[], userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminSetPrerequisites(courseId, items);
  }

  // ─── Gating: prerequisites must be completed before enrolling ────────

  async assertPrerequisitesMet(userId: string, courseId: string) {
    const prereqs = await this.prisma.coursePrerequisite.findMany({
      where: { course_id: courseId, type: "prerequisite" },
      include: { prerequisite_course: { select: { id: true, title: true } } },
    });
    if (!prereqs.length) return;

    const missing: string[] = [];
    for (const p of prereqs) {
      const done = await this.prisma.courseEnrollment.findFirst({
        where: { user_id: userId, course_id: p.prerequisite_course_id, completed_at: { not: null } },
      });
      if (!done) missing.push(p.prerequisite_course.title);
    }
    if (missing.length) {
      throw new BadRequestException(`Complete the following prerequisite course(s) first: ${missing.join(", ")}`);
    }
  }

  // ─── Gating: required courses must be completed before the exam ──────

  async getIncompleteRequiredCourses(userId: string, certificationId: string, enrollmentId: string): Promise<string[]> {
    // "Required" is exactly the admin's "Required for exam" checkbox on the
    // certification's Prep Courses tab (course_cert_recommendations.is_required)
    // — not whether the course also happens to have a direct
    // Course.certification_id link, which is a separate, unrelated
    // association.
    const required = await this.prisma.courseCertRecommendation.findMany({
      where: { certification_id: certificationId, is_required: true },
      include: { course: { select: { id: true, title: true } } },
    });
    if (!required.length) return [];

    // Admin-granted, per-student per-course exemptions — see
    // EnrollmentCourseWaiver. A waived course is treated as satisfied
    // regardless of its actual purchase/completion state.
    const waivers = await this.prisma.enrollmentCourseWaiver.findMany({
      where: { enrollment_id: enrollmentId },
      select: { course_id: true },
    });
    const waivedCourseIds = new Set(waivers.map((w) => w.course_id));

    const missing: string[] = [];
    for (const r of required) {
      if (waivedCourseIds.has(r.course_id)) continue;
      let done: boolean;
      if (r.is_free) {
        // Free required course — bundled into the certification's own
        // player, so completion is tracked via LessonProgress against this
        // certification enrollment, not a separate CourseEnrollment (there
        // isn't one — nothing was ever purchased).
        const [totalLessons, completedLessons] = await Promise.all([
          this.prisma.lesson.count({ where: { module: { course_id: r.course_id }, is_published: true } }),
          this.prisma.lessonProgress.count({
            where: {
              enrollment_id: enrollmentId, user_id: userId, completed: true,
              lesson: { module: { course_id: r.course_id } },
            },
          }),
        ]);
        done = totalLessons > 0 && completedLessons >= totalLessons;
      } else {
        // Paid required course — real purchase, own CourseEnrollment.
        done = !!(await this.prisma.courseEnrollment.findFirst({
          where: { user_id: userId, course_id: r.course_id, completed_at: { not: null } },
        }));
      }
      if (!done) missing.push(r.course.title);
    }
    return missing;
  }

  // Every course the admin has selected on this certification's Prep
  // Courses tab (course_cert_recommendations), required or not — whether or
  // not that course also happens to have an unrelated direct
  // Course.certification_id link. is_required here is the single source of
  // truth for the "Required"/"Recommended" distinction shown to students.
  async getRecommendedCoursesByCert(certificationId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.title, c.slug, c.subtitle, c.description, c.price::text, c.level,
             c.duration_hours::text, c.thumbnail_url, c.status,
             cert.acronym AS cert_acronym, cert.title AS cert_title,
             r.is_required, r.is_free,
             (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count
      FROM lms.course_cert_recommendations r
      JOIN lms.courses c ON c.id = r.course_id AND c.status = 'active'
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE r.certification_id = $1
      ORDER BY r.is_required DESC, c.title
    `, certificationId);
  }

  // A student's course-purchase discount from holding a certification —
  // takes the best (highest percentage) among every certification they hold
  // an unrevoked Certificate for, never stacks multiple. Certificate status
  // "revoked"/"suspended" doesn't count as holding it; "expired"/"lapsed"
  // still does, since they did earn it.
  async getMemberDiscount(userId: string): Promise<{ percentage: number; certification: { id: string; acronym: string; title: string } | null }> {
    const certs = await this.prisma.certificate.findMany({
      where: { user_id: userId, status: { notIn: ["revoked", "suspended"] } },
      include: { certification: { select: { id: true, acronym: true, title: true, member_discount_percentage: true } } },
    });
    let best: { id: string; acronym: string; title: string; member_discount_percentage: number } | null = null;
    for (const c of certs) {
      if (c.certification.member_discount_percentage > (best?.member_discount_percentage ?? 0)) {
        best = c.certification;
      }
    }
    if (!best || best.member_discount_percentage <= 0) return { percentage: 0, certification: null };
    return {
      percentage: best.member_discount_percentage,
      certification: { id: best.id, acronym: best.acronym, title: best.title },
    };
  }

  // ─── Public ──────────────────────────────────────────────────────────

  async getMyEnrollments(userId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT ce.*, c.title, c.slug, c.subtitle, c.thumbnail_url, c.level, c.duration_hours,
        cert.acronym AS cert_acronym, cert.title AS cert_title
      FROM lms.course_enrollments ce
      JOIN lms.courses c ON c.id = ce.course_id
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE ce.user_id = $1
      ORDER BY ce.enrolled_at DESC
    `, userId);
  }

  // Every course the student has access to, not just ones with their own
  // CourseEnrollment row: free required courses bundled into a certification
  // merge their lessons directly into that certification's player (see
  // getCourseOutline in learning.service.ts), so they never get a
  // CourseEnrollment of their own — their progress lives on the
  // certification Enrollment's lesson_progress instead. This stitches both
  // sources together for a single "all my courses" view.
  async getMyAllCourses(userId: string) {
    const direct = await this.getMyEnrollments(userId);

    const bundled = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        'bundled-' || e.id || '-' || c.id AS id,
        c.id AS course_id,
        e.enrolled_at,
        c.title, c.slug, c.subtitle, c.thumbnail_url, c.level, c.duration_hours,
        cert.acronym AS cert_acronym, cert.title AS cert_title,
        e.id AS cert_enrollment_id,
        (
          SELECT COUNT(*) FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          WHERE m.course_id = c.id AND l.is_published = true
        )::int AS total_lessons,
        (
          SELECT COUNT(*) FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          JOIN lms.lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id AND lp.completed = true
          WHERE m.course_id = c.id AND l.is_published = true
        )::int AS completed_lessons,
        (
          SELECT MAX(lp.completed_at) FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          JOIN lms.lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = e.id AND lp.completed = true
          WHERE m.course_id = c.id AND l.is_published = true
        ) AS last_completed_at,
        (
          -- First not-yet-completed lesson, in curriculum order — where
          -- "Continue" for this specific bundled course should resume.
          SELECT l.id FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          WHERE m.course_id = c.id AND l.is_published = true
            AND NOT EXISTS (
              SELECT 1 FROM lms.lesson_progress lp
              WHERE lp.lesson_id = l.id AND lp.enrollment_id = e.id AND lp.completed = true
            )
          ORDER BY m.sort_order ASC, l.sort_order ASC
          LIMIT 1
        ) AS next_lesson_id,
        (
          -- Fallback for when every lesson is already complete — still land
          -- somewhere real (the start) instead of nowhere.
          SELECT l.id FROM lms.lessons l
          JOIN lms.modules m ON m.id = l.module_id
          WHERE m.course_id = c.id AND l.is_published = true
          ORDER BY m.sort_order ASC, l.sort_order ASC
          LIMIT 1
        ) AS first_lesson_id
      FROM lms.enrollments e
      JOIN lms.certifications cert ON cert.id = e.certification_id
      JOIN lms.course_cert_recommendations ccr
        ON ccr.certification_id = e.certification_id AND ccr.is_required = true AND ccr.is_free = true
      JOIN lms.courses c ON c.id = ccr.course_id
      WHERE e.user_id = $1 AND e.status = 'active' AND c.status = 'active'
      ORDER BY e.enrolled_at DESC
    `, userId);

    const directCourseIds = new Set(direct.map((d) => d.course_id));
    const bundledMapped = bundled
      .filter((b) => !directCourseIds.has(b.course_id)) // a course purchased directly takes precedence over a free-bundle row for the same course
      .map((b) => {
        const total = b.total_lessons ?? 0;
        const completedCount = b.completed_lessons ?? 0;
        const progress_percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        return {
          id: b.id,
          course_id: b.course_id,
          enrolled_at: b.enrolled_at,
          title: b.title, slug: b.slug, subtitle: b.subtitle,
          thumbnail_url: b.thumbnail_url, level: b.level, duration_hours: b.duration_hours,
          cert_acronym: b.cert_acronym, cert_title: b.cert_title,
          progress_percentage,
          completed_at: progress_percentage === 100 ? b.last_completed_at : null,
          source: "certification" as const,
          cert_enrollment_id: b.cert_enrollment_id,
          resume_lesson_id: b.next_lesson_id ?? b.first_lesson_id ?? null,
        };
      });

    const directMapped = direct.map((d) => ({ ...d, source: "direct" as const }));

    return [...directMapped, ...bundledMapped].sort(
      (a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime(),
    );
  }

  async findAll(lang?: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*,
        cert.acronym AS cert_acronym, cert.title AS cert_title, cert.slug AS cert_slug,
        (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count,
        (SELECT COUNT(*) FROM lms.course_enrollments e WHERE e.course_id = c.id)::int AS enrollment_count,
        (
          SELECT json_agg(json_build_object(
            'user_id', ct.user_id, 'is_lead', ct.is_lead,
            'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url
          ))
          FROM lms.course_teachers ct JOIN lms.profiles p ON p.user_id = ct.user_id
          WHERE ct.course_id = c.id
        ) AS instructors
      FROM lms.courses c
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE c.status = 'active' AND c.is_listed = true
      ORDER BY c.sort_order ASC, c.created_at DESC
    `);
    return localizeMany(rows, lang, ["title", "subtitle", "description"]);
  }

  async findFeatured(lang?: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.slug, c.title, c.subtitle, c.description, c.price, c.compare_at_price, c.level,
             c.duration_hours, c.thumbnail_url, c.is_featured,
             c.title_ar, c.subtitle_ar, c.description_ar,
             (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count,
             cert.acronym AS cert_acronym, cert.title AS cert_title
      FROM lms.courses c
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE c.status = 'active' AND c.is_featured = true AND c.is_listed = true
      ORDER BY c.sort_order ASC, c.created_at DESC
    `);
    return localizeMany(rows, lang, ["title", "subtitle", "description"]);
  }

  async findBySlug(slug: string, userId?: string, role?: Role, lang?: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*,
        c.price::float AS price,
        c.duration_hours::float AS duration_hours,
        cert.acronym AS cert_acronym, cert.title AS cert_title, cert.slug AS cert_slug,
        (
          SELECT json_agg(json_build_object(
            'id', m.id, 'title', m.title, 'sort_order', m.sort_order,
            'is_published', m.is_published,
            'lessons', (
              SELECT json_agg(json_build_object(
                'id', l.id, 'title', l.title, 'type', l.type,
                'duration_minutes', l.duration_minutes, 'is_free_preview', l.is_free_preview,
                'is_published', l.is_published
              ) ORDER BY l.sort_order)
              FROM lms.lessons l WHERE l.module_id = m.id AND l.is_published = true AND l.visible_in_structure = true
            )
          ) ORDER BY m.sort_order)
          FROM lms.modules m WHERE m.course_id = c.id AND m.is_published = true
        ) AS modules,
        (
          SELECT json_agg(json_build_object(
            'user_id', ct.user_id, 'is_lead', ct.is_lead,
            'first_name', p.first_name, 'last_name', p.last_name,
            'avatar_url', p.avatar_url, 'bio', p.bio,
            'job_title', p.job_title, 'company', p.company,
            'years_experience', p.years_experience,
            'education_entries', p.education_entries,
            'experience_entries', p.experience_entries
          ))
          FROM lms.course_teachers ct JOIN lms.profiles p ON p.user_id = ct.user_id
          WHERE ct.course_id = c.id
        ) AS instructors,
        (
          SELECT json_agg(json_build_object(
            'id', d.id, 'title', d.title, 'file_url', d.file_url, 'file_name', d.file_name
          ) ORDER BY d.sort_order)
          FROM lms.course_documents d WHERE d.course_id = c.id
        ) AS documents
      FROM lms.courses c
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE c.slug = $1
    `, slug);
    if (!rows.length) throw new NotFoundException("Course not found");
    const course = rows[0];

    if (!course.is_listed) {
      const hasAccess = await this.canViewPrivateCourse(course.id, userId, role);
      if (!hasAccess) throw new NotFoundException("Course not found");
    }
    const localized = localize(course, lang, ["title", "subtitle", "description"]);
    const translatedContent = lang ? (course.translations as any)?.[lang]?.content : undefined;
    if (translatedContent && Object.keys(translatedContent).length) {
      localized.content = { ...(course.content ?? {}), ...translatedContent };
    }
    return localized;
  }

  // Private/unlisted courses are only viewable by an admin, someone who
  // teaches it, a student who's been invited to it (any invitation
  // status — a rejected invitation should still let them look back at what
  // they turned down, they just can't accept it again from here), or a
  // student enrolled in a Program that bundles it (covers capstone/
  // internship courses, which are kept unlisted and scoped to that
  // program's own students — see ProgramCourse.special_type).
  private async canViewPrivateCourse(courseId: string, userId?: string, role?: Role): Promise<boolean> {
    if (!userId) return false;
    if (role === Role.admin || role === Role.super_admin) return true;
    const [teaches, invited, programEnrolled] = await Promise.all([
      this.prisma.courseTeacher.findFirst({ where: { course_id: courseId, user_id: userId }, select: { id: true } }),
      this.prisma.courseInvitation.findFirst({ where: { course_id: courseId, student_id: userId }, select: { id: true } }),
      this.prisma.programEnrollment.findFirst({ where: { user_id: userId, program: { courses: { some: { course_id: courseId } } } }, select: { id: true } }),
    ]);
    return !!teaches || !!invited || !!programEnrolled;
  }

  // ─── Admin ───────────────────────────────────────────────────────────

  async adminGetEnrollments() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        ce.id, ce.user_id, ce.course_id, ce.progress_percentage, ce.enrolled_at, ce.completed_at,
        c.title as course_title,
        u.email,
        p.first_name, p.last_name
      FROM lms.course_enrollments ce
      JOIN lms.courses c ON c.id = ce.course_id
      JOIN lms.users u ON u.id = ce.user_id
      LEFT JOIN lms.profiles p ON p.user_id = u.id
      ORDER BY ce.enrolled_at DESC
    `);
  }

  async adminGetAll() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*,
        c.price::float AS price,
        c.duration_hours::float AS duration_hours,
        cert.acronym AS cert_acronym, cert.title AS cert_title,
        (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count,
        (SELECT COUNT(*) FROM lms.course_enrollments e WHERE e.course_id = c.id)::int AS enrollment_count,
        (
          SELECT json_agg(json_build_object(
            'user_id', ct.user_id, 'is_lead', ct.is_lead,
            'first_name', p.first_name, 'last_name', p.last_name
          ))
          FROM lms.course_teachers ct JOIN lms.profiles p ON p.user_id = ct.user_id
          WHERE ct.course_id = c.id
        ) AS instructors
      FROM lms.courses c
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      ORDER BY c.sort_order ASC, c.created_at DESC
    `);
  }

  async adminApproveCourse(courseId: string, adminUserId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("Course not found");
    if (course.approval_status !== "pending") throw new BadRequestException("This course isn't awaiting review");

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { approval_status: "approved", is_listed: true, reviewed_by: adminUserId, reviewed_at: new Date() },
    });

    if (course.created_by) {
      const creator = await this.prisma.user.findUnique({ where: { id: course.created_by }, select: { email: true, profile: { select: { first_name: true } } } });
      if (creator) {
        this.notifications.create(course.created_by, "course_approved", "Course approved", `"${course.title}" has been approved and is now live in the PAII catalog.`).catch(() => {});
        this.mail.sendCourseApproved({ to: creator.email, firstName: creator.profile?.first_name || "there", courseTitle: course.title }).catch(() => {});
      }
    }
    return updated;
  }

  async adminRejectCourse(courseId: string, adminUserId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException("A reason is required");
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException("Course not found");
    if (course.approval_status !== "pending") throw new BadRequestException("This course isn't awaiting review");

    const updated = await this.prisma.course.update({
      where: { id: courseId },
      data: { approval_status: "rejected", reviewed_by: adminUserId, reviewed_at: new Date(), rejection_reason: reason.trim() },
    });

    if (course.created_by) {
      const creator = await this.prisma.user.findUnique({ where: { id: course.created_by }, select: { email: true, profile: { select: { first_name: true } } } });
      if (creator) {
        this.notifications.create(course.created_by, "course_rejected", "Course needs changes", `"${course.title}" was not approved: ${reason.trim()}`).catch(() => {});
        this.mail.sendCourseRejected({ to: creator.email, firstName: creator.profile?.first_name || "there", courseTitle: course.title, reason: reason.trim() }).catch(() => {});
      }
    }
    return updated;
  }

  async adminGetOne(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*,
        c.price::float AS price,
        c.duration_hours::float AS duration_hours,
        c.pdu_value::float AS pdu_value,
        (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count,
        cert.acronym AS cert_acronym, cert.title AS cert_title, cert.slug AS cert_slug,
        (
          SELECT json_agg(json_build_object(
            'id', m.id, 'title', m.title, 'sort_order', m.sort_order,
            'is_published', m.is_published, 'description', m.description,
            'lessons', (
              SELECT json_agg(json_build_object(
                'id', l.id, 'title', l.title, 'type', l.type,
                'duration_minutes', l.duration_minutes, 'is_published', l.is_published,
                'sort_order', l.sort_order, 'parent_lesson_id', l.parent_lesson_id
              ) ORDER BY l.sort_order)
              FROM lms.lessons l WHERE l.module_id = m.id
            )
          ) ORDER BY m.sort_order)
          FROM lms.modules m WHERE m.course_id = c.id
        ) AS modules,
        (
          SELECT json_agg(json_build_object(
            'user_id', ct.user_id, 'is_lead', ct.is_lead,
            'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url,
            'email', u.email
          ))
          FROM lms.course_teachers ct
          JOIN lms.profiles p ON p.user_id = ct.user_id
          JOIN lms.users u ON u.id = ct.user_id
          WHERE ct.course_id = c.id
        ) AS instructors
      FROM lms.courses c
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE c.id = $1
    `, id);
    if (!rows.length) throw new NotFoundException("Course not found");
    const course = rows[0];
    const recs = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT certification_id, is_required, is_free FROM lms.course_cert_recommendations WHERE course_id = $1`, id
    );
    course.recommended_cert_ids = recs.map((r) => r.certification_id);
    course.required_cert_ids = recs.filter((r) => r.is_required).map((r) => r.certification_id);
    course.free_cert_ids = recs.filter((r) => r.is_required && r.is_free).map((r) => r.certification_id);
    const prereqs = await this.prisma.coursePrerequisite.findMany({
      where: { course_id: id },
      select: { prerequisite_course_id: true, type: true },
    });
    course.prerequisite_course_ids = prereqs.filter((p) => p.type === "prerequisite").map((p) => p.prerequisite_course_id);
    course.corequisite_course_ids = prereqs.filter((p) => p.type === "corequisite").map((p) => p.prerequisite_course_id);

    // Surfaces "this course belongs to Program X" in the Course Manager —
    // otherwise an unlisted capstone/internship course looks orphaned to an
    // admin browsing courses, with no indication of which program it's
    // actually part of.
    const programMemberships = await this.prisma.programCourse.findMany({
      where: { course_id: id },
      include: { program: { select: { id: true, title: true, slug: true, status: true } } },
    });
    course.programs = programMemberships.map((pc) => ({
      id: pc.program.id, title: pc.program.title, slug: pc.program.slug, status: pc.program.status,
      is_required: pc.is_required, special_type: pc.special_type,
    }));

    return course;
  }

  // Drafts the Overview/Content tab fields (subtitle, description, overview
  // copy, learning outcomes, how-it-works steps, exam-prep copy) from the
  // course's actual built modules/lessons, rather than a free-text prompt —
  // for courses where the curriculum already exists but the catalog copy is
  // blank or stale.
  async generateOverviewFromBuild(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        title: true,
        level: true,
        modules: {
          orderBy: { sort_order: "asc" },
          select: {
            title: true,
            lessons: {
              orderBy: { sort_order: "asc" },
              select: { title: true, type: true, description: true, content_body: true },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException("Course not found");

    const hasLessons = course.modules.some((m) => m.lessons.length > 0);
    if (!course.modules.length || !hasLessons) {
      throw new BadRequestException(
        "This course doesn't have any built modules or lessons yet — add content in the builder first.",
      );
    }

    const modules = course.modules.map((m) => ({
      title: m.title,
      lessons: m.lessons.map((l) => ({
        title: l.title,
        type: l.type,
        excerpt: stripHtmlExcerpt(l.content_body) || l.description || "",
      })),
    }));

    return this.aiService.generateCourseOverviewFromBuild({
      title: course.title,
      level: course.level,
      modules,
    });
  }

  async adminCreate(dto: Record<string, any>) {
    const {
      slug, title, subtitle, description, price = 0, status = 'draft',
      thumbnail_url, preview_video_url, level = 'beginner',
      duration_hours = 0, pdu_value = 0, certification_id, sort_order = 0,
    } = dto;
    if (!slug || !title) throw new BadRequestException("slug and title are required");

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.courses (
        id, slug, title, subtitle, description, price, status,
        thumbnail_url, preview_video_url, level, duration_hours, pdu_value,
        certification_id, sort_order, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5::numeric, $6::lms."CourseStatus",
        $7, $8, $9::lms."CourseLevel", $10::numeric, $11::numeric,
        $12, $13, now(), now()
      ) RETURNING *
    `, slug, title, subtitle ?? null, description ?? null,
       price, status, thumbnail_url ?? null, preview_video_url ?? null,
       level, duration_hours, pdu_value, certification_id ?? null, sort_order);
    const created = rows[0];
    this.translationsService.translateToAllEnabledLocales("course", created);
    return created;
  }

  async adminUpdate(id: string, dto: Record<string, any>) {
    const allowed = [
      'title', 'subtitle', 'description', 'price', 'compare_at_price', 'status', 'thumbnail_url',
      'preview_video_url', 'level', 'duration_hours', 'pdu_value', 'certification_id',
      'sort_order', 'slug', 'total_lessons', 'is_featured', 'is_listed', 'ai_professor_enabled', 'content',
      'passing_score',
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;

    for (const key of allowed) {
      if (!(key in dto)) continue;
      if (key === 'status') {
        sets.push(`"${key}" = $${p}::lms."CourseStatus"`);
      } else if (key === 'level') {
        sets.push(`"${key}" = $${p}::lms."CourseLevel"`);
      } else if (['price', 'compare_at_price', 'duration_hours', 'pdu_value'].includes(key)) {
        sets.push(`"${key}" = $${p}::numeric`);
      } else if (['sort_order', 'total_lessons', 'passing_score'].includes(key)) {
        sets.push(`"${key}" = $${p}::int`);
      } else if (key === 'is_featured' || key === 'is_listed' || key === 'ai_professor_enabled') {
        sets.push(`"${key}" = $${p}::boolean`);
      } else if (key === 'content') {
        sets.push(`"${key}" = $${p}::jsonb`);
        vals.push(JSON.stringify(dto[key]));
        p++;
        continue;
      } else {
        sets.push(`"${key}" = $${p}`);
      }
      vals.push(dto[key] ?? null);
      p++;
    }
    if (!sets.length) return this.adminGetOne(id);

    sets.push(`updated_at = now()`);
    vals.push(id);
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.courses SET ${sets.join(', ')} WHERE id = $${p}`,
      ...vals,
    );
    const updated = await this.adminGetOne(id);
    this.translationsService.translateToAllEnabledLocales("course", updated);
    return updated;
  }

  async adminDeleteEnrollment(enrollmentId: string) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_enrollments WHERE id = $1`,
      enrollmentId,
    );
    return { message: "Enrollment deleted" };
  }

  async adminDelete(id: string) {
    // Module/Lesson cascade at the DB level, which would silently skip R2
    // cleanup (that only happens in the per-module/per-lesson delete methods
    // above) — clean up every lesson under this course first.
    const lessons = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT content_body, external_url FROM lms.lessons WHERE module_id IN (SELECT id FROM lms.modules WHERE course_id = $1)`,
      id,
    );
    await Promise.all(lessons.map((l) => this.uploads.cleanupLessonStorage(l)));

    // CourseEnrollment has no onDelete: Cascade in schema, so delete manually first.
    // CourseTeacher and Module (→ Lesson etc.) do have Cascade and are handled by the DB.
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.course_enrollments WHERE course_id = $1`, id);
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.courses WHERE id = $1`, id);
    return { message: "Course deleted" };
  }

  async assignTeacher(courseId: string, userId: string, isLead = false) {
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO lms.course_teachers (id, course_id, user_id, is_lead, assigned_at)
      VALUES (gen_random_uuid(), $1, $2, $3, now())
      ON CONFLICT (course_id, user_id) DO UPDATE SET is_lead = $3
    `, courseId, userId, isLead);
    return { message: "Instructor assigned" };
  }

  async removeTeacher(courseId: string, userId: string) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_teachers WHERE course_id = $1 AND user_id = $2`,
      courseId, userId,
    );
    return { message: "Instructor removed" };
  }

  // ─── Admin — Documents (syllabus, outline, etc.) ──────────────────────

  async adminGetDocuments(courseId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.course_documents WHERE course_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      courseId,
    );
  }

  async adminCreateDocument(courseId: string, dto: Record<string, any>) {
    const { title, file_url, file_name } = dto;
    if (!title?.trim()) throw new BadRequestException("Document title is required");
    if (!file_url?.trim()) throw new BadRequestException("File is required");
    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lms.course_documents WHERE course_id = $1`,
      courseId,
    );
    const sort_order = Number(countRows[0]?.next ?? 0);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.course_documents (id, course_id, title, file_url, file_name, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now(), now()) RETURNING *
    `, courseId, title, file_url, file_name ?? null, sort_order);
    return rows[0];
  }

  async adminUpdateDocument(courseId: string, documentId: string, dto: Record<string, any>) {
    const { title, file_url, file_name } = dto;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.course_documents SET
        title = COALESCE($1, title),
        file_url = COALESCE($2, file_url),
        file_name = COALESCE($3, file_name),
        updated_at = now()
      WHERE id = $4 AND course_id = $5 RETURNING *
    `, title ?? null, file_url ?? null, file_name ?? null, documentId, courseId);
    if (!rows.length) throw new NotFoundException("Document not found");
    return rows[0];
  }

  async adminDeleteDocument(courseId: string, documentId: string) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_documents WHERE id = $1 AND course_id = $2`,
      documentId, courseId,
    );
    return { message: "Document deleted" };
  }

  // ─── Professor — Documents ─────────────────────────────────────────────

  async profGetDocuments(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminGetDocuments(courseId);
  }

  async profCreateDocument(courseId: string, dto: Record<string, any>, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminCreateDocument(courseId, dto);
  }

  async profUpdateDocument(courseId: string, documentId: string, dto: Record<string, any>, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminUpdateDocument(courseId, documentId, dto);
  }

  async profDeleteDocument(courseId: string, documentId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminDeleteDocument(courseId, documentId);
  }

  // ─── Lesson resources (assignment instructor attachments, etc.) ───────
  // LessonResource existed in the schema with zero backend code anywhere
  // until now — mirrors the Course Documents CRUD above, just scoped to a
  // lesson instead of a course.

  async getLessonResources(lessonId: string) {
    return this.prisma.lessonResource.findMany({
      where: { lesson_id: lessonId },
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    });
  }

  async createLessonResource(lessonId: string, dto: { title: string; url: string; file_name?: string; file_type?: string }) {
    if (!dto.title?.trim()) throw new BadRequestException("Resource title is required");
    if (!dto.url?.trim()) throw new BadRequestException("File is required");
    const maxSort = await this.prisma.lessonResource.aggregate({ where: { lesson_id: lessonId }, _max: { sort_order: true } });
    return this.prisma.lessonResource.create({
      data: {
        lesson_id: lessonId,
        title: dto.title,
        url: dto.url,
        file_name: dto.file_name ?? null,
        file_type: dto.file_type ?? null,
        sort_order: (maxSort._max.sort_order ?? -1) + 1,
      },
    });
  }

  async updateLessonResource(lessonId: string, resourceId: string, dto: { title?: string; url?: string; file_name?: string }) {
    const existing = await this.prisma.lessonResource.findFirst({ where: { id: resourceId, lesson_id: lessonId } });
    if (!existing) throw new NotFoundException("Resource not found");
    return this.prisma.lessonResource.update({
      where: { id: resourceId },
      data: { title: dto.title, url: dto.url, file_name: dto.file_name },
    });
  }

  async deleteLessonResource(lessonId: string, resourceId: string) {
    await this.prisma.lessonResource.deleteMany({ where: { id: resourceId, lesson_id: lessonId } });
    return { message: "Resource deleted" };
  }

  async profGetLessonResources(lessonId: string, userId: string, role: Role) {
    await this.assertLessonTeacherAccess(lessonId, userId, role);
    return this.getLessonResources(lessonId);
  }
  async profCreateLessonResource(lessonId: string, dto: any, userId: string, role: Role) {
    await this.assertLessonTeacherAccess(lessonId, userId, role);
    return this.createLessonResource(lessonId, dto);
  }
  async profUpdateLessonResource(lessonId: string, resourceId: string, dto: any, userId: string, role: Role) {
    await this.assertLessonTeacherAccess(lessonId, userId, role);
    return this.updateLessonResource(lessonId, resourceId, dto);
  }
  async profDeleteLessonResource(lessonId: string, resourceId: string, userId: string, role: Role) {
    await this.assertLessonTeacherAccess(lessonId, userId, role);
    return this.deleteLessonResource(lessonId, resourceId);
  }

  private async assertLessonTeacherAccess(lessonId: string, userId: string, role: Role) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson || !lesson.module.course_id) throw new NotFoundException("Lesson not found");
    await this.assertTeacherAccess(lesson.module.course_id, userId, role);
    return lesson;
  }

  // ─── Duplicate a lesson (settings + structure, never submissions/progress) ─
  // Mirrors ProgramsService.adminDuplicate()'s "copy config, skip
  // user-generated data" shape.

  async duplicateLesson(lessonId: string, userId: string, role: Role) {
    const lesson = await this.assertLessonTeacherAccess(lessonId, userId, role);
    // A sublesson's duplicate stays under the same parent, ordered among its
    // siblings — not appended to the whole module's lesson list.
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
        lab_cells_json: lesson.lab_cells_json ?? undefined,
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
        data: resources.map((r) => ({ lesson_id: duplicate.id, title: r.title, url: r.url, file_name: r.file_name, file_type: r.file_type, sort_order: r.sort_order })),
      });
    }
    if (questions.length) {
      await this.prisma.quizQuestion.createMany({
        data: questions.map((q) => ({ lesson_id: duplicate.id, question_text: q.question_text, question_type: q.question_type, options: q.options as any, correct_index: q.correct_index, explanation: q.explanation, points: q.points, sort_order: q.sort_order })),
      });
    }

    return duplicate;
  }

  // ─── Gradebook export (zero-dependency CSV, same approach as
  //     users.service.ts's exportCsv — no xlsx library exists anywhere in
  //     this repo; a CSV opens fine in Excel). ─────────────────────────────

  private toCsv(headers: string[], rows: (string | number | null)[][]): string {
    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
  }

  async exportCourseSubmissions(courseId: string, userId: string, role: Role): Promise<string> {
    await this.assertTeacherAccess(courseId, userId, role);
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { lesson: { module: { course_id: courseId } }, is_latest: true },
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

  // ─── Assignment statistics ──────────────────────────────────────────────

  async getAssignmentStatistics(lessonId: string, userId: string, role: Role) {
    const lesson = await this.assertLessonTeacherAccess(lessonId, userId, role);
    if (!lesson.module.course_id) throw new NotFoundException("Lesson not found");

    const [enrolledCount, latestAttempts] = await Promise.all([
      this.prisma.courseEnrollment.count({ where: { course_id: lesson.module.course_id } }),
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

  // ─── Admin — Module & Lesson management ──────────────────────────────

  async adminGetModules(courseId: string) {
    const modules = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT m.id, m.course_id, m.title, m.description,
        m.sort_order::int AS order_index, m.is_published::bool,
        COALESCE((SELECT json_agg(json_build_object(
          'id', l.id,
          'module_id', l.module_id,
          'title', l.title,
          'type', l.type::text,
          'description', l.description,
          'content', l.content_body,
          'video_url', l.video_url,
          'download_url', l.download_url,
          'allow_download', l.allow_download::bool,
          'external_url', l.external_url,
          'is_published', l.is_published::bool,
          'duration_minutes', l.duration_minutes::int,
          'order_index', l.sort_order::int,
          'passing_score', l.passing_score::int,
          'max_attempts', l.max_attempts::int,
          'max_score', l.max_score::int,
          'due_date', l.due_date,
          'allow_text_response', l.allow_text_response::bool,
          'text_word_limit', l.text_word_limit::int,
          'blocks_json', l.blocks_json,
          'lab_cells_json', l.lab_cells_json,
          'parent_lesson_id', l.parent_lesson_id,
          'sublesson_kind', l.sublesson_kind::text,
          'visible_in_structure', l.visible_in_structure::bool,
          'available_via_link', l.available_via_link::bool,
          'sublesson_required', l.sublesson_required::bool,
          'track_views', l.track_views::bool,
          'open_behavior', l.open_behavior::text
        ) ORDER BY l.sort_order ASC)
        FROM lms.lessons l WHERE l.module_id = m.id), '[]'::json) AS lessons
      FROM lms.modules m
      WHERE m.course_id = $1
      ORDER BY m.sort_order ASC
    `, courseId);
    return modules;
  }

  async adminGetQuestions(courseId: string, moduleId: string, lessonId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT q.id, q.lesson_id, q.question_text, q.question_type::text, q.options,
             q.correct_index::int, q.explanation, q.points::int, q.sort_order::int
      FROM lms.quiz_questions q
      JOIN lms.lessons l ON l.id = q.lesson_id
      JOIN lms.modules m ON m.id = l.module_id
      WHERE q.lesson_id = $1 AND l.module_id = $2 AND m.course_id = $3
      ORDER BY q.sort_order ASC
    `, lessonId, moduleId, courseId);
    return rows;
  }

  async adminCreateQuestion(courseId: string, moduleId: string, lessonId: string, dto: Record<string, any>) {
    const { question_text, question_type, options, correct_index, explanation, points, sort_order } = dto;
    if (!question_text?.trim()) throw new BadRequestException("Question text is required");
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.quiz_questions (id, lesson_id, question_text, question_type, options, correct_index, explanation, points, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3::lms."QuestionType", $4::jsonb, $5, $6, $7, $8, now(), now()) RETURNING *
    `, lessonId, question_text, question_type || 'multiple_choice', JSON.stringify(options ?? []), correct_index ?? 0, explanation ?? null, points ?? 1, sort_order ?? 0);
    return rows[0];
  }

  async adminUpdateQuestion(courseId: string, moduleId: string, lessonId: string, questionId: string, dto: Record<string, any>) {
    const { question_text, options, correct_index, explanation, points } = dto;
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.quiz_questions SET
        question_text = COALESCE($1, question_text),
        options = COALESCE($2::jsonb, options),
        correct_index = COALESCE($3, correct_index),
        explanation = COALESCE($4, explanation),
        points = COALESCE($5, points),
        updated_at = now()
      WHERE id = $6 AND lesson_id = $7 RETURNING *
    `, question_text ?? null, options ? JSON.stringify(options) : null, correct_index ?? null, explanation ?? null, points ?? null, questionId, lessonId);
    // note: $2 is cast to ::jsonb in the SQL above
    return rows[0];
  }

  async adminDeleteQuestion(courseId: string, moduleId: string, lessonId: string, questionId: string) {
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.quiz_questions WHERE id = $1 AND lesson_id = $2`, questionId, lessonId);
    return { message: "Question deleted" };
  }

  async adminGetSubmissions(courseId: string) {
    // is_latest = true — each assignment can now have multiple historical
    // attempt rows; this overview shows each student's current attempt,
    // matching getCourseSubmissions()'s default. Full history is available
    // per-student via getSubmissionAttempts().
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT s.id, s.lesson_id, s.user_id, s.status::text, s.submitted_at,
             s.file_url, s.file_name, s.text_content, s.grade, s.max_grade, s.feedback,
             s.attempt_number, s.is_late,
             l.title AS lesson_title, m.title AS module_title,
             p.first_name, p.last_name, p.avatar_url
      FROM lms.assignment_submissions s
      JOIN lms.lessons l ON l.id = s.lesson_id
      JOIN lms.modules m ON m.id = l.module_id
      JOIN lms.profiles p ON p.user_id = s.user_id
      WHERE m.course_id = $1 AND s.is_latest = true
      ORDER BY s.submitted_at DESC
    `, courseId);
    return rows;
  }

  async adminCreateModule(courseId: string, dto: Record<string, any>) {
    const { title, description, order_index } = dto;
    if (!title?.trim()) throw new BadRequestException("Module title is required");

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.modules (id, course_id, title, description, sort_order, is_published, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, true, now(), now()) RETURNING *
    `, courseId, title, description || null, order_index ?? 0);
    return rows[0];
  }

  // Imports an Articulate Rise 360 export (.zip) as new modules/lessons on
  // top of whatever's already in the course — an additive alternative to
  // building modules by hand, not a replacement for it. `mode: "preserve"`
  // hosts the original course design/experience as one embedded lesson;
  // `mode: "decompose"` (default) reconstructs it as editable PAII content.
  async adminImportRiseExport(courseId: string, zipBuffer: Buffer, mode: "decompose" | "preserve" | "scorm" = "decompose") {
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
    for (const [mi, plannedModule] of plan.modules.entries()) {
      const mod = await this.adminCreateModule(courseId, { title: plannedModule.title, order_index: mi });
      modulesCreated++;
      for (const [li, lesson] of plannedModule.lessons.entries()) {
        const created = await this.adminCreateLesson(courseId, mod.id, {
          title: lesson.title, type: lesson.type, content: lesson.content_html ?? null,
          external_url: lesson.external_url ?? null, order_index: li,
        });
        lessonsCreated++;
        for (const [qi, q] of (lesson.questions ?? []).entries()) {
          await this.adminCreateQuestion(courseId, mod.id, created.id, { ...q, sort_order: qi });
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

  async adminUpdateModule(courseId: string, moduleId: string, dto: Record<string, any>) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!rows.length) throw new NotFoundException("Module not found");
    const { title, description, is_published } = dto;
    const updated = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.modules SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        is_published = COALESCE($3, is_published),
        updated_at = now()
      WHERE id = $4 RETURNING *
    `, title ?? null, description ?? null, is_published ?? null, moduleId);
    return updated[0];
  }

  async adminPublishAll(courseId: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.modules SET is_published = true, updated_at = now() WHERE course_id = $1`,
      courseId,
    );
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.lessons SET is_published = true, updated_at = now()
       WHERE module_id IN (SELECT id FROM lms.modules WHERE course_id = $1)`,
      courseId,
    );
    const [mods] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS count FROM lms.modules WHERE course_id = $1`, courseId,
    );
    const [lessons] = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int AS count FROM lms.lessons WHERE module_id IN (SELECT id FROM lms.modules WHERE course_id = $1)`, courseId,
    );
    return { modules: mods.count, lessons: lessons.count };
  }

  async adminDeleteModule(courseId: string, moduleId: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!rows.length) throw new NotFoundException("Module not found");
    // Clean up any R2 objects this module's lessons referenced before the
    // rows (and with them, our only record of what to clean up) are gone.
    const lessons = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT content_body, external_url FROM lms.lessons WHERE module_id = $1`,
      moduleId,
    );
    await Promise.all(lessons.map((l) => this.uploads.cleanupLessonStorage(l)));
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.modules WHERE id = $1`, moduleId);
    return { message: "Module deleted" };
  }

  // Wipes every module (and, by cascade, every lesson/quiz question) for a
  // course in one shot — the "start over with a fresh import" button.
  // Irreversible; the caller is responsible for confirming with the admin.
  async adminDeleteAllModules(courseId: string) {
    const modules = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE course_id = $1`, courseId,
    );
    if (!modules.length) return { message: "Nothing to delete", deleted_count: 0 };
    const lessons = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT content_body, external_url FROM lms.lessons WHERE module_id = ANY($1::text[])`,
      modules.map((m) => m.id),
    );
    await Promise.all(lessons.map((l) => this.uploads.cleanupLessonStorage(l)));
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.modules WHERE course_id = $1`, courseId);
    return { message: "All modules deleted", deleted_count: modules.length };
  }

  async adminCreateLesson(courseId: string, moduleId: string, dto: Record<string, any>) {
    const { title, content, external_url, duration_minutes, order_index, type } = dto;
    if (!title?.trim()) throw new BadRequestException("Lesson title is required");

    const moduleRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!moduleRows.length) throw new NotFoundException("Module not found");

    const lessonType = type || 'reading';
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.lessons (id, module_id, title, content_body, external_url, type, duration_minutes, sort_order, is_published, is_free_preview, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::lms."LessonType", $6, $7, true, false, now(), now()) RETURNING *
    `, moduleId, title, content || null, external_url || null, lessonType, duration_minutes ?? 0, order_index ?? 0);
    return rows[0];
  }

  // A Sublesson is a Lesson row like any other with parent_lesson_id set —
  // see schema.prisma's Lesson model comment. Uses the typed Prisma client
  // (not the raw-SQL INSERT adminCreateLesson above uses) since it needs
  // the new sublesson-specific columns that raw statement doesn't list.
  // sort_order is scoped to siblings under this parent, not the module.
  async adminCreateSublesson(courseId: string, moduleId: string, parentLessonId: string, title: string) {
    if (!title?.trim()) throw new BadRequestException("Sublesson title is required");
    await this.assertAdminLessonInCourse(courseId, moduleId, parentLessonId);
    const maxSort = await this.prisma.lesson.aggregate({
      where: { parent_lesson_id: parentLessonId },
      _max: { sort_order: true },
    });
    return this.prisma.lesson.create({
      data: {
        module_id: moduleId,
        parent_lesson_id: parentLessonId,
        title,
        type: "reading",
        sort_order: (maxSort._max.sort_order ?? -1) + 1,
        is_published: false,
        visible_in_structure: false,
      },
    });
  }

  async adminReorderSublessons(courseId: string, moduleId: string, parentLessonId: string, orderedIds: string[]) {
    await this.assertAdminLessonInCourse(courseId, moduleId, parentLessonId);
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.lesson.update({ where: { id, parent_lesson_id: parentLessonId }, data: { sort_order: index } })
      )
    );
    return { message: "Sublessons reordered" };
  }

  async adminUpdateLesson(courseId: string, moduleId: string, lessonId: string, dto: Record<string, any>) {
    const moduleRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!moduleRows.length) throw new NotFoundException("Module not found");
    const lessonRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.lessons WHERE id = $1 AND module_id = $2`,
      lessonId, moduleId,
    );
    if (!lessonRows.length) throw new NotFoundException("Lesson not found");

    // Prisma's update() only touches keys actually present in `data` — that
    // gives the same "leave unchanged unless provided" semantics the old
    // raw-SQL COALESCE version had, without a 30-parameter positional query.
    const allowed = [
      "title", "content_body", "video_url", "download_url", "allow_download", "external_url",
      "duration_minutes", "type", "is_published",
      "passing_score", "max_attempts", "max_score", "due_date",
      "allow_text_response", "text_word_limit",
      "available_from", "accept_submissions", "allow_late_submissions", "late_submission_deadline",
      "late_penalty_type", "late_penalty_value", "allow_file_upload", "max_files",
      "accepted_file_types", "max_file_size_mb", "rubric_json", "lab_cells_json",
      "sublesson_kind", "visible_in_structure", "available_via_link", "sublesson_required",
      "track_views", "open_behavior",
    ] as const;
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (key in dto) data[key] = dto[key];
    }
    return this.prisma.lesson.update({ where: { id: lessonId }, data });
  }

  private async assertAdminLessonInCourse(courseId: string, moduleId: string, lessonId: string) {
    const moduleRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!moduleRows.length) throw new NotFoundException("Module not found");
    const lessonRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.lessons WHERE id = $1 AND module_id = $2`,
      lessonId, moduleId,
    );
    if (!lessonRows.length) throw new NotFoundException("Lesson not found");
  }

  // Renders a manually-built block list to HTML the same way Rise imports
  // are rendered (shared dispatch in rise-html-blocks.ts) — no persistence,
  // used for the block builder's live preview.
  async adminPreviewLessonBlocks(courseId: string, moduleId: string, lessonId: string, blocks: any[]) {
    await this.assertAdminLessonInCourse(courseId, moduleId, lessonId);
    const flags: string[] = [];
    const { html } = await renderBlockItems(blocks, new Map(), this.uploads.uploadBufferServerSide.bind(this.uploads), flags);
    return { content_body: wrapLessonContent(html), flags };
  }

  // Renders and persists — both `blocks_json` (so the builder can reopen
  // the same blocks later) and `content_body` (what students/Preview
  // actually render) are written together so they never drift apart.
  async adminSaveLessonBlocks(courseId: string, moduleId: string, lessonId: string, blocks: any[]) {
    await this.assertAdminLessonInCourse(courseId, moduleId, lessonId);
    const flags: string[] = [];
    const { html } = await renderBlockItems(blocks, new Map(), this.uploads.uploadBufferServerSide.bind(this.uploads), flags);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { blocks_json: blocks, content_body: wrapLessonContent(html) },
    });
  }

  async adminDeleteLesson(courseId: string, moduleId: string, lessonId: string) {
    const moduleRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!moduleRows.length) throw new NotFoundException("Module not found");

    const lessonRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id, content_body, external_url FROM lms.lessons WHERE id = $1 AND module_id = $2`,
      lessonId, moduleId,
    );
    if (!lessonRows.length) throw new NotFoundException("Lesson not found");

    await this.uploads.cleanupLessonStorage(lessonRows[0]);
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.lessons WHERE id = $1`, lessonId);
    return { message: "Lesson deleted" };
  }

  // ─── Professor — list & builder ──────────────────────────────────────

  async profGetMyCourses(userId: string, role: Role) {
    if (role === Role.super_admin || role === Role.admin) {
      return this.adminGetAll();
    }
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*,
        cert.acronym AS cert_acronym, cert.title AS cert_title,
        (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count,
        (SELECT COUNT(*) FROM lms.course_enrollments e WHERE e.course_id = c.id)::int AS enrollment_count
      FROM lms.courses c
      JOIN lms.course_teachers ct ON ct.course_id = c.id AND ct.user_id = $1
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      ORDER BY c.sort_order ASC
    `, userId);
  }

  async profGetCourse(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminGetOne(courseId);
  }

  // A professor assigned to this course (via CourseTeacher) can edit the
  // same fields an admin can — title, subtitle, description, price, level,
  // status, content, etc. — not just the module/lesson tree.
  async profUpdateCourse(courseId: string, dto: Record<string, any>, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminUpdate(courseId, dto);
  }

  // Full module/lesson tree with rich per-lesson fields (video_url, content_body,
  // download_url, quiz settings, etc.) — same shape the admin builder uses, so the
  // professor builder can offer the same per-lesson-type content editors.
  async profGetModules(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminGetModules(courseId);
  }

  async profPublishAll(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.adminPublishAll(courseId);
  }

  // ─── Course creation & approval (professor-authored courses) ─────────

  // status: active (not draft) so the course is immediately shareable via
  // invitation the moment it's created — is_listed: false is the actual
  // "private" gate, kept separate so approval only controls public catalog
  // visibility, never enrollment eligibility (see schema.prisma comment on
  // Course.is_listed for why these can't share one field).
  async profCreateCourse(userId: string, dto: { title: string; subtitle?: string; description?: string; price?: number; level?: string }) {
    if (!dto.title?.trim()) throw new BadRequestException("Title is required");

    const base = dto.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let slug = base || "course";
    for (let i = 0; ; i++) {
      const candidate = i === 0 ? slug : `${slug}-${i}`;
      const existing = await this.prisma.course.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!existing) { slug = candidate; break; }
    }

    const course = await this.prisma.course.create({
      data: {
        slug,
        title: dto.title.trim(),
        subtitle: dto.subtitle?.trim() || null,
        description: dto.description?.trim() || null,
        price: dto.price ?? 0,
        level: (dto.level as any) ?? "beginner",
        status: "active",
        is_listed: false,
        approval_status: "none",
        created_by: userId,
        created_by_role: Role.professor,
        instructors: { create: { user_id: userId, is_lead: true } },
      },
    });
    return course;
  }

  async profSubmitForApproval(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    const course = await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } });
    if (course.approval_status !== "none" && course.approval_status !== "rejected") {
      throw new BadRequestException(`This course is already ${course.approval_status === "pending" ? "pending review" : "approved"}.`);
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: { approval_status: "pending", submitted_at: new Date(), rejection_reason: null },
    });
  }

  // ─── Quiz questions (course builder) ──────────────────────────────────

  async profGetQuestions(lessonId: string, userId: string, role: Role) {
    const { course_id, module_id } = await this.assertLessonCourseAccess(lessonId, userId, role);
    return this.adminGetQuestions(course_id, module_id, lessonId);
  }

  async profCreateQuestion(lessonId: string, dto: Record<string, any>, userId: string, role: Role) {
    const { course_id, module_id } = await this.assertLessonCourseAccess(lessonId, userId, role);
    return this.adminCreateQuestion(course_id, module_id, lessonId, dto);
  }

  async profUpdateQuestion(lessonId: string, questionId: string, dto: Record<string, any>, userId: string, role: Role) {
    const { course_id, module_id } = await this.assertLessonCourseAccess(lessonId, userId, role);
    return this.adminUpdateQuestion(course_id, module_id, lessonId, questionId, dto);
  }

  async profDeleteQuestion(lessonId: string, questionId: string, userId: string, role: Role) {
    const { course_id, module_id } = await this.assertLessonCourseAccess(lessonId, userId, role);
    return this.adminDeleteQuestion(course_id, module_id, lessonId, questionId);
  }

  // ─── Modules (course builder) ────────────────────────────────────────

  async createCourseModule(courseId: string, title: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lms.modules WHERE course_id = $1`,
      courseId,
    );
    const sort_order = Number(countRows[0]?.next ?? 0);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.modules (id, course_id, title, sort_order, is_published, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, false, now(), now()) RETURNING *
    `, courseId, title, sort_order);
    return rows[0];
  }

  async updateCourseModule(moduleId: string, dto: Record<string, any>, userId: string, role: Role) {
    await this.assertModuleCourseAccess(moduleId, userId, role);
    const allowed = ['title', 'description', 'is_published', 'sort_order'];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;
    for (const key of allowed) {
      if (!(key in dto)) continue;
      sets.push(`"${key}" = $${p}`);
      vals.push(dto[key]);
      p++;
    }
    if (!sets.length) return;
    sets.push(`updated_at = now()`);
    vals.push(moduleId);
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.modules SET ${sets.join(', ')} WHERE id = $${p}`,
      ...vals,
    );
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.modules WHERE id = $1`, moduleId,
    );
    return rows[0];
  }

  async deleteCourseModule(moduleId: string, userId: string, role: Role) {
    await this.assertModuleCourseAccess(moduleId, userId, role);
    const lessons = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT content_body, external_url FROM lms.lessons WHERE module_id = $1`,
      moduleId,
    );
    await Promise.all(lessons.map((l) => this.uploads.cleanupLessonStorage(l)));
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.modules WHERE id = $1`, moduleId);
    return { message: "Module deleted" };
  }

  // Professor counterpart to adminImportRiseExport — createCourseModule only
  // takes a title and createCourseLesson doesn't accept content at creation
  // time, so content is applied via a follow-up updateCourseLesson call.
  async profImportRiseExport(courseId: string, zipBuffer: Buffer, userId: string, role: Role, mode: "decompose" | "preserve" | "scorm" = "decompose") {
    await this.assertTeacherAccess(courseId, userId, role);

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
      const mod = await this.createCourseModule(courseId, plannedModule.title, userId, role);
      modulesCreated++;
      for (const lesson of plannedModule.lessons) {
        const created = await this.createCourseLesson(mod.id, { title: lesson.title, type: lesson.type }, userId, role);
        lessonsCreated++;
        if (lesson.content_html || lesson.external_url) {
          const update: Record<string, any> = {};
          if (lesson.content_html) update.content_body = lesson.content_html;
          if (lesson.external_url) update.external_url = lesson.external_url;
          await this.updateCourseLesson(created.id, update, userId, role);
        }
        for (const q of lesson.questions ?? []) {
          await this.profCreateQuestion(created.id, q, userId, role);
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

  // ─── Lessons (course builder) ─────────────────────────────────────────

  async createCourseLesson(moduleId: string, dto: Record<string, any>, userId: string, role: Role) {
    await this.assertModuleCourseAccess(moduleId, userId, role);
    const { title, type = 'video', duration_minutes = 10 } = dto;
    const countRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lms.lessons WHERE module_id = $1`,
      moduleId,
    );
    const sort_order = Number(countRows[0]?.next ?? 0);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.lessons (id, module_id, title, type, sort_order, duration_minutes, is_published, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3::lms."LessonType", $4, $5, false, now(), now()) RETURNING *
    `, moduleId, title, type, sort_order, duration_minutes);
    return rows[0];
  }

  async updateCourseLesson(lessonId: string, dto: Record<string, any>, userId: string, role: Role) {
    await this.assertLessonCourseAccess(lessonId, userId, role);
    const allowed = [
      'title', 'description', 'is_published', 'sort_order', 'duration_minutes',
      'video_url', 'content_body', 'download_url', 'is_free_preview', 'type',
      'allow_download', 'external_url', 'passing_score', 'max_attempts',
      'max_score', 'due_date', 'allow_text_response', 'text_word_limit',
      'available_from', 'accept_submissions', 'allow_late_submissions', 'late_submission_deadline',
      'late_penalty_type', 'late_penalty_value', 'allow_file_upload', 'max_files',
      'accepted_file_types', 'max_file_size_mb', 'rubric_json', 'lab_cells_json',
    ] as const;
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (key in dto) data[key] = dto[key];
    }
    if (!Object.keys(data).length) return this.prisma.lesson.findUnique({ where: { id: lessonId } });
    return this.prisma.lesson.update({ where: { id: lessonId }, data });
  }

  // Renders a manually-built block list to HTML the same way Rise imports
  // are rendered (shared dispatch in rise-html-blocks.ts) — no persistence,
  // used for the block builder's live preview.
  async previewCourseLessonBlocks(lessonId: string, blocks: any[], userId: string, role: Role) {
    await this.assertLessonCourseAccess(lessonId, userId, role);
    const flags: string[] = [];
    const { html } = await renderBlockItems(blocks, new Map(), this.uploads.uploadBufferServerSide.bind(this.uploads), flags);
    return { content_body: wrapLessonContent(html), flags };
  }

  // Renders and persists — both `blocks_json` (so the builder can reopen
  // the same blocks later) and `content_body` (what students/Preview
  // actually render) are written together so they never drift apart.
  async saveCourseLessonBlocks(lessonId: string, blocks: any[], userId: string, role: Role) {
    await this.assertLessonCourseAccess(lessonId, userId, role);
    const flags: string[] = [];
    const { html } = await renderBlockItems(blocks, new Map(), this.uploads.uploadBufferServerSide.bind(this.uploads), flags);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: { blocks_json: blocks, content_body: wrapLessonContent(html) },
    });
  }

  async deleteCourseLesson(lessonId: string, userId: string, role: Role) {
    await this.assertLessonCourseAccess(lessonId, userId, role);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT content_body, external_url FROM lms.lessons WHERE id = $1`,
      lessonId,
    );
    if (rows[0]) await this.uploads.cleanupLessonStorage(rows[0]);
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.lessons WHERE id = $1`, lessonId);
    return { message: "Lesson deleted" };
  }
}
