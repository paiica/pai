import { Module } from "@nestjs/common";
import { EnrollmentsService } from "./enrollments.service";
import { EnrollmentsController } from "./enrollments.controller";
import { EnrollmentExpiryScheduler } from "./enrollment-expiry.scheduler";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  providers: [EnrollmentsService, EnrollmentExpiryScheduler],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
