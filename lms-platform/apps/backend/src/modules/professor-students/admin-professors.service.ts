import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProfessorStudentsService } from "./professor-students.service";

@Injectable()
export class AdminProfessorsService {
  constructor(
    private prisma: PrismaService,
    private professorStudents: ProfessorStudentsService,
  ) {}

  async list({ page = 1, limit = 25, q }: { page: number; limit: number; q?: string }) {
    const skip = (page - 1) * limit;
    const conditions: string[] = [`u.role = 'professor'`];
    const params: unknown[] = [];
    let p = 1;

    if (q) {
      conditions.push(`(u.email ILIKE $${p} OR pr.first_name ILIKE $${p} OR pr.last_name ILIKE $${p})`);
      params.push(`%${q}%`);
      p++;
    }
    const where = `WHERE ${conditions.join(" AND ")}`;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT u.id, u.email, u.is_active, u.last_login_at, u.created_at,
               pr.first_name, pr.last_name,
               (SELECT COUNT(*) FROM lms.professor_students ps WHERE ps.professor_id = u.id AND ps.status = 'active')::int AS roster_count,
               (SELECT COUNT(*) FROM lms.course_teachers ct WHERE ct.user_id = u.id)::int AS courses_taught_count,
               (SELECT COUNT(*) FROM lms.courses c WHERE c.created_by = u.id)::int AS courses_created_count,
               (SELECT COUNT(*) FROM lms.course_invitations ci WHERE ci.professor_id = u.id AND ci.is_recommendation = false)::int AS invitations_sent_count,
               (SELECT COUNT(*) FROM lms.course_invitations ci WHERE ci.professor_id = u.id AND ci.is_recommendation = true)::int AS course_recommendations_sent_count,
               (SELECT COUNT(*) FROM lms.certification_recommendations cr WHERE cr.professor_id = u.id)::int AS cert_recommendations_sent_count
        FROM lms.users u
        LEFT JOIN lms.profiles pr ON pr.user_id = u.id
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $${p} OFFSET $${p + 1}
      `, ...params, limit, skip),
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT COUNT(*)::int AS count
        FROM lms.users u
        LEFT JOIN lms.profiles pr ON pr.user_id = u.id
        ${where}
      `, ...params),
    ]);

    const total = countRows[0]?.count ?? 0;
    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getDetail(professorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: professorId },
      select: {
        id: true, email: true, role: true, is_active: true, last_login_at: true, created_at: true,
        profile: { select: { first_name: true, last_name: true, country: true, phone: true } },
      },
    });
    if (!user || user.role !== "professor") {
      throw new NotFoundException("Professor not found");
    }

    const [roster, coursesTaught, coursesCreated, invitations, certRecommendations] = await Promise.all([
      this.professorStudents.listStudents(professorId),
      this.prisma.courseTeacher.findMany({
        where: { user_id: professorId },
        include: { course: { select: { id: true, title: true, status: true, approval_status: true, is_listed: true } } },
      }),
      this.prisma.course.findMany({
        where: { created_by: professorId },
        select: { id: true, title: true, status: true, approval_status: true, is_listed: true, rejection_reason: true, submitted_at: true },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.courseInvitation.findMany({
        where: { professor_id: professorId },
        include: {
          student: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
          course: { select: { title: true } },
        },
        orderBy: { invited_at: "desc" },
      }),
      this.prisma.certificationRecommendation.findMany({
        where: { professor_id: professorId },
        include: {
          student: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
          certification: { select: { title: true, acronym: true } },
        },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return {
      profile: {
        id: user.id,
        email: user.email,
        first_name: user.profile?.first_name ?? "",
        last_name: user.profile?.last_name ?? "",
        country: user.profile?.country ?? null,
        phone: user.profile?.phone ?? null,
        is_active: user.is_active,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
      },
      roster,
      courses_taught: coursesTaught.map((ct) => ({ ...ct.course, is_lead: ct.is_lead })),
      courses_created: coursesCreated,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        student_email: inv.student.email,
        student_name: inv.student.profile ? `${inv.student.profile.first_name} ${inv.student.profile.last_name}`.trim() : inv.student.email,
        course_title: inv.course.title,
        status: inv.status,
        is_recommendation: inv.is_recommendation,
        invited_at: inv.invited_at,
        responded_at: inv.responded_at,
      })),
      cert_recommendations: certRecommendations.map((rec) => ({
        id: rec.id,
        student_email: rec.student.email,
        student_name: rec.student.profile ? `${rec.student.profile.first_name} ${rec.student.profile.last_name}`.trim() : rec.student.email,
        certification_title: rec.certification.title,
        certification_acronym: rec.certification.acronym,
        created_at: rec.created_at,
      })),
    };
  }
}
