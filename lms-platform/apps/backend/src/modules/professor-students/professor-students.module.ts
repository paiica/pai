import { Module } from "@nestjs/common";
import { ProfessorStudentsService } from "./professor-students.service";
import { ProfessorStudentsController } from "./professor-students.controller";
import { CourseInvitationsService } from "./course-invitations.service";
import { CourseInvitationsController } from "./course-invitations.controller";
import { CertificationRecommendationsService } from "./certification-recommendations.service";
import { CertificationRecommendationsController } from "./certification-recommendations.controller";
import { AdminProfessorsService } from "./admin-professors.service";
import { AdminProfessorsController } from "./admin-professors.controller";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrepCoursesModule } from "../prep-courses/prep-courses.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [MailModule, NotificationsModule, PrepCoursesModule, PaymentsModule],
  providers: [ProfessorStudentsService, CourseInvitationsService, CertificationRecommendationsService, AdminProfessorsService],
  controllers: [ProfessorStudentsController, CourseInvitationsController, CertificationRecommendationsController, AdminProfessorsController],
})
export class ProfessorStudentsModule {}
