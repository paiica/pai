import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from "@nestjs/common";
// ─── Types ───────────────────────────────────────────────────────────────────
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubmitAssignmentDto } from "../learning/dto/submit-assignment.dto";
import { GradeSubmissionDto } from "../courses/dto/grade-submission.dto";
import { CompleteLessonDto } from "../learning/dto/complete-lesson.dto";
import { UpdateProgressDto } from "../learning/dto/update-progress.dto";

@Injectable()
export class PrepCoursesService {
  private static readonly MAX_ASSIGNMENT_ATTEMPTS = 2;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
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
          FROM lms.lessons l WHERE l.module_id = m.id AND l.is_published = true
        ), '[]'::json) AS lessons
      FROM lms.modules m
      WHERE m.course_id = $1 AND m.is_published = true
      ORDER BY m.sort_order ASC
    `, enrollment.course_id);

    return { ...enrollment, modules };
  }

  async getCourseLessonContent(enrollmentId: string, lessonId: string, userId: string) {
    const enrollRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT course_id FROM lms.course_enrollments WHERE id = $1 AND user_id = $2
    `, enrollmentId, userId);
    if (!enrollRows.length) throw new ForbiddenException('Enrollment not found');

    const lessonRows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT l.id, l.title, l.description, l.type::text AS type, l.content_body, l.video_url,
             l.download_url, l.allow_download, l.external_url,
             l.duration_minutes::int, l.passing_score::int, l.max_attempts::int,
             l.max_score::int, l.due_date, l.allow_text_response, l.text_word_limit::int,
             m.id AS module_id, m.title AS module_title, m.sort_order::int AS module_order
      FROM lms.lessons l
      JOIN lms.modules m ON m.id = l.module_id
      WHERE l.id = $1 AND m.course_id = $2 AND l.is_published = true
    `, lessonId, enrollRows[0].course_id);
    if (!lessonRows.length) throw new NotFoundException('Lesson not found');
    const lesson = lessonRows[0];

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
      lesson.submission = await this.prisma.assignmentSubmission.findUnique({
        where: { lesson_id_user_id: { lesson_id: lessonId, user_id: userId } },
      });
    }

    return lesson;
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

  async completeCourseLesson(enrollmentId: string, lessonId: string, userId: string, dto: CompleteLessonDto) {
    await this.assertCourseEnrollment(enrollmentId, userId);

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

    await this.prisma.courseEnrollment.update({
      where: { id: courseEnrollmentId },
      data: {
        progress_percentage: pct,
        ...(pct === 100 && !enrollment.completed_at ? { completed_at: new Date() } : {}),
      },
    });
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
    if (!dto.file_url && !dto.text_content) {
      throw new BadRequestException("Either file or text content is required");
    }

    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { lesson_id_user_id: { lesson_id: lessonId, user_id: userId } },
    });
    if (existing) {
      if (existing.grade !== null && existing.grade !== undefined) {
        throw new BadRequestException("This assignment has already been graded and can no longer be resubmitted.");
      }
      if (existing.attempt_count >= PrepCoursesService.MAX_ASSIGNMENT_ATTEMPTS) {
        throw new BadRequestException(`Maximum of ${PrepCoursesService.MAX_ASSIGNMENT_ATTEMPTS} submission attempts reached.`);
      }
    }

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { lesson_id_user_id: { lesson_id: lessonId, user_id: userId } },
      create: {
        lesson_id: lessonId,
        user_id: userId,
        course_enrollment_id: enrollmentId,
        file_url: dto.file_url,
        file_name: dto.file_name,
        file_size: dto.file_size,
        text_content: dto.text_content,
        status: "submitted",
        submitted_at: new Date(),
        attempt_count: 1,
      },
      update: {
        file_url: dto.file_url,
        file_name: dto.file_name,
        file_size: dto.file_size,
        text_content: dto.text_content,
        status: "submitted",
        submitted_at: new Date(),
        attempt_count: { increment: 1 },
        updated_at: new Date(),
      },
    });

    for (const teacher of (lesson.module.course?.instructors ?? [])) {
      await this.notifications.create(
        teacher.user_id,
        "assignment_submitted",
        "New assignment submission",
        `A student submitted "${lesson.title}"`,
        { lesson_id: lessonId, submission_id: submission.id }
      );
    }

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

  // ─── Submissions & Grading (professor) ────────────────────────────────

  async getCourseSubmissions(courseId: string, userId: string, role: Role) {
    await this.assertTeacherAccess(courseId, userId, role);
    return this.prisma.assignmentSubmission.findMany({
      where: {
        lesson: { module: { course_id: courseId } },
      },
      include: {
        user: { include: { profile: { select: { first_name: true, last_name: true, display_name: true } } } },
        lesson: { select: { id: true, title: true, max_score: true, due_date: true } },
      },
      orderBy: { submitted_at: "desc" },
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

  // ─── Recommendations (course ↔ cert, many-to-many) ───────────────────

  async adminGetRecommendations(courseId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT r.certification_id, r.is_required, cert.title, cert.acronym, cert.slug
      FROM lms.course_cert_recommendations r
      JOIN lms.certifications cert ON cert.id = r.certification_id
      WHERE r.course_id = $1
      ORDER BY cert.title
    `, courseId);
  }

  async adminSetRecommendations(courseId: string, items: { certification_id: string; is_required?: boolean }[]) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_cert_recommendations WHERE course_id = $1`, courseId
    );
    for (const item of items) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO lms.course_cert_recommendations (course_id, certification_id, is_required)
         VALUES ($1, $2, $3::boolean) ON CONFLICT DO NOTHING`,
        courseId, item.certification_id, item.is_required ?? false,
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
             COALESCE(r.is_required, false) AS is_required
      FROM lms.courses c
      LEFT JOIN lms.course_cert_recommendations r
        ON r.course_id = c.id AND r.certification_id = $1
      WHERE c.status != 'archived'
      ORDER BY c.title
    `, certificationId);
  }

  async adminSetCoursesForCertification(certificationId: string, items: { course_id: string; is_required?: boolean }[]) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_cert_recommendations WHERE certification_id = $1`, certificationId
    );
    for (const item of items) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO lms.course_cert_recommendations (course_id, certification_id, is_required)
         VALUES ($1, $2, $3::boolean) ON CONFLICT DO NOTHING`,
        item.course_id, certificationId, item.is_required ?? false,
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

  async getIncompleteRequiredCourses(userId: string, certificationId: string): Promise<string[]> {
    const required = await this.prisma.courseCertRecommendation.findMany({
      where: { certification_id: certificationId, is_required: true },
      include: { course: { select: { id: true, title: true } } },
    });
    if (!required.length) return [];

    const missing: string[] = [];
    for (const r of required) {
      const done = await this.prisma.courseEnrollment.findFirst({
        where: { user_id: userId, course_id: r.course_id, completed_at: { not: null } },
      });
      if (!done) missing.push(r.course.title);
    }
    return missing;
  }

  async getRecommendedCoursesByCert(certificationId: string) {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.title, c.slug, c.subtitle, c.description, c.price::text, c.level,
             c.duration_hours::text, c.thumbnail_url, c.status,
             cert.acronym AS cert_acronym, cert.title AS cert_title,
             (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count
      FROM lms.course_cert_recommendations r
      JOIN lms.courses c ON c.id = r.course_id AND c.status = 'active'
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE r.certification_id = $1
        AND c.certification_id IS DISTINCT FROM $1
      ORDER BY c.title
    `, certificationId);
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

  async findAll() {
    return this.prisma.$queryRawUnsafe<any[]>(`
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
      WHERE c.status = 'active'
      ORDER BY c.sort_order ASC, c.created_at DESC
    `);
  }

  async findFeatured() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.id, c.slug, c.title, c.subtitle, c.description, c.price, c.level,
             c.duration_hours, c.thumbnail_url, c.is_featured,
             (SELECT COUNT(*) FROM lms.modules m WHERE m.course_id = c.id)::int AS module_count,
             cert.acronym AS cert_acronym, cert.title AS cert_title
      FROM lms.courses c
      LEFT JOIN lms.certifications cert ON cert.id = c.certification_id
      WHERE c.status = 'active' AND c.is_featured = true
      ORDER BY c.sort_order ASC, c.created_at DESC
    `);
  }

  async findBySlug(slug: string) {
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
              FROM lms.lessons l WHERE l.module_id = m.id AND l.is_published = true
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
    return rows[0];
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
                'sort_order', l.sort_order
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
      `SELECT certification_id, is_required FROM lms.course_cert_recommendations WHERE course_id = $1`, id
    );
    course.recommended_cert_ids = recs.map((r) => r.certification_id);
    course.required_cert_ids = recs.filter((r) => r.is_required).map((r) => r.certification_id);
    const prereqs = await this.prisma.coursePrerequisite.findMany({
      where: { course_id: id },
      select: { prerequisite_course_id: true, type: true },
    });
    course.prerequisite_course_ids = prereqs.filter((p) => p.type === "prerequisite").map((p) => p.prerequisite_course_id);
    course.corequisite_course_ids = prereqs.filter((p) => p.type === "corequisite").map((p) => p.prerequisite_course_id);
    return course;
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
    return rows[0];
  }

  async adminUpdate(id: string, dto: Record<string, any>) {
    const allowed = [
      'title', 'subtitle', 'description', 'price', 'status', 'thumbnail_url',
      'preview_video_url', 'level', 'duration_hours', 'pdu_value', 'certification_id',
      'sort_order', 'slug', 'total_lessons', 'is_featured', 'content',
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
      } else if (['price', 'duration_hours', 'pdu_value'].includes(key)) {
        sets.push(`"${key}" = $${p}::numeric`);
      } else if (['sort_order', 'total_lessons'].includes(key)) {
        sets.push(`"${key}" = $${p}::int`);
      } else if (key === 'is_featured') {
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
    return this.adminGetOne(id);
  }

  async adminDeleteEnrollment(enrollmentId: string) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM lms.course_enrollments WHERE id = $1`,
      enrollmentId,
    );
    return { message: "Enrollment deleted" };
  }

  async adminDelete(id: string) {
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
          'text_word_limit', l.text_word_limit::int
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
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT s.id, s.lesson_id, s.user_id, s.status::text, s.submitted_at,
             s.file_url, s.file_name, s.text_content, s.grade, s.max_grade, s.feedback,
             l.title AS lesson_title, m.title AS module_title,
             p.first_name, p.last_name, p.avatar_url
      FROM lms.assignment_submissions s
      JOIN lms.lessons l ON l.id = s.lesson_id
      JOIN lms.modules m ON m.id = l.module_id
      JOIN lms.profiles p ON p.user_id = s.user_id
      WHERE m.course_id = $1
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
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.modules WHERE id = $1`, moduleId);
    return { message: "Module deleted" };
  }

  async adminCreateLesson(courseId: string, moduleId: string, dto: Record<string, any>) {
    const { title, content, duration_minutes, order_index, type } = dto;
    if (!title?.trim()) throw new BadRequestException("Lesson title is required");

    const moduleRows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.modules WHERE id = $1 AND course_id = $2`,
      moduleId, courseId,
    );
    if (!moduleRows.length) throw new NotFoundException("Module not found");

    const lessonType = type || 'reading';
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.lessons (id, module_id, title, content_body, type, duration_minutes, sort_order, is_published, is_free_preview, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4::lms."LessonType", $5, $6, true, false, now(), now()) RETURNING *
    `, moduleId, title, content || null, lessonType, duration_minutes ?? 0, order_index ?? 0);
    return rows[0];
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
    const { title, content_body, video_url, download_url, allow_download, external_url,
            duration_minutes, type, is_published,
            passing_score, max_attempts, max_score, due_date,
            allow_text_response, text_word_limit } = dto;
    const updated = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE lms.lessons SET
        title = COALESCE($1, title),
        content_body = COALESCE($2, content_body),
        video_url = COALESCE($3, video_url),
        download_url = COALESCE($4, download_url),
        allow_download = COALESCE($5, allow_download),
        external_url = COALESCE($6, external_url),
        duration_minutes = COALESCE($7, duration_minutes),
        type = COALESCE($8::lms."LessonType", type),
        is_published = COALESCE($9, is_published),
        passing_score = COALESCE($10, passing_score),
        max_attempts = COALESCE($11, max_attempts),
        max_score = COALESCE($12, max_score),
        due_date = COALESCE($13, due_date),
        allow_text_response = COALESCE($15, allow_text_response),
        text_word_limit = $16,
        updated_at = now()
      WHERE id = $14 RETURNING *
    `, title ?? null, content_body ?? null, video_url ?? null, download_url ?? null,
       allow_download ?? null, external_url ?? null, duration_minutes ?? null, type ?? null,
       is_published ?? null, passing_score ?? null, max_attempts ?? null, max_score ?? null,
       due_date ?? null, lessonId,
       allow_text_response ?? null, text_word_limit ?? null);
    return updated[0];
  }

  async adminDeleteLesson(courseId: string, moduleId: string, lessonId: string) {
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
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.modules WHERE id = $1`, moduleId);
    return { message: "Module deleted" };
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
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;
    for (const key of allowed) {
      if (!(key in dto)) continue;
      const cast = key === "type" ? `::lms."LessonType"` : "";
      sets.push(`"${key}" = $${p}${cast}`);
      vals.push(dto[key]);
      p++;
    }
    if (!sets.length) return;
    sets.push(`updated_at = now()`);
    vals.push(lessonId);
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.lessons SET ${sets.join(', ')} WHERE id = $${p}`,
      ...vals,
    );
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.lessons WHERE id = $1`, lessonId,
    );
    return rows[0];
  }

  async deleteCourseLesson(lessonId: string, userId: string, role: Role) {
    await this.assertLessonCourseAccess(lessonId, userId, role);
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.lessons WHERE id = $1`, lessonId);
    return { message: "Lesson deleted" };
  }
}
