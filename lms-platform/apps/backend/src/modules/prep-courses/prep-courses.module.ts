import { Module } from "@nestjs/common";
import { PrepCoursesService } from "./prep-courses.service";
import { PrepCoursesController } from "./prep-courses.controller";
import { AdminPrepCoursesController } from "./admin-prep-courses.controller";
import { ProfPrepCoursesController } from "./prof-prep-courses.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [PrepCoursesService],
  controllers: [PrepCoursesController, AdminPrepCoursesController, ProfPrepCoursesController],
  exports: [PrepCoursesService],
})
export class PrepCoursesModule {}
