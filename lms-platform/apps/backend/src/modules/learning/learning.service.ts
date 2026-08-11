import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AiService } from "../ai/ai.service";
import { stripHtmlExcerpt } from "../content-import/rise-html-blocks";
import { CompleteLessonDto } from "./dto/complete-lesson.dto";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { SubmitAssignmentDto } from "./dto/submit-assignment.dto";
import { UpdateProgressDto } from "./dto/update-progress.dto";

@Injectable()
export class LearningService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private aiService: AiService,
  ) {}

  // ─── Course Access ────────────────────────────────────────────────────

  // `allowCompleted` lets a student who's already finished (and passed) their
  // certification still open lesson content and their own notes — otherwise
  // getCourseOutline (no status filter) lists every module/lesson as if
  // accessible, but this check would silently 403 the moment they clicked
  // into one, since completing a certification doesn't mean every bundled
  // required-course lesson was actually opened. Left false (the original,
  // stricter behavior) for anything that writes new progress/submissions —
  // whether a completed student should be able to re-submit a quiz or
  // assignment is a separate question from whether they can review content.
  private async assertEnrollment(enrollmentId: string, userId: string, allowCompleted = false) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        user_id: userId,
        status: allowCompleted ? { in: ["active", "completed"] } : "active",
      },
    });
    if (!enrollment) throw new ForbiddenException("No active enrollment found");
    return enrollment;
  }

  async getCourseOutline(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
      include: {
        certification: {
          include: {
            modules: {
              where: { is_published: true },
              orderBy: { sort_order: "asc" },
              include: {
                lessons: {
                  where: { is_published: true },
                  orderBy: { sort_order: "asc" },
                  select: {
                    id: true, title: true, type: true,
                    duration_minutes: true, is_free_preview: true,
                    due_date: true,
                  },
                },
              },
            },
          },
        },
        lesson_progress: { select: { lesson_id: true, completed: true, quiz_score: true, last_position: true } },
        exam_attempts: { orderBy: { attempt_number: "desc" }, take: 1 },
        certificate: { select: { id: true, certificate_number: true, issued_at: true } },
      },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    const completedLessonIds = new Set(
      enrollment.lesson_progress.filter((lp) => lp.completed).map((lp) => lp.lesson_id)
    );
    const progressMap = new Map(enrollment.lesson_progress.map((lp) => [lp.lesson_id, lp]));

    // Required courses (set from the certification's Prep Courses tab) —
    // "recommended" (not required) courses never appear here or count
    // toward totals; they're a separate, purely optional section. Free
    // required courses merge their content directly into this player;
    // paid ones are shown as a locked purchase card instead, tracked via
    // their own separate CourseEnrollment.
    const requiredRows = await this.prisma.courseCertRecommendation.findMany({
      where: { certification_id: enrollment.certification_id, is_required: true },
      include: { course: { select: { id: true, title: true, slug: true, price: true, status: true, sort_order: true, ai_professor_enabled: true } } },
      orderBy: { course: { sort_order: "asc" } },
    });
    const requiredCourses = requiredRows
      .filter((r) => r.course.status === "active")
      .map((r) => ({ ...r.course, is_free: r.is_free }));
    const freeCourses = requiredCourses.filter((c) => c.is_free);
    const paidCourses = requiredCourses.filter((c) => !c.is_free);

    // Modules attached directly to the certification, plus modules from
    // every free required course — merged, not either/or, since a
    // certification can carry its own native content (e.g. a wrap-up quiz)
    // in addition to bundled courses that supply the bulk of the curriculum.
    let rawModules = enrollment.certification.modules;
    if (freeCourses.length > 0) {
      const perCourse = await Promise.all(
        freeCourses.map((c) =>
          this.prisma.module.findMany({
            where: { course_id: c.id, is_published: true },
            orderBy: { sort_order: "asc" },
            include: {
              lessons: {
                where: { is_published: true },
                orderBy: { sort_order: "asc" },
                select: {
                  id: true, title: true, type: true,
                  duration_minutes: true, is_free_preview: true,
                  due_date: true,
                },
              },
            },
          }).then((mods) => mods.map((m) => ({ ...m, _source_course_id: c.id })))
        )
      );
      rawModules = [...rawModules, ...perCourse.flat()] as any;
    }

    const modules = rawModules.map((mod: any) => ({
      ...mod,
      lessons: mod.lessons.map((lesson: any) => ({
        ...lesson,
        completed: completedLessonIds.has(lesson.id),
        progress: progressMap.get(lesson.id) ?? null,
      })),
      completed_count: mod.lessons.filter((l: any) => completedLessonIds.has(l.id)).length,
      total_count: mod.lessons.length,
    }));

    // Paid required courses aren't merged in — tell the frontend whether the
    // student already purchased each one (and their progress there) so it
    // can render a locked/Buy card vs. a Continue link out to that course's
    // own player.
    let lockedCourses: any[] = [];
    if (paidCourses.length > 0) {
      const courseEnrollments = await this.prisma.courseEnrollment.findMany({
        where: { user_id: userId, course_id: { in: paidCourses.map((c) => c.id) } },
      });
      const byId = new Map(courseEnrollments.map((e) => [e.course_id, e]));
      lockedCourses = paidCourses.map((c) => {
        const ce = byId.get(c.id);
        return {
          id: c.id, title: c.title, slug: c.slug, price: Number(c.price),
          enrollment_id: ce?.id ?? null,
          progress_percentage: ce?.progress_percentage ?? 0,
          completed_at: ce?.completed_at ?? null,
        };
      });
    }

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        progress_percentage: enrollment.progress_percentage,
        enrolled_at: enrollment.enrolled_at,
        expires_at: enrollment.expires_at,
      },
      certification: {
        id: enrollment.certification.id,
        title: enrollment.certification.title,
        acronym: enrollment.certification.acronym,
        badge_icon: enrollment.certification.badge_icon,
        passing_score: enrollment.certification.passing_score,
        ai_professor_enabled: enrollment.certification.ai_professor_enabled,
      },
      linked_courses: freeCourses.map((c) => ({ id: c.id, title: c.title, slug: c.slug, ai_professor_enabled: c.ai_professor_enabled })),
      locked_courses: lockedCourses,
      modules,
      last_attempt: enrollment.exam_attempts[0] ?? null,
      certificate: enrollment.certificate ?? null,
    };
  }

  async getLessonContent(enrollmentId: string, lessonId: string, userId: string) {
    await this.assertEnrollment(enrollmentId, userId, true);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        resources: true,
        quiz_questions: {
          orderBy: { sort_order: "asc" },
          select: {
            id: true, question_text: true, question_type: true,
            options: true, points: true, sort_order: true,
            // Do NOT expose correct_index to student
          },
        },
        module: {
          select: {
            id: true, title: true, sort_order: true,
            certification_id: true,
            course_id: true,
            certification: { select: { id: true, passing_score: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");

    // The module may belong directly to a certification OR to one of its
    // free required courses (paid required courses are never accessed
    // through this certification-track endpoint — they have their own
    // CourseEnrollment and their own player, gated on actual purchase).
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId },
      include: {
        certification: { select: { id: true, passing_score: true } },
      },
    });
    if (!enrollment) throw new ForbiddenException("Enrollment not found");

    const certId = enrollment.certification.id;
    const belongsToCert = lesson.module.certification_id === certId;
    let belongsToFreeLinkedCourse = false;
    if (!belongsToCert && lesson.module.course_id) {
      const rec = await this.prisma.courseCertRecommendation.findUnique({
        where: {
          course_id_certification_id: { course_id: lesson.module.course_id, certification_id: certId },
        },
      });
      belongsToFreeLinkedCourse = !!rec && rec.is_required && rec.is_free;
    }
    if (!belongsToCert && !belongsToFreeLinkedCourse) {
      throw new ForbiddenException("Lesson is not part of your enrollment");
    }

    // Attach cert-level passing score onto the lesson's module for the client
    (lesson.module as any).certification = lesson.module.certification ?? {
      id: certId,
      passing_score: enrollment.certification.passing_score,
    };

    // Load student's progress for this lesson
    const progress = await this.prisma.lessonProgress.findUnique({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    });

    // Load assignment submission (+ full attempt history) if applicable
    let submission = null;
    let submissionAttempts: any[] = [];
    if (lesson.type === "assignment") {
      submissionAttempts = await this.prisma.assignmentSubmission.findMany({
        where: { lesson_id: lessonId, user_id: userId },
        include: { files: true },
        orderBy: { attempt_number: "asc" },
      });
      submission = submissionAttempts.find((a) => a.is_latest) ?? null;
    }

    // Determine next/prev lessons in the module
    const siblings = await this.prisma.lesson.findMany({
      where: { module_id: lesson.module_id, is_published: true },
      orderBy: { sort_order: "asc" },
      select: { id: true, title: true, sort_order: true, type: true },
    });
    const currentIdx = siblings.findIndex((s) => s.id === lessonId);

    return {
      lesson,
      progress: progress ?? null,
      submission,
      submission_attempts: submissionAttempts,
      navigation: {
        prev: siblings[currentIdx - 1] ?? null,
        next: siblings[currentIdx + 1] ?? null,
        position: currentIdx + 1,
        total: siblings.length,
      },
    };
  }

  // ─── Notes ────────────────────────────────────────────────────────────
  // A student's private per-lesson notes — one row per user+lesson, never
  // visible to instructors/admins.

  async getNote(enrollmentId: string, lessonId: string, userId: string) {
    await this.assertEnrollment(enrollmentId, userId, true);
    const note = await this.prisma.lessonNote.findUnique({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    });
    return { content: note?.content ?? "" };
  }

  async upsertNote(enrollmentId: string, lessonId: string, userId: string, content: string) {
    await this.assertEnrollment(enrollmentId, userId, true);
    const note = await this.prisma.lessonNote.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: { user_id: userId, lesson_id: lessonId, content },
      update: { content },
    });
    return { content: note.content };
  }

  // ─── AI Professor ─────────────────────────────────────────────────────

  async chatWithAiProfessor(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    dto: { message: string; history?: { role: "user" | "assistant"; content: string }[] },
  ) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId, status: { in: ["active", "completed"] } },
      include: {
        certification: { select: { id: true, title: true, ai_professor_enabled: true } },
      },
    });
    if (!enrollment) throw new ForbiddenException("No active enrollment found");

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        title: true, content_body: true,
        module: {
          select: {
            certification_id: true, course_id: true,
            course: { select: { title: true, ai_professor_enabled: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");

    // Same ownership check as getLessonContent (free required courses bundle
    // their lessons into this same certification enrollment) — without it a
    // student could probe excerpts of lessons outside their enrollment via
    // this endpoint.
    const certId = enrollment.certification.id;
    const belongsToCert = lesson.module.certification_id === certId;
    let belongsToFreeLinkedCourse = false;
    if (!belongsToCert && lesson.module.course_id) {
      const rec = await this.prisma.courseCertRecommendation.findUnique({
        where: { course_id_certification_id: { course_id: lesson.module.course_id, certification_id: certId } },
      });
      belongsToFreeLinkedCourse = !!rec && rec.is_required && rec.is_free;
    }
    if (!belongsToCert && !belongsToFreeLinkedCourse) {
      throw new ForbiddenException("Lesson is not part of your enrollment");
    }

    // The toggle is set per certification AND per bundled course
    // independently (an admin can enable it on one without the other) — so
    // whichever one actually owns this lesson is the one that governs here.
    const aiProfessorEnabled = belongsToFreeLinkedCourse
      ? !!lesson.module.course?.ai_professor_enabled
      : !!enrollment.certification.ai_professor_enabled;
    if (!aiProfessorEnabled) {
      throw new BadRequestException("The AI Professor isn't enabled for this course.");
    }

    const courseTitle = belongsToFreeLinkedCourse
      ? (lesson.module.course?.title ?? enrollment.certification.title)
      : enrollment.certification.title;

    return this.aiService.chatWithAiProfessor({
      courseTitle,
      lessonTitle: lesson.title,
      lessonExcerpt: stripHtmlExcerpt(lesson.content_body),
      message: dto.message,
      history: dto.history ?? [],
    });
  }

  // ─── Progress ─────────────────────────────────────────────────────────

  async updateLessonProgress(enrollmentId: string, lessonId: string, userId: string, dto: UpdateProgressDto) {
    await this.assertEnrollment(enrollmentId, userId);
    return this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
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

  async completeLesson(enrollmentId: string, lessonId: string, userId: string, dto: CompleteLessonDto) {
    await this.assertEnrollment(enrollmentId, userId);

    const progress = await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
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

    await this.recalculateProgress(enrollmentId, userId);
    return progress;
  }

  async updateScormProgress(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    dto: { completed: boolean; score?: number; cmi_snapshot: any },
  ) {
    await this.assertEnrollment(enrollmentId, userId);

    const progress = await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
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

    if (dto.completed) await this.recalculateProgress(enrollmentId, userId);
    return progress;
  }

  // ─── Assignment Grading ───────────────────────────────────────────────

  async completeGradedAssignment(enrollmentId: string, lessonId: string, userId: string) {
    await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date(),
      },
      update: { completed: true, completed_at: new Date() },
    });
    await this.recalculateProgress(enrollmentId, userId);
  }

  private async recalculateProgress(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        certification: {
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

    let totalLessons = enrollment.certification.modules.reduce(
      (sum, m) => sum + m.lessons.length, 0
    );
    // Same merge as getCourseOutline: lessons from FREE required courses
    // count toward the certification's total (they're tracked via this same
    // enrollment's LessonProgress). Paid required courses are tracked
    // separately, through their own CourseEnrollment — they don't factor
    // into this percentage at all.
    const freeRequired = await this.prisma.courseCertRecommendation.findMany({
      where: { certification_id: enrollment.certification_id, is_required: true, is_free: true },
      select: { course_id: true },
    });
    if (freeRequired.length > 0) {
      const perCourseCounts = await Promise.all(
        freeRequired.map((r) =>
          this.prisma.lesson.count({
            where: { module: { course_id: r.course_id }, is_published: true },
          })
        )
      );
      totalLessons += perCourseCounts.reduce((a, b) => a + b, 0);
    }
    const completedLessons = enrollment.lesson_progress.length;
    const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Note: enrollment.status only moves to "completed" once the admin grants a
    // certificate after the proctored exam (see certificates.service.ts `issue()`).
    // Finishing lesson content just means the exam can now be booked — it must not
    // flip the same status the admin's certificate step-bar treats as "exam complete".
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress_percentage: pct,
        last_accessed_at: new Date(),
      },
    });

    if (pct === 100) {
      await this.notifications.create(
        userId,
        "course_completed",
        "Course content completed!",
        "You have completed all lessons. You can now take the certification exam.",
        { enrollment_id: enrollmentId }
      );
    }
  }

  // ─── Quiz Submission ──────────────────────────────────────────────────

  async submitQuiz(enrollmentId: string, lessonId: string, userId: string, dto: SubmitQuizDto) {
    await this.assertEnrollment(enrollmentId, userId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { quiz_questions: { orderBy: { sort_order: "asc" } } },
    });
    if (!lesson || lesson.type !== "quiz") throw new BadRequestException("Lesson is not a quiz");

    // Check attempt limits
    const existingProgress = await this.prisma.lessonProgress.findUnique({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    });
    const attempts = existingProgress?.quiz_attempts ?? 0;
    const maxAttempts = lesson.max_attempts ?? 3;
    if (attempts >= maxAttempts) {
      throw new BadRequestException(`Maximum attempts (${maxAttempts}) reached`);
    }

    // Auto-grade multiple choice and true/false
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const q of lesson.quiz_questions) {
      totalPoints += q.points;
      if (q.question_type === "short_answer") continue; // manual grade
      const studentAnswer = dto.answers[q.id];
      if (studentAnswer !== undefined && Number(studentAnswer) === q.correct_index) {
        earnedPoints += q.points;
      }
    }

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passingScore = lesson.passing_score ?? 70;
    const passed = scorePercent >= passingScore;

    const progress = await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: passed,
        completed_at: passed ? new Date() : null,
        quiz_score: scorePercent,
        quiz_passed: passed,
        quiz_attempts: 1,
      },
      update: {
        quiz_score: scorePercent,
        quiz_passed: passed,
        quiz_attempts: { increment: 1 },
        completed: passed,
        completed_at: passed ? new Date() : existingProgress?.completed_at,
        updated_at: new Date(),
      },
    });

    if (passed) await this.recalculateProgress(enrollmentId, userId);

    return {
      score: scorePercent,
      passed,
      passing_score: passingScore,
      earned_points: earnedPoints,
      total_points: totalPoints,
      attempts_used: attempts + 1,
      max_attempts: maxAttempts,
    };
  }

  // ─── Assignment Submission ────────────────────────────────────────────
  // Mirrors PrepCoursesService.submitCourseAssignment() (Course Builder's
  // assignment lesson type) — same attempt-history model, availability
  // window, late policy, and multi-file support. The one deliberate
  // difference: completion still only happens once an admin/professor
  // grades the submission (see gradeSubmission → completeGradedAssignment
  // in courses.service.ts), not on submit. Certification lesson completion
  // gates exam-booking eligibility, so marking a lesson "done" the moment an
  // ungraded assignment is submitted would let a student become
  // exam-eligible before anyone has actually reviewed their work — unlike a
  // Course, there's a real downstream consequence here, so this older,
  // stricter behavior is intentionally preserved.

  async submitAssignment(enrollmentId: string, lessonId: string, userId: string, dto: SubmitAssignmentDto) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId, status: "active" },
    });
    if (!enrollment) throw new ForbiddenException("No active enrollment found");

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { certification: { include: { instructors: true } } } } },
    });
    if (!lesson || lesson.type !== "assignment") throw new BadRequestException("Lesson is not an assignment");
    if (!lesson.module.certification_id || lesson.module.certification_id !== enrollment.certification_id) {
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
      // attempt history is preserved.
      await tx.assignmentSubmission.updateMany({
        where: { lesson_id: lessonId, user_id: userId, is_latest: true },
        data: { is_latest: false },
      });
      return tx.assignmentSubmission.create({
        data: {
          lesson_id: lessonId,
          user_id: userId,
          enrollment_id: enrollmentId,
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

    // Mark lesson as in-progress (completed only when graded — see the note
    // on this method for why that gate matters here specifically).
    await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
      },
      update: { completed: false, completed_at: null, updated_at: new Date() },
    });

    // Notify instructors
    for (const instructor of (lesson.module.certification?.instructors ?? [])) {
      await this.notifications.create(
        instructor.user_id,
        "assignment_submitted",
        "New assignment submission",
        `A student submitted "${lesson.title}"${isLate ? " (late)" : ""}`,
        { lesson_id: lessonId, submission_id: submission.id }
      );
    }

    return submission;
  }

  // ─── My Assignments ───────────────────────────────────────────────────

  async getMyAssignments(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: userId, status: "active" },
      include: {
        certification: { select: { id: true, acronym: true, title: true } },
        assignment_submissions: {
          include: {
            lesson: { select: { id: true, title: true, due_date: true, max_score: true } },
          },
        },
      },
    });

    // Find all assignment-type lessons for active enrollments
    const certIds = enrollments.map((e) => e.certification_id);
    const assignmentLessons = await this.prisma.lesson.findMany({
      where: {
        type: "assignment",
        is_published: true,
        module: { certification_id: { in: certIds } },
      },
      include: {
        module: {
          select: {
            certification_id: true,
            certification: { select: { acronym: true, title: true } },
          },
        },
        assignment_submissions: {
          where: { user_id: userId, is_latest: true },
        },
      },
    });

    return assignmentLessons.map((lesson) => ({
      lesson_id: lesson.id,
      title: lesson.title,
      due_date: lesson.due_date,
      max_score: lesson.max_score,
      certification: lesson.module.certification,
      submission: lesson.assignment_submissions[0] ?? null,
    }));
  }

  // ─── Student Grades ───────────────────────────────────────────────────
  // One call for every certification enrollment the student has — the
  // Grades page used to fetch this per-enrollment (driven by a pill
  // switcher) and separately fetch course grades; now that Courses are
  // shown independently of any single certification (see
  // PrepCoursesService.getMyCourseGrades), this only needs to return each
  // certification's own native quiz/assignment content (lessons on its own
  // modules, not part of any Course) plus exam attempts — courses are
  // handled entirely on the course-grades endpoint instead of being merged
  // in here, so nothing is ever double-counted between the two.

  async getMyCertificationContent(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { user_id: userId },
      include: {
        certification: {
          select: {
            id: true, acronym: true, title: true, level: true,
            modules: {
              where: { course_id: null },
              include: {
                lessons: {
                  where: { type: { in: ["quiz", "assignment"] }, is_published: true },
                  select: { id: true, title: true, type: true, max_score: true, passing_score: true },
                },
              },
            },
          },
        },
        lesson_progress: { where: { quiz_score: { not: null } } },
        assignment_submissions: { where: { grade: { not: null }, is_latest: true } },
        exam_attempts: { orderBy: { attempt_number: "desc" } },
      },
      orderBy: { enrolled_at: "desc" },
    });

    return enrollments.map((enrollment) => {
      const quizScores = enrollment.lesson_progress.reduce<Record<string, number>>((acc, lp) => {
        if (lp.quiz_score !== null) acc[lp.lesson_id] = lp.quiz_score;
        return acc;
      }, {});
      const assignmentGrades = enrollment.assignment_submissions.reduce<Record<string, { grade: number; feedback: string | null }>>((acc, s) => {
        if (s.grade !== null) acc[s.lesson_id] = { grade: s.grade, feedback: s.feedback };
        return acc;
      }, {});

      const nativeItems = enrollment.certification.modules.flatMap((m) =>
        m.lessons.map((l) => ({
          lesson_id: l.id,
          title: l.title,
          type: l.type,
          max_score: l.max_score,
          passing_score: l.passing_score,
          ...(l.type === "quiz"
            ? { score: quizScores[l.id] ?? null, passed: quizScores[l.id] !== undefined ? quizScores[l.id] >= (l.passing_score ?? 70) : null }
            : { grade: assignmentGrades[l.id]?.grade ?? null, feedback: assignmentGrades[l.id]?.feedback ?? null }
          ),
        }))
      );

      return {
        enrollment_id: enrollment.id,
        certification: {
          id: enrollment.certification.id,
          acronym: enrollment.certification.acronym,
          title: enrollment.certification.title,
          level: enrollment.certification.level,
        },
        native_items: nativeItems,
        exam_attempts: enrollment.exam_attempts,
      };
    });
  }
}
