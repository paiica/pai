import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { PrepCoursesService } from "../prep-courses/prep-courses.service";

@Injectable()
export class ExamSessionsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private prepCourses: PrepCoursesService,
  ) {}

  // ── Admin: CRUD ────────────────────────────────────────────────────────────

  async adminCreate(
    adminId: string,
    dto: {
      certification_id: string;
      structured_exam_id?: string;
      title?: string;
      scheduled_at: string;
      duration_minutes?: number;
      max_seats?: number;
      meeting_link?: string;
      notes?: string;
      allow_late_cancellation?: boolean;
    },
  ) {
    return (this.prisma as any).examSession.create({
      data: {
        certification_id: dto.certification_id,
        structured_exam_id: dto.structured_exam_id ?? null,
        title: dto.title,
        scheduled_at: new Date(dto.scheduled_at),
        duration_minutes: dto.duration_minutes ?? 90,
        max_seats: dto.max_seats ?? null,
        meeting_link: dto.meeting_link ?? null,
        notes: dto.notes ?? null,
        allow_late_cancellation: dto.allow_late_cancellation ?? false,
        created_by: adminId,
      },
      include: { _count: { select: { bookings: true } } },
    });
  }

  async adminList(certificationId?: string) {
    return (this.prisma as any).examSession.findMany({
      where: certificationId ? { certification_id: certificationId } : {},
      include: {
        certification: { select: { title: true, acronym: true } },
        structured_exam: { select: { id: true, title: true, status: true, version: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { scheduled_at: "asc" },
    });
  }

  async adminUpdate(
    id: string,
    dto: {
      structured_exam_id?: string | null;
      title?: string;
      scheduled_at?: string;
      duration_minutes?: number;
      max_seats?: number;
      meeting_link?: string;
      notes?: string;
      is_active?: boolean;
      allow_late_cancellation?: boolean;
    },
  ) {
    await this.findSessionOrThrow(id);
    const data: any = { ...dto };
    if (dto.scheduled_at) data.scheduled_at = new Date(dto.scheduled_at);
    return (this.prisma as any).examSession.update({ where: { id }, data });
  }

  async adminGetById(id: string) {
    const session = await (this.prisma as any).examSession.findUnique({
      where: { id },
      include: {
        certification: { select: { id: true, title: true, acronym: true, exam_questions_count: true } },
        structured_exam: { select: { id: true, title: true, status: true, version: true } },
        _count: { select: { bookings: true } },
      },
    });
    if (!session) throw new NotFoundException("Exam session not found");
    return { ...session, cert_title: session.certification?.title };
  }

  async adminDelete(id: string) {
    await this.findSessionOrThrow(id);
    return (this.prisma as any).examSession.delete({ where: { id } });
  }

  async adminGetBookings(sessionId: string) {
    await this.findSessionOrThrow(sessionId);
    return (this.prisma as any).examBooking.findMany({
      where: { exam_session_id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: { booked_at: "asc" },
    });
  }

  // ── Student: list & book ───────────────────────────────────────────────────

  async listForStudent(certificationId: string, userId: string) {
    const now = new Date();
    const sessions = await (this.prisma as any).examSession.findMany({
      where: { certification_id: certificationId, is_active: true, scheduled_at: { gt: now } },
      include: { _count: { select: { bookings: { where: { status: "confirmed" } } } } },
      orderBy: { scheduled_at: "asc" },
    });

    const myBooking = await (this.prisma as any).examBooking.findFirst({
      where: {
        user_id: userId,
        exam_session: { certification_id: certificationId },
        status: "confirmed",
      },
      include: { exam_session: true },
    });

    return { sessions, myBooking: myBooking || null };
  }

  async book(sessionId: string, userId: string) {
    const session = await this.findSessionOrThrow(sessionId);
    if (!session.is_active) throw new BadRequestException("This session is no longer available");
    if (new Date(session.scheduled_at) <= new Date()) {
      throw new BadRequestException("Cannot book a session that has already started");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, certification_id: session.certification_id, status: "active" },
    });
    if (!enrollment) throw new ForbiddenException("You must be enrolled to book an exam session");

    const missingRequired = await this.prepCourses.getIncompleteRequiredCourses(userId, session.certification_id);
    if (missingRequired.length) {
      throw new BadRequestException(`Complete the following required course(s) before booking the exam: ${missingRequired.join(", ")}`);
    }

    // Check seat availability
    if (session.max_seats != null) {
      const booked = await (this.prisma as any).examBooking.count({
        where: { exam_session_id: sessionId, status: "confirmed" },
      });
      if (booked >= session.max_seats) throw new BadRequestException("This session is fully booked");
    }

    // Upsert: replace any cancelled booking
    const existing = await (this.prisma as any).examBooking.findUnique({
      where: { user_id_exam_session_id: { user_id: userId, exam_session_id: sessionId } },
    });

    if (existing) {
      if (existing.status === "confirmed") throw new BadRequestException("You already have a booking for this session");
      const updated = await (this.prisma as any).examBooking.update({
        where: { id: existing.id },
        data: { status: "confirmed", cancelled_at: null, booked_at: new Date() },
        include: { exam_session: { include: { certification: { select: { title: true } } } } },
      });
      this.sendExamBookedEmail(userId, updated.exam_session).catch(() => {});
      return updated;
    }

    const booking = await (this.prisma as any).examBooking.create({
      data: {
        user_id: userId,
        exam_session_id: sessionId,
        enrollment_id: enrollment.id,
        status: "confirmed",
      },
      include: { exam_session: { include: { certification: { select: { title: true } } } } },
    });
    this.sendExamBookedEmail(userId, booking.exam_session).catch(() => {});
    return booking;
  }

  private async sendExamBookedEmail(userId: string, session: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, profile: { select: { first_name: true } } },
    });
    if (!user) return;
    const examDate = new Date(session.scheduled_at).toLocaleString("en-CA", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
    await this.mail.sendExamBooked({
      to: user.email,
      firstName: user.profile?.first_name ?? "there",
      certTitle: session.certification?.title ?? "your certification",
      sessionTitle: session.title ?? `Exam Session`,
      examDate,
      meetingLink: session.meeting_link ?? null,
    });
  }

  async cancelBooking(sessionId: string, userId: string) {
    const booking = await (this.prisma as any).examBooking.findUnique({
      where: { user_id_exam_session_id: { user_id: userId, exam_session_id: sessionId } },
    });
    if (!booking || booking.status !== "confirmed") throw new NotFoundException("Active booking not found");

    const session = await this.findSessionOrThrow(sessionId);
    if (!session.allow_late_cancellation) {
      const cutoff = new Date(session.scheduled_at);
      cutoff.setHours(cutoff.getHours() - 24);
      if (new Date() > cutoff) {
        throw new BadRequestException("Cannot cancel within 24 hours of the exam");
      }
    }

    return (this.prisma as any).examBooking.update({
      where: { id: booking.id },
      data: { status: "cancelled", cancelled_at: new Date() },
    });
  }

  async getMyBooking(certificationId: string, userId: string) {
    const booking = await (this.prisma as any).examBooking.findFirst({
      where: {
        user_id: userId,
        exam_session: { certification_id: certificationId },
        status: "confirmed",
      },
      include: {
        exam_session: true,
        enrollment: {
          select: {
            exam_attempts: {
              orderBy: { attempt_number: "desc" },
              take: 1,
              select: { id: true, status: true, score_percentage: true, passed: true, submitted_at: true },
            },
          },
        },
      },
    });
    if (!booking) return null;
    const { enrollment, ...rest } = booking;
    return { ...rest, latest_attempt: enrollment?.exam_attempts?.[0] ?? null };
  }

  async startExamFromBooking(bookingId: string, userId: string) {
    const booking = await (this.prisma as any).examBooking.findFirst({
      where: { id: bookingId, user_id: userId, status: "confirmed" },
      include: { exam_session: true, enrollment: { include: { certification: true } } },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const session = booking.exam_session;
    const now = new Date();
    const sessionStart = new Date(session.scheduled_at);
    const unlockAt = new Date(sessionStart.getTime() - 3 * 60 * 1000);

    if (now < unlockAt) {
      throw new BadRequestException("Exam link is not yet available. It unlocks 3 minutes before start.");
    }

    const enrollment = booking.enrollment;
    const cert = enrollment.certification;

    const existingInProgress = await this.prisma.examAttempt.findFirst({
      where: { enrollment_id: enrollment.id, status: "in_progress" },
    });
    if (existingInProgress) return { attemptId: existingInProgress.id };

    // Same check book() enforces — re-checked here in case a required course
    // got added (or the student's completion got reset) after they booked.
    const missingRequired = await this.prepCourses.getIncompleteRequiredCourses(userId, cert.id);
    if (missingRequired.length) {
      throw new BadRequestException(`Complete the following required course(s) before taking the exam: ${missingRequired.join(", ")}`);
    }

    // Same cap startExam() enforces — without it, a student whose booked-session
    // attempt timed out could keep re-triggering this endpoint for unlimited
    // fresh attempts instead of being bound by their purchased retake count.
    const existingCount = await this.prisma.examAttempt.count({
      where: { enrollment_id: enrollment.id },
    });
    const maxAttempts = cert.max_retakes_included + 1;
    if (existingCount >= maxAttempts) {
      throw new BadRequestException("Maximum exam attempts reached. Purchase additional retakes.");
    }

    const bankQuestions = await this.prisma.examBank.findMany({
      where: { certification_id: cert.id, is_active: true },
      take: cert.exam_questions_count,
      orderBy: { created_at: "asc" },
    });

    if (bankQuestions.length < cert.exam_questions_count) {
      throw new BadRequestException("Exam bank not ready. Contact support.");
    }

    const shuffled = this.shuffleArray(bankQuestions).map(q => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
      topic_tag: q.topic_tag,
    }));

    const attempt = await this.prisma.examAttempt.create({
      data: {
        user_id: userId,
        enrollment_id: enrollment.id,
        attempt_number: existingCount + 1,
        status: "in_progress",
        total_questions: shuffled.length,
        passing_score: cert.passing_score,
        time_limit_seconds: session.duration_minutes * 60,
        answers: { questions: shuffled },
      },
    });

    return { attemptId: attempt.id };
  }

  // ── Student: get exam link (T-3min gated) ────────────────────────────────

  async getStudentExamLink(bookingId: string, userId: string) {
    const booking = await (this.prisma as any).examBooking.findFirst({
      where: { id: bookingId, user_id: userId, status: "confirmed" },
      include: {
        exam_session: { include: { certification: { select: { marketing_meta: true } } } },
        user: { select: { id: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const session = booking.exam_session;
    const now = new Date();
    const unlockAt = new Date(new Date(session.scheduled_at).getTime() - 3 * 60 * 1000);
    if (now < unlockAt) {
      throw new BadRequestException("Exam link not yet available. It unlocks 3 minutes before start.");
    }

    const graceMinutes: number = (session.certification?.marketing_meta as any)?.link_grace_minutes ?? 30;
    const sessionEnd = new Date(session.scheduled_at).getTime() + session.duration_minutes * 60 * 1000 + graceMinutes * 60 * 1000;
    const expiresAt = Math.floor(sessionEnd / 1000);

    const token = this.jwtService.sign(
      { sub: userId, type: "student_exam_link", booking_id: bookingId },
      { secret: this.config.get<string>("jwt.accessSecret"), expiresIn: expiresAt - Math.floor(Date.now() / 1000) },
    );

    const paiiexamsUrl = this.config.get<string>("PAIIEXAMS_URL") || "https://exams.paii.ca";
    return { url: `${paiiexamsUrl}/join?token=${token}` };
  }

  async adminPreviewLink(sessionId: string, adminId: string) {
    await this.findSessionOrThrow(sessionId);
    const token = this.jwtService.sign(
      { sub: adminId, type: "admin_exam_preview", session_id: sessionId },
      { secret: this.config.get<string>("jwt.accessSecret"), expiresIn: "4h" as any },
    );
    const paiiexamsUrl = this.config.get<string>("PAIIEXAMS_URL") || "https://exams.paii.ca";
    return { url: `${paiiexamsUrl}/preview?token=${token}` };
  }

  // ── Admin: add student to session ─────────────────────────────────────────

  async adminAddStudent(sessionId: string, userEmail: string) {
    const session = await this.findSessionOrThrow(sessionId);
    const user = await this.prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
      select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } },
    });
    if (!user) throw new NotFoundException(`No user found with email: ${userEmail}`);

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { user_id: user.id, certification_id: session.certification_id, status: "active" },
    });
    if (!enrollment) throw new BadRequestException("Student is not enrolled in the certification for this session");

    const existing = await (this.prisma as any).examBooking.findUnique({
      where: { user_id_exam_session_id: { user_id: user.id, exam_session_id: sessionId } },
    });
    if (existing && existing.status === "confirmed") throw new BadRequestException("Student is already booked for this session");

    if (existing) {
      return (this.prisma as any).examBooking.update({
        where: { id: existing.id },
        data: { status: "confirmed", cancelled_at: null, booked_at: new Date() },
        include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
      });
    }

    return (this.prisma as any).examBooking.create({
      data: { user_id: user.id, exam_session_id: sessionId, enrollment_id: enrollment.id, status: "confirmed" },
      include: { user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } } },
    });
  }

  // ── Admin: generate unique student exam link ───────────────────────────────

  async generateStudentExamLink(bookingId: string) {
    const booking = await (this.prisma as any).examBooking.findUnique({
      where: { id: bookingId },
      include: { exam_session: true, user: { select: { id: true, email: true } } },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const session = booking.exam_session;
    const sessionEnd = new Date(session.scheduled_at).getTime() + session.duration_minutes * 60 * 1000 + 30 * 60 * 1000;
    const expiresAt = Math.floor(sessionEnd / 1000);

    const token = this.jwtService.sign(
      { sub: booking.user.id, type: "student_exam_link", booking_id: bookingId },
      { secret: this.config.get<string>("jwt.accessSecret"), expiresIn: expiresAt - Math.floor(Date.now() / 1000) },
    );

    const paiiexamsUrl = this.config.get<string>("PAIIEXAMS_URL") || "https://exams.paii.ca";
    return {
      token,
      url: `${paiiexamsUrl}/join?token=${token}`,
      expires_at: new Date(sessionEnd).toISOString(),
      student_email: booking.user.email,
    };
  }

  // ── Admin: cancel a booking (bypasses 24-hour rule) ──────────────────────

  async adminCancelBooking(bookingId: string) {
    const booking = await (this.prisma as any).examBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.status !== "confirmed") throw new BadRequestException("Booking is not confirmed");
    return (this.prisma as any).examBooking.update({
      where: { id: bookingId },
      data: { status: "cancelled", cancelled_at: new Date() },
    });
  }

  // ── Admin: get all bookings with attempt status ────────────────────────────

  async adminGetBookingsWithStatus(sessionId: string) {
    await this.findSessionOrThrow(sessionId);
    const bookings = await (this.prisma as any).examBooking.findMany({
      where: { exam_session_id: sessionId },
      include: {
        user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
        enrollment: {
          select: {
            id: true,
            exam_attempts: {
              orderBy: { attempt_number: "desc" },
              take: 1,
              select: { id: true, status: true, score_percentage: true, passed: true, submitted_at: true },
            },
          },
        },
      },
      orderBy: { booked_at: "asc" },
    });
    return bookings.map((b: any) => ({
      ...b,
      latest_attempt: b.enrollment?.exam_attempts?.[0] ?? null,
    }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async findSessionOrThrow(id: string) {
    const session = await (this.prisma as any).examSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Exam session not found");
    return session;
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
