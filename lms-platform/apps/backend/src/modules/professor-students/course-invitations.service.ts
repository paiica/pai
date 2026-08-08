import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentsService } from "../payments/payments.service";

@Injectable()
export class CourseInvitationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
    private payments: PaymentsService,
  ) {}

  async listMine(studentId: string) {
    const rows = await this.prisma.courseInvitation.findMany({
      where: { student_id: studentId },
      include: {
        course: { select: { id: true, slug: true, title: true, thumbnail_url: true, price: true } },
        professor: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
      },
      orderBy: { invited_at: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      invited_at: r.invited_at,
      responded_at: r.responded_at,
      payment_status: r.payment_status,
      course: r.course,
      professor_name: r.professor.profile ? `${r.professor.profile.first_name} ${r.professor.profile.last_name}`.trim() : r.professor.email,
      is_recommendation: r.is_recommendation,
    }));
  }

  private async getOwnPendingInvitation(invitationId: string, studentId: string) {
    const invitation = await this.prisma.courseInvitation.findUnique({
      where: { id: invitationId },
      include: { course: true },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.student_id !== studentId) throw new ForbiddenException("This invitation is not yours");
    if (invitation.status !== "pending") throw new BadRequestException("This invitation has already been responded to");
    return invitation;
  }

  async accept(invitationId: string, studentId: string) {
    const invitation = await this.getOwnPendingInvitation(invitationId, studentId);

    // Already enrolled some other way (e.g. bought it directly before
    // responding) — just link the existing enrollment instead of erroring.
    const existingEnrollment = await this.prisma.courseEnrollment.findUnique({
      where: { user_id_course_id: { user_id: studentId, course_id: invitation.course_id } },
    });
    if (existingEnrollment) {
      await this.prisma.courseInvitation.update({
        where: { id: invitationId },
        data: {
          status: "accepted",
          enrollment_id: existingEnrollment.id,
          responded_at: new Date(),
          payment_status: Number(invitation.course.price) > 0 ? "paid" : null,
        },
      });
      this.notifyProfessorOfResponse(invitation, "accepted").catch(() => {});
      return { enrolled: true, checkout_url: null };
    }

    const result = await this.payments.createCourseCheckoutSession(studentId, invitation.course_id, undefined, {
      invitation_id: invitationId,
    });

    if (result.enrolled) {
      const enrollment = await this.prisma.courseEnrollment.findUnique({
        where: { user_id_course_id: { user_id: studentId, course_id: invitation.course_id } },
      });
      await this.prisma.courseInvitation.update({
        where: { id: invitationId },
        data: { status: "accepted", enrollment_id: enrollment?.id, responded_at: new Date() },
      });
      this.notifyProfessorOfResponse(invitation, "accepted").catch(() => {});
      return { enrolled: true, checkout_url: null };
    }

    // Paid path — leave status pending; the Stripe webhook finishes the job
    // (payments.service.ts handleCheckoutCompleted, invitation_id branch).
    await this.prisma.courseInvitation.update({ where: { id: invitationId }, data: { payment_status: "pending" } });
    return { enrolled: false, checkout_url: result.checkout_url };
  }

  async reject(invitationId: string, studentId: string, reason?: string) {
    const invitation = await this.getOwnPendingInvitation(invitationId, studentId);
    await this.prisma.courseInvitation.update({
      where: { id: invitationId },
      data: { status: "rejected", responded_at: new Date(), rejection_reason: reason },
    });
    this.notifyProfessorOfResponse(invitation, "rejected").catch(() => {});
    return { message: "Invitation declined" };
  }

  private async notifyProfessorOfResponse(invitation: { professor_id: string; student_id: string; course_id: string }, outcome: "accepted" | "rejected") {
    const [student, course] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: invitation.student_id }, select: { email: true, profile: { select: { first_name: true, last_name: true } } } }),
      this.prisma.course.findUnique({ where: { id: invitation.course_id }, select: { title: true } }),
    ]);
    const studentName = student?.profile ? `${student.profile.first_name} ${student.profile.last_name}`.trim() : student?.email;
    await this.notifications.create(
      invitation.professor_id,
      outcome === "accepted" ? "course_invitation_accepted" : "course_invitation_rejected",
      outcome === "accepted" ? "Student accepted your invitation" : "Student declined your invitation",
      `${studentName} ${outcome} your invitation to "${course?.title}".`,
      { course_id: invitation.course_id, student_id: invitation.student_id },
    );
  }
}
