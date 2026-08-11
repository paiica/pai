import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AiService } from "../ai/ai.service";

@Injectable()
export class ProgramsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private aiService: AiService,
  ) {}

  // ─── Admin: CRUD ─────────────────────────────────────────────────────────

  async adminList({ page = 1, limit = 25, q, status }: { page: number; limit: number; q?: string; status?: string }) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (q) where.title = { contains: q, mode: "insensitive" };

    const [rows, total] = await Promise.all([
      this.prisma.program.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { courses: true, enrollments: true } },
        },
      }),
      this.prisma.program.count({ where }),
    ]);

    return {
      data: rows.map((p) => ({
        id: p.id, slug: p.slug, title: p.title, level: p.level, status: p.status,
        price: Number(p.price), currency: p.currency,
        course_count: p._count.courses, learner_count: p._count.enrollments,
        created_at: p.created_at,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminGetOne(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: {
        courses: {
          orderBy: { sort_order: "asc" },
          include: { course: { select: { id: true, title: true, subtitle: true, thumbnail_url: true, level: true, duration_hours: true, status: true, price: true, is_listed: true } } },
        },
        instructors: {
          include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true, avatar_url: true } } } } },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!program) throw new NotFoundException("Program not found");
    return {
      ...program,
      price: Number(program.price),
      estimated_hours: program.estimated_hours ? Number(program.estimated_hours) : null,
      learner_count: program._count.enrollments,
      courses: program.courses.map((pc) => ({
        id: pc.id, course_id: pc.course_id, sort_order: pc.sort_order, is_required: pc.is_required,
        special_type: pc.special_type, special_metadata: pc.special_metadata,
        course: { ...pc.course, price: Number(pc.course.price), duration_hours: Number(pc.course.duration_hours) },
      })),
    };
  }

  // Drafts overview/marketing copy from the program's actual bundled courses
  // (including its capstone/internship course, if any) — mirrors the
  // Course/Certification "Fill from Build" feature, adapted since a
  // Program's "build" is a set of existing Course rows rather than
  // modules/lessons it owns directly.
  async adminGenerateOverviewFromBuild(programId: string) {
    const program = await this.prisma.program.findUnique({
      where: { id: programId },
      include: {
        courses: {
          orderBy: { sort_order: "asc" },
          include: { course: { select: { title: true, description: true, subtitle: true } } },
        },
      },
    });
    if (!program) throw new NotFoundException("Program not found");
    if (!program.courses.length) throw new BadRequestException("Add at least one course to the curriculum before drafting from the build");

    const capstoneCourse = program.courses.find((pc) => pc.special_type);

    return this.aiService.generateProgramOverviewFromBuild({
      title: program.title,
      level: program.level,
      courses: program.courses.map((pc) => ({
        title: pc.course.title,
        description: pc.course.description ?? pc.course.subtitle ?? undefined,
        is_required: pc.is_required,
      })),
      capstone: capstoneCourse ? { title: capstoneCourse.course.title, description: capstoneCourse.course.description ?? undefined } : null,
    });
  }

  // ─── Admin: instructors ──────────────────────────────────────────────────

  async adminAssignInstructor(programId: string, userId: string, isLead: boolean) {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundException("Program not found");
    const existing = await this.prisma.programInstructor.findUnique({
      where: { program_id_user_id: { program_id: programId, user_id: userId } },
    });
    if (existing) throw new BadRequestException("This user is already assigned as an instructor");
    return this.prisma.programInstructor.create({ data: { program_id: programId, user_id: userId, is_lead: isLead } });
  }

  async adminRemoveInstructor(programId: string, userId: string) {
    const row = await this.prisma.programInstructor.findUnique({
      where: { program_id_user_id: { program_id: programId, user_id: userId } },
    });
    if (!row) throw new NotFoundException("Instructor not assigned to this program");
    await this.prisma.programInstructor.delete({ where: { id: row.id } });
    return { message: "Instructor removed" };
  }

  // ─── Admin: enrollments (global, across all programs) ───────────────────

  async adminListAllEnrollments({ page = 1, limit = 25, q, status, program_id }: { page: number; limit: number; q?: string; status?: string; program_id?: string }) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (program_id) where.program_id = program_id;
    if (q) {
      where.OR = [
        { program: { title: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.programEnrollment.findMany({
        where,
        orderBy: { enrolled_at: "desc" },
        skip,
        take: limit,
        include: {
          program: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
          certificate: { select: { id: true, certificate_number: true, status: true, issued_at: true, revoked_at: true } },
        },
      }),
      this.prisma.programEnrollment.count({ where }),
    ]);

    return {
      data: rows.map((e) => ({
        id: e.id, status: e.status, progress_percentage: e.progress_percentage,
        enrolled_at: e.enrolled_at, completed_at: e.completed_at,
        program: e.program, user: e.user, certificate: e.certificate,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Admin: certificate revoke / reactivate ──────────────────────────────

  async adminRevokeCertificate(certificateId: string, reason?: string) {
    const cert = await this.prisma.programCertificate.findUnique({ where: { id: certificateId } });
    if (!cert) throw new NotFoundException("Certificate not found");
    return this.prisma.programCertificate.update({
      where: { id: certificateId },
      data: { status: "revoked", revoked_at: new Date(), revocation_reason: reason || null },
    });
  }

  async adminReactivateCertificate(certificateId: string) {
    const cert = await this.prisma.programCertificate.findUnique({ where: { id: certificateId } });
    if (!cert) throw new NotFoundException("Certificate not found");
    return this.prisma.programCertificate.update({
      where: { id: certificateId },
      data: { status: "active", revoked_at: null, revocation_reason: null },
    });
  }

  private async generateSlug(title: string, excludeId?: string) {
    const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "program";
    for (let i = 0; ; i++) {
      const candidate = i === 0 ? base : `${base}-${i}`;
      const existing = await this.prisma.program.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!existing || existing.id === excludeId) return candidate;
    }
  }

  async adminCreate(dto: Record<string, any>, adminUserId: string) {
    if (!dto.title?.trim()) throw new BadRequestException("Title is required");
    const slug = dto.slug?.trim() ? dto.slug.trim() : await this.generateSlug(dto.title);
    return this.prisma.program.create({
      data: {
        title: dto.title.trim(),
        slug,
        code: dto.code || null,
        short_description: dto.short_description || null,
        description: dto.description || null,
        overview: dto.overview || null,
        learning_outcomes: dto.learning_outcomes ?? [],
        target_audience: dto.target_audience ?? [],
        prerequisites: dto.prerequisites ?? [],
        duration_weeks: dto.duration_weeks ?? null,
        estimated_hours: dto.estimated_hours ?? null,
        level: dto.level ?? "beginner",
        thumbnail_url: dto.thumbnail_url || null,
        price: dto.price ?? 0,
        currency: dto.currency || "USD",
        enrollment_type: dto.enrollment_type || null,
        enrollment_start_date: dto.enrollment_start_date ?? null,
        enrollment_end_date: dto.enrollment_end_date ?? null,
        max_learners: dto.max_learners ?? null,
        access_duration_days: dto.access_duration_days ?? null,
        allow_individual_course_purchase: dto.allow_individual_course_purchase ?? true,
        director_user_id: dto.director_user_id || null,
        certificate_title: dto.certificate_title || null,
        certificate_description: dto.certificate_description || null,
        faqs_json: dto.faqs_json ?? [],
        created_by: adminUserId,
      },
    });
  }

  async adminUpdate(id: string, dto: Record<string, any>) {
    const program = await this.prisma.program.findUnique({ where: { id } });
    if (!program) throw new NotFoundException("Program not found");

    const data: Record<string, any> = {};
    const fields = [
      "title", "code", "short_description", "description", "overview", "learning_outcomes",
      "target_audience", "prerequisites", "duration_weeks", "estimated_hours", "level",
      "thumbnail_url", "price", "currency", "is_featured", "faqs_json", "enrollment_type",
      "enrollment_start_date", "enrollment_end_date", "max_learners", "access_duration_days",
      "allow_individual_course_purchase", "director_user_id", "certificate_title", "certificate_description",
      "testimonials", "marketing_meta", "related_slugs",
    ];
    for (const f of fields) if (dto[f] !== undefined) data[f] = dto[f];
    if (dto.slug !== undefined && dto.slug.trim() && dto.slug.trim() !== program.slug) {
      data.slug = await this.generateSlug(dto.slug.trim(), id);
    }

    return this.prisma.program.update({ where: { id }, data });
  }

  async adminDelete(id: string) {
    await this.prisma.program.delete({ where: { id } });
    return { message: "Program deleted" };
  }

  async adminDuplicate(id: string) {
    const program = await this.adminGetOne(id);
    const newSlug = await this.generateSlug(`${program.title} copy`);
    const duplicate = await this.prisma.program.create({
      data: {
        title: `${program.title} (Copy)`,
        slug: newSlug,
        code: program.code,
        short_description: program.short_description,
        description: program.description,
        overview: program.overview,
        learning_outcomes: program.learning_outcomes,
        target_audience: program.target_audience,
        prerequisites: program.prerequisites,
        duration_weeks: program.duration_weeks,
        estimated_hours: program.estimated_hours,
        level: program.level,
        thumbnail_url: program.thumbnail_url,
        price: program.price,
        currency: program.currency,
        enrollment_type: program.enrollment_type,
        max_learners: program.max_learners,
        access_duration_days: program.access_duration_days,
        allow_individual_course_purchase: program.allow_individual_course_purchase,
        director_user_id: program.director_user_id,
        certificate_title: program.certificate_title,
        certificate_description: program.certificate_description,
        faqs_json: program.faqs_json as any,
        created_by: program.created_by,
        status: "draft",
      },
    });
    if (program.courses.length) {
      // Deliberately NOT copying special_type/special_metadata: a capstone/
      // internship course is a real Course row, and course_id is reused
      // as-is here (duplicating a program doesn't clone its courses). If
      // the original had one flagged, blindly carrying that flag over would
      // silently point two different programs' students at the exact same
      // course — and the exact same assignment submissions bucket. The
      // duplicate keeps the course in its curriculum, just as a plain
      // required/elective entry; the admin can flag a (new, distinct)
      // capstone course for it consciously if this copy needs its own.
      await this.prisma.programCourse.createMany({
        data: program.courses.map((pc: any) => ({
          program_id: duplicate.id, course_id: pc.course_id, sort_order: pc.sort_order, is_required: pc.is_required,
        })),
      });
    }
    return duplicate;
  }

  async adminSetStatus(id: string, status: "draft" | "published" | "archived") {
    const program = await this.prisma.program.findUnique({ where: { id }, include: { courses: true } });
    if (!program) throw new NotFoundException("Program not found");
    if (status === "published" && program.courses.length === 0) {
      throw new BadRequestException("Add at least one course before publishing");
    }
    return this.prisma.program.update({ where: { id }, data: { status } });
  }

  // ─── Admin: curriculum (courses) ────────────────────────────────────────

  async adminAddCourse(programId: string, courseId: string, isRequired = true) {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) throw new NotFoundException("Program not found");
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException("Course not found");

    const existing = await this.prisma.programCourse.findUnique({
      where: { program_id_course_id: { program_id: programId, course_id: courseId } },
    });
    if (existing) throw new BadRequestException("This course is already in the program");

    const maxOrder = await this.prisma.programCourse.aggregate({
      where: { program_id: programId },
      _max: { sort_order: true },
    });
    return this.prisma.programCourse.create({
      data: { program_id: programId, course_id: courseId, is_required: isRequired, sort_order: (maxOrder._max.sort_order ?? -1) + 1 },
    });
  }

  async adminRemoveCourse(programId: string, programCourseId: string) {
    const row = await this.prisma.programCourse.findFirst({ where: { id: programCourseId, program_id: programId } });
    if (!row) throw new NotFoundException("Course not found in this program");
    await this.prisma.programCourse.delete({ where: { id: programCourseId } });
    return { message: "Course removed from program" };
  }

  async adminSetCourseRequired(programId: string, programCourseId: string, isRequired: boolean) {
    const row = await this.prisma.programCourse.findFirst({ where: { id: programCourseId, program_id: programId } });
    if (!row) throw new NotFoundException("Course not found in this program");
    return this.prisma.programCourse.update({ where: { id: programCourseId }, data: { is_required: isRequired } });
  }

  // Accepts the full ordered list of this program's ProgramCourse ids —
  // reassigns sort_order = array index. Matches the "up/down reorder"
  // convention used elsewhere in this codebase (no drag-and-drop library
  // installed anywhere in the monorepo).
  async adminReorderCourses(programId: string, orderedProgramCourseIds: string[]) {
    const rows = await this.prisma.programCourse.findMany({ where: { program_id: programId }, select: { id: true } });
    const validIds = new Set(rows.map((r) => r.id));
    if (orderedProgramCourseIds.length !== rows.length || orderedProgramCourseIds.some((id) => !validIds.has(id))) {
      throw new BadRequestException("Reorder list must include exactly this program's current courses");
    }
    await this.prisma.$transaction(
      orderedProgramCourseIds.map((id, index) =>
        this.prisma.programCourse.update({ where: { id }, data: { sort_order: index } })
      )
    );
    return { message: "Curriculum reordered" };
  }

  // ─── Admin: capstone / internship (a flagged curriculum course) ─────────

  // Flags (or unflags) a bundled course as this program's capstone or
  // internship placement. It stays a real Course — this just (a) records
  // optional descriptive metadata alongside the ProgramCourse row, (b)
  // forces it required (a capstone/internship is never elective), and (c)
  // force-unlists the underlying Course so it never appears in the public
  // catalog — only reachable by admins, its instructors, or students
  // enrolled in this program (see canViewPrivateCourse in
  // prep-courses.service.ts). Submission/grading happens through that
  // course's own assignment lesson, not a separate endpoint.
  async adminSetCourseSpecialType(
    programId: string,
    programCourseId: string,
    dto: { special_type: "capstone" | "internship" | null; special_metadata?: Record<string, any> },
  ) {
    const row = await this.prisma.programCourse.findFirst({ where: { id: programCourseId, program_id: programId } });
    if (!row) throw new NotFoundException("Course not found in this program");

    const data: Record<string, any> = { special_type: dto.special_type };
    if (dto.special_metadata !== undefined) data.special_metadata = dto.special_metadata;

    if (dto.special_type) {
      data.is_required = true;
      await this.prisma.course.update({ where: { id: row.course_id }, data: { is_listed: false } });
    }

    return this.prisma.programCourse.update({ where: { id: programCourseId }, data });
  }

  // ─── Admin: course waivers ────────────────────────────────────────────────
  // Exempts a student from an individual required course — mirrors
  // Certification's EnrollmentCourseWaiver / setCourseWaiver pattern. A
  // waived course counts as "done" for both the sequential-unlock gate and
  // the overall completion check, without ever needing a real
  // CourseEnrollment.completed_at.

  async adminGetCourseWaivers(programEnrollmentId: string) {
    return this.prisma.programCourseWaiver.findMany({
      where: { program_enrollment_id: programEnrollmentId },
      include: {
        course: { select: { id: true, title: true } },
        waived_by_user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
      },
      orderBy: { waived_at: "desc" },
    });
  }

  async adminSetCourseWaiver(programEnrollmentId: string, courseId: string, adminUserId: string, reason?: string) {
    const enrollment = await this.prisma.programEnrollment.findUnique({ where: { id: programEnrollmentId } });
    if (!enrollment) throw new NotFoundException("Program enrollment not found");
    const programCourse = await this.prisma.programCourse.findUnique({
      where: { program_id_course_id: { program_id: enrollment.program_id, course_id: courseId } },
    });
    if (!programCourse) throw new BadRequestException("This course is not part of the program");

    const waiver = await this.prisma.programCourseWaiver.upsert({
      where: { program_enrollment_id_course_id: { program_enrollment_id: programEnrollmentId, course_id: courseId } },
      create: { program_enrollment_id: programEnrollmentId, course_id: courseId, waived_by: adminUserId, reason: reason || null },
      update: { reason: reason || null, waived_by: adminUserId, waived_at: new Date() },
    });
    await this.recalculateProgramProgress(programEnrollmentId);
    return waiver;
  }

  async adminRemoveCourseWaiver(programEnrollmentId: string, courseId: string) {
    await this.prisma.programCourseWaiver.delete({
      where: { program_enrollment_id_course_id: { program_enrollment_id: programEnrollmentId, course_id: courseId } },
    }).catch(() => { throw new NotFoundException("Waiver not found"); });
    await this.recalculateProgramProgress(programEnrollmentId);
    return { message: "Waiver removed" };
  }

  // ─── Public verification ─────────────────────────────────────────────────

  async verify(certificateNumber: string) {
    const cert = await this.prisma.programCertificate.findUnique({
      where: { certificate_number: certificateNumber },
      include: { user: { include: { profile: true } }, program: { select: { title: true } } },
    });
    if (!cert) throw new NotFoundException("Certificate not found");

    const holderName = cert.user.profile
      ? `${cert.user.profile.first_name ?? ""} ${cert.user.profile.last_name ?? ""}`.trim() || cert.user.email
      : cert.user.email;

    return {
      valid: cert.status === "active",
      name: holderName,
      cert: cert.program.title,
      issue_date: cert.issued_at.toISOString().split("T")[0],
      expiry_date: null, // Program certificates don't expire, unlike accredited Certificates
      status: cert.status,
    };
  }

  // ─── Public catalog ──────────────────────────────────────────────────────

  async findAll() {
    const programs = await this.prisma.program.findMany({
      where: { status: "published" },
      orderBy: { sort_order: "asc" },
      include: { _count: { select: { courses: true, enrollments: true } } },
    });
    return programs.map((p) => ({
      id: p.id, slug: p.slug, title: p.title, short_description: p.short_description,
      level: p.level, price: Number(p.price), currency: p.currency,
      duration_weeks: p.duration_weeks, estimated_hours: p.estimated_hours ? Number(p.estimated_hours) : null,
      thumbnail_url: p.thumbnail_url, is_featured: p.is_featured,
      course_count: p._count.courses,
    }));
  }

  async findBySlug(slug: string) {
    const program = await this.prisma.program.findUnique({
      where: { slug },
      include: {
        courses: {
          orderBy: { sort_order: "asc" },
          include: { course: { select: { id: true, title: true, subtitle: true, description: true, thumbnail_url: true, level: true, duration_hours: true, total_lessons: true } } },
        },
        director: { select: { profile: { select: { first_name: true, last_name: true, avatar_url: true, bio: true, job_title: true } } } },
        instructors: {
          include: {
            user: {
              select: {
                profile: {
                  select: {
                    first_name: true, last_name: true, avatar_url: true, bio: true, job_title: true,
                    company: true, years_experience: true, education_entries: true, experience_entries: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!program || program.status !== "published") throw new NotFoundException("Program not found");
    return {
      ...program,
      price: Number(program.price),
      estimated_hours: program.estimated_hours ? Number(program.estimated_hours) : null,
      courses: program.courses.map((pc) => ({
        id: pc.id, sort_order: pc.sort_order, is_required: pc.is_required,
        special_type: pc.special_type, special_metadata: pc.special_metadata,
        course: { ...pc.course, duration_hours: Number(pc.course.duration_hours) },
      })),
    };
  }

  // ─── Student ─────────────────────────────────────────────────────────────

  async getMyPrograms(userId: string) {
    const enrollments = await this.prisma.programEnrollment.findMany({
      where: { user_id: userId },
      include: { program: { select: { id: true, slug: true, title: true, thumbnail_url: true, certificate_title: true } } },
      orderBy: { enrolled_at: "desc" },
    });
    return enrollments.map((e) => ({
      enrollment_id: e.id, status: e.status, progress_percentage: e.progress_percentage,
      enrolled_at: e.enrolled_at, completed_at: e.completed_at, program: e.program,
    }));
  }

  // ─── Professor ───────────────────────────────────────────────────────────

  async getMyTaughtPrograms(professorId: string) {
    const rows = await this.prisma.programInstructor.findMany({
      where: { user_id: professorId },
      include: {
        program: {
          include: { _count: { select: { courses: true, enrollments: true } } },
        },
      },
      orderBy: { assigned_at: "desc" },
    });
    return rows.map((r) => ({
      id: r.program.id, slug: r.program.slug, title: r.program.title, status: r.program.status,
      level: r.program.level, is_lead: r.is_lead,
      course_count: r.program._count.courses, learner_count: r.program._count.enrollments,
    }));
  }

  async getMyCertificate(programId: string, userId: string) {
    const certificate = await this.prisma.programCertificate.findFirst({
      where: { program_id: programId, user_id: userId },
      include: { program: { select: { title: true, marketing_meta: true } } },
    });
    if (!certificate) throw new NotFoundException("No certificate issued for this program yet");
    return certificate;
  }

  async getProgramDashboard(programId: string, userId: string) {
    const enrollment = await this.prisma.programEnrollment.findUnique({
      where: { user_id_program_id: { user_id: userId, program_id: programId } },
    });
    if (!enrollment) throw new NotFoundException("You're not enrolled in this program");

    const program = await this.prisma.program.findUniqueOrThrow({
      where: { id: programId },
      include: {
        courses: { orderBy: { sort_order: "asc" }, include: { course: { select: { id: true, slug: true, title: true, subtitle: true, thumbnail_url: true, level: true, duration_hours: true } } } },
      },
    });

    const [courseEnrollments, waivers] = await Promise.all([
      this.prisma.courseEnrollment.findMany({
        where: { user_id: userId, course_id: { in: program.courses.map((pc) => pc.course_id) } },
      }),
      this.prisma.programCourseWaiver.findMany({ where: { program_enrollment_id: enrollment.id } }),
    ]);
    const byCourseId = new Map(courseEnrollments.map((ce) => [ce.course_id, ce]));
    const waivedCourseIds = new Set(waivers.map((w) => w.course_id));

    let firstIncompleteRequiredSeen = false;
    const curriculum = program.courses.map((pc) => {
      const ce = byCourseId.get(pc.course_id);
      const waived = waivedCourseIds.has(pc.course_id);
      const completed = waived || !!ce?.completed_at;
      let state: "completed" | "in_progress" | "locked" | "available";
      if (!pc.is_required) {
        state = completed ? "completed" : "available";
      } else if (completed) {
        state = "completed";
      } else if (!firstIncompleteRequiredSeen) {
        state = "in_progress";
        firstIncompleteRequiredSeen = true;
      } else {
        state = "locked";
      }
      return {
        program_course_id: pc.id, sort_order: pc.sort_order, is_required: pc.is_required,
        special_type: pc.special_type, special_metadata: pc.special_metadata,
        course: pc.course, state, waived,
        enrollment_id: ce?.id ?? null, progress_percentage: waived ? 100 : (ce?.progress_percentage ?? 0),
      };
    });

    return {
      enrollment: { id: enrollment.id, status: enrollment.status, progress_percentage: enrollment.progress_percentage, completed_at: enrollment.completed_at },
      program: { id: program.id, title: program.title, slug: program.slug, certificate_title: program.certificate_title },
      curriculum,
    };
  }

  // ─── Completion logic ───────────────────────────────────────────────────

  // Called from prep-courses.service.ts's recalculateCourseProgress() right
  // after a CourseEnrollment.completed_at gets set — cheap no-op for the
  // (overwhelming) majority of course completions that aren't part of any
  // Program.
  async onCourseCompleted(userId: string, courseId: string) {
    const programCourses = await this.prisma.programCourse.findMany({
      where: { course_id: courseId, is_required: true },
      select: { program_id: true },
    });
    if (!programCourses.length) return;

    const enrollments = await this.prisma.programEnrollment.findMany({
      where: { user_id: userId, program_id: { in: programCourses.map((pc) => pc.program_id) }, status: "active" },
      select: { id: true },
    });
    for (const e of enrollments) await this.recalculateProgramProgress(e.id);
  }

  // A program's capstone/internship course is now just another required
  // ProgramCourse row, so "all required courses done" already covers it —
  // no separate pass/fail gate needed (this app has no course-level
  // pass/fail concept anywhere else either; only certifications do, via
  // their own proctored exam).
  private async recalculateProgramProgress(programEnrollmentId: string) {
    const enrollment = await this.prisma.programEnrollment.findUnique({ where: { id: programEnrollmentId } });
    if (!enrollment || enrollment.status !== "active") return;

    const program = await this.prisma.program.findUniqueOrThrow({
      where: { id: enrollment.program_id },
      include: { courses: { where: { is_required: true } } },
    });

    const requiredCourseIds = program.courses.map((pc) => pc.course_id);
    let completedCount = 0;
    if (requiredCourseIds.length) {
      const [doneCount, waivedIds] = await Promise.all([
        this.prisma.courseEnrollment.count({
          where: { user_id: enrollment.user_id, course_id: { in: requiredCourseIds }, completed_at: { not: null } },
        }),
        this.prisma.programCourseWaiver.findMany({
          where: { program_enrollment_id: programEnrollmentId, course_id: { in: requiredCourseIds } },
          select: { course_id: true },
        }),
      ]);
      // A waived course might also happen to be genuinely completed — don't
      // double-count it.
      const waivedNotAlsoCompleted = await this.prisma.courseEnrollment.count({
        where: { user_id: enrollment.user_id, course_id: { in: waivedIds.map((w) => w.course_id) }, completed_at: null },
      });
      completedCount = doneCount + waivedNotAlsoCompleted;
    }

    const pct = requiredCourseIds.length > 0 ? Math.round((completedCount / requiredCourseIds.length) * 100) : 0;
    const shouldComplete = requiredCourseIds.length > 0 && completedCount === requiredCourseIds.length && !enrollment.completed_at;

    await this.prisma.programEnrollment.update({
      where: { id: programEnrollmentId },
      data: {
        progress_percentage: pct,
        ...(shouldComplete ? { status: "completed", completed_at: new Date() } : {}),
      },
    });

    if (shouldComplete) await this.issueProgramCertificate(enrollment.id, enrollment.user_id, enrollment.program_id);
  }

  private async issueProgramCertificate(programEnrollmentId: string, userId: string, programId: string) {
    const existing = await this.prisma.programCertificate.findUnique({ where: { program_enrollment_id: programEnrollmentId } });
    if (existing) return existing;

    const program = await this.prisma.program.findUniqueOrThrow({ where: { id: programId } });
    const certificateNumber = `PGM-${randomUUID().split("-")[0].toUpperCase()}`;
    const certificate = await this.prisma.programCertificate.create({
      data: {
        program_id: programId,
        program_enrollment_id: programEnrollmentId,
        user_id: userId,
        certificate_number: certificateNumber,
        title: program.certificate_title || `${program.title} — Certificate of Completion`,
        // Same public verify page as accredited Certificates
        // (marketing-site/app/verify) — it tries /certificates/verify/:id
        // first, then falls back to /programs/verify/:id for PGM- numbers.
        verification_url: `https://www.paii.ca/verify?id=${certificateNumber}`,
      },
    });

    this.notifications.create(
      userId,
      "system_announcement",
      "Program completed!",
      `Congratulations — you've completed "${program.title}" and earned your certificate.`,
    ).catch(() => {});

    return certificate;
  }
}
