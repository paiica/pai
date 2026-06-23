import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CompleteLessonDto } from "./dto/complete-lesson.dto";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { SubmitAssignmentDto } from "./dto/submit-assignment.dto";
import { UpdateProgressDto } from "./dto/update-progress.dto";

@Injectable()
export class LearningService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ─── Course Access ────────────────────────────────────────────────────

  private async assertEnrollment(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId, status: "active" },
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

    const modules = enrollment.certification.modules.map((mod) => ({
      ...mod,
      lessons: mod.lessons.map((lesson) => ({
        ...lesson,
        completed: completedLessonIds.has(lesson.id),
        progress: progressMap.get(lesson.id) ?? null,
      })),
      completed_count: mod.lessons.filter((l) => completedLessonIds.has(l.id)).length,
      total_count: mod.lessons.length,
    }));

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
      },
      modules,
      last_attempt: enrollment.exam_attempts[0] ?? null,
      certificate: enrollment.certificate ?? null,
    };
  }

  async getLessonContent(enrollmentId: string, lessonId: string, userId: string) {
    await this.assertEnrollment(enrollmentId, userId);

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
            certification: { select: { id: true, passing_score: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException("Lesson not found");

    if (!lesson.module.certification) throw new NotFoundException("Lesson module has no associated certification");
    // Verify lesson belongs to this enrollment's certification
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, certification_id: lesson.module.certification.id },
    });
    if (!enrollment) throw new ForbiddenException("Lesson is not part of your enrollment");

    // Load student's progress for this lesson
    const progress = await this.prisma.lessonProgress.findUnique({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
    });

    // Load assignment submission if applicable
    let submission = null;
    if (lesson.type === "assignment") {
      submission = await this.prisma.assignmentSubmission.findUnique({
        where: { lesson_id_user_id: { lesson_id: lessonId, user_id: userId } },
      });
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
      navigation: {
        prev: siblings[currentIdx - 1] ?? null,
        next: siblings[currentIdx + 1] ?? null,
        position: currentIdx + 1,
        total: siblings.length,
      },
    };
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

    const totalLessons = enrollment.certification.modules.reduce(
      (sum, m) => sum + m.lessons.length, 0
    );
    const completedLessons = enrollment.lesson_progress.length;
    const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress_percentage: pct,
        last_accessed_at: new Date(),
        ...(pct === 100 && enrollment.status === "active"
          ? { status: "completed", completed_at: new Date() }
          : {}),
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

  async submitAssignment(enrollmentId: string, lessonId: string, userId: string, dto: SubmitAssignmentDto) {
    await this.assertEnrollment(enrollmentId, userId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { certification: { include: { instructors: true } } } } },
    });
    if (!lesson || lesson.type !== "assignment") throw new BadRequestException("Lesson is not an assignment");
    if (!dto.file_url && !dto.text_content) {
      throw new BadRequestException("Either file or text content is required");
    }

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { lesson_id_user_id: { lesson_id: lessonId, user_id: userId } },
      create: {
        lesson_id: lessonId,
        user_id: userId,
        enrollment_id: enrollmentId,
        file_url: dto.file_url,
        file_name: dto.file_name,
        file_size: dto.file_size,
        text_content: dto.text_content,
        status: "submitted",
        submitted_at: new Date(),
      },
      update: {
        file_url: dto.file_url,
        file_name: dto.file_name,
        file_size: dto.file_size,
        text_content: dto.text_content,
        status: "submitted",
        submitted_at: new Date(),
        grade: null,
        feedback: null,
        graded_by: null,
        graded_at: null,
        updated_at: new Date(),
      },
    });

    // Mark lesson as in-progress (completed only when graded)
    await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: false,
      },
      update: { updated_at: new Date() },
    });

    // Notify instructors
    for (const instructor of (lesson.module.certification?.instructors ?? [])) {
      await this.notifications.create(
        instructor.user_id,
        "assignment_submitted",
        "New assignment submission",
        `A student submitted "${lesson.title}"`,
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
          where: { user_id: userId },
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

  async getMyGrades(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
      include: {
        certification: {
          include: {
            modules: {
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
        assignment_submissions: { where: { grade: { not: null } } },
        exam_attempts: { orderBy: { attempt_number: "desc" } },
      },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    const quizScores = enrollment.lesson_progress.reduce<Record<string, number>>((acc, lp) => {
      if (lp.quiz_score !== null) acc[lp.lesson_id] = lp.quiz_score;
      return acc;
    }, {});

    const assignmentGrades = enrollment.assignment_submissions.reduce<Record<string, { grade: number; feedback: string | null }>>((acc, s) => {
      if (s.grade !== null) acc[s.lesson_id] = { grade: s.grade, feedback: s.feedback };
      return acc;
    }, {});

    const gradedItems = enrollment.certification.modules.flatMap((m) =>
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
      enrollment_id: enrollmentId,
      progress_percentage: enrollment.progress_percentage,
      graded_items: gradedItems,
      exam_attempts: enrollment.exam_attempts,
    };
  }
}
