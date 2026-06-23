import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from "@nestjs/common";
// ─── Types ───────────────────────────────────────────────────────────────────
import { Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PrepCoursesService {
  constructor(private prisma: PrismaService) {}

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
      `SELECT m.course_id FROM lms.lessons l JOIN lms.modules m ON m.id = l.module_id WHERE l.id = $1 AND m.course_id IS NOT NULL`,
      lessonId,
    );
    if (!rows.length) throw new NotFoundException("Lesson not found");
    await this.assertTeacherAccess(rows[0].course_id, userId, role);
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
      SELECT l.id, l.title, l.type::text AS type, l.content_body, l.video_url,
             l.download_url, l.allow_download, l.external_url,
             l.duration_minutes::int, l.passing_score::int, l.max_attempts::int,
             m.id AS module_id, m.title AS module_title, m.sort_order::int AS module_order
      FROM lms.lessons l
      JOIN lms.modules m ON m.id = l.module_id
      WHERE l.id = $1 AND m.course_id = $2 AND l.is_published = true
    `, lessonId, enrollRows[0].course_id);
    if (!lessonRows.length) throw new NotFoundException('Lesson not found');
    return lessonRows[0];
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
            'avatar_url', p.avatar_url, 'bio', p.bio
          ))
          FROM lms.course_teachers ct JOIN lms.profiles p ON p.user_id = ct.user_id
          WHERE ct.course_id = c.id
        ) AS instructors
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
      JOIN lms.profiles p ON p.user_id = u.id
      ORDER BY ce.enrolled_at DESC
    `);
  }

  async adminGetAll() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT c.*,
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
    return rows[0];
  }

  async adminCreate(dto: Record<string, any>) {
    const {
      slug, title, subtitle, description, price = 0, status = 'draft',
      thumbnail_url, preview_video_url, level = 'beginner',
      duration_hours = 0, certification_id, sort_order = 0,
    } = dto;
    if (!slug || !title) throw new BadRequestException("slug and title are required");

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.courses (
        id, slug, title, subtitle, description, price, status,
        thumbnail_url, preview_video_url, level, duration_hours,
        certification_id, sort_order, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5::numeric, $6::lms."CourseStatus",
        $7, $8, $9::lms."CourseLevel", $10::numeric,
        $11, $12, now(), now()
      ) RETURNING *
    `, slug, title, subtitle ?? null, description ?? null,
       price, status, thumbnail_url ?? null, preview_video_url ?? null,
       level, duration_hours, certification_id ?? null, sort_order);
    return rows[0];
  }

  async adminUpdate(id: string, dto: Record<string, any>) {
    const allowed = [
      'title', 'subtitle', 'description', 'price', 'status', 'thumbnail_url',
      'preview_video_url', 'level', 'duration_hours', 'certification_id',
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
      } else if (['price', 'duration_hours'].includes(key)) {
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

  async adminDelete(id: string) {
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
      VALUES (gen_random_uuid(), $1, $2, $3, $4, false, now(), now()) RETURNING *
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
      VALUES (gen_random_uuid(), $1, $2, $3, $4::lms."LessonType", $5, $6, false, false, now(), now()) RETURNING *
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
      'video_url', 'content_body', 'download_url', 'is_free_preview',
    ];
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
