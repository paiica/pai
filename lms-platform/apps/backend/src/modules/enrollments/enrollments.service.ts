import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async getMyEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { user_id: userId },
      include: {
        certification: { select: { id: true, slug: true, acronym: true, title: true, badge_icon: true, level: true, total_lessons: true } },
        _count: { select: { lesson_progress: { where: { completed: true } } } },
      },
      orderBy: { enrolled_at: "desc" },
    });
  }

  async getEnrollment(userId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
      include: {
        certification: {
          include: {
            modules: {
              orderBy: { sort_order: "asc" },
              include: { lessons: { where: { is_published: true }, orderBy: { sort_order: "asc" } } },
            },
          },
        },
        lesson_progress: true,
        exam_attempts: { orderBy: { attempt_number: "desc" } },
        certificate: true,
      },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");
    return enrollment;
  }

  async markLessonComplete(userId: string, enrollmentId: string, lessonId: string, data: {
    quiz_score?: number;
    quiz_passed?: boolean;
    watch_seconds?: number;
  } = {}) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    const progress = await this.prisma.lessonProgress.upsert({
      where: { user_id_lesson_id: { user_id: userId, lesson_id: lessonId } },
      create: {
        user_id: userId,
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date(),
        ...data,
      },
      update: {
        completed: true,
        completed_at: new Date(),
        ...data,
      },
    });

    await this.recalculateProgress(enrollmentId, userId);
    return progress;
  }

  private async recalculateProgress(enrollmentId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        certification: { include: { modules: { include: { lessons: { where: { is_published: true } } } } } },
        lesson_progress: { where: { completed: true } },
      },
    });
    if (!enrollment) return;

    const totalLessons = enrollment.certification.modules.reduce(
      (sum, m) => sum + m.lessons.length, 0
    );
    const completedLessons = enrollment.lesson_progress.length;
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress_percentage: progressPct,
        status: progressPct === 100 ? "completed" : "active",
        completed_at: progressPct === 100 ? new Date() : null,
        last_accessed_at: new Date(),
      },
    });
  }

  async adminDelete(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { certificate: true },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    // Certificate.enrollment has no onDelete:Cascade, so delete it first
    if (enrollment.certificate) {
      await this.prisma.certificate.delete({ where: { id: enrollment.certificate.id } });
    }

    // LessonProgress, ExamAttempt, ExamBooking, AssignmentSubmission all cascade from Enrollment
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { message: "Enrollment deleted" };
  }

  async adminGetAll({ page = 1, limit = 20 }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const [enrollments, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        include: {
          user: { include: { profile: { select: { first_name: true, last_name: true } } } },
          certification: { select: { acronym: true, title: true } },
        },
        skip,
        take: limit,
        orderBy: { enrolled_at: "desc" },
      }),
      this.prisma.enrollment.count(),
    ]);
    return { data: enrollments, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
