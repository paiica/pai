import { Module } from "@nestjs/common";
import { EnrollmentsService } from "./enrollments.service";
import { EnrollmentsController } from "./enrollments.controller";
import { EnrollmentExpiryScheduler } from "./enrollment-expiry.scheduler";

@Module({
  providers: [EnrollmentsService, EnrollmentExpiryScheduler],
  controllers: [EnrollmentsController],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
