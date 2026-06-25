import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "./mail.service";

@Injectable()
export class MailSchedulerService {
  private readonly logger = new Logger(MailSchedulerService.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Runs every day at 8 AM UTC — sends reminders for exams happening the following day
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendExamReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);

    const bookings = await (this.prisma as any).examBooking.findMany({
      where: {
        status: "confirmed",
        exam_session: { scheduled_at: { gte: start, lte: end }, is_active: true },
      },
      include: {
        user: { select: { email: true, profile: { select: { first_name: true } } } },
        exam_session: { include: { certification: { select: { title: true } } } },
      },
    });

    this.logger.log(`Sending exam reminders for ${bookings.length} bookings`);

    for (const booking of bookings) {
      const session = booking.exam_session;
      const examDate = new Date(session.scheduled_at).toLocaleString("en-CA", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit", timeZoneName: "short",
      });
      await this.mail.sendExamReminder({
        to: booking.user.email,
        firstName: booking.user.profile?.first_name ?? "there",
        certTitle: session.certification?.title ?? "your certification",
        sessionTitle: session.title ?? "Exam Session",
        examDate,
        meetingLink: session.meeting_link ?? null,
      }).catch((err: any) => this.logger.error(`Reminder failed for booking ${booking.id}: ${err?.message}`));
    }
  }
}
