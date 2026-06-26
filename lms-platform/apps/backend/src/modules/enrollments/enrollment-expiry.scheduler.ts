import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EnrollmentExpiryScheduler {
  private readonly logger = new Logger(EnrollmentExpiryScheduler.name);

  constructor(private prisma: PrismaService) {}

  // Runs every day at 02:00 UTC
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireStaleEnrollments() {
    const result = await this.prisma.enrollment.updateMany({
      where: {
        status: { notIn: ["expired", "completed"] },
        expires_at: { lt: new Date() },
      },
      data: { status: "expired" },
    });

    if (result.count > 0) {
      this.logger.log(`Enrollment expiry: marked ${result.count} enrollment(s) as expired`);
    }
  }
}
