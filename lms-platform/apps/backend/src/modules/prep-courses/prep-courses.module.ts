import { Module } from "@nestjs/common";
import { PrepCoursesService } from "./prep-courses.service";
import { PrepCoursesController } from "./prep-courses.controller";
import { AdminPrepCoursesController } from "./admin-prep-courses.controller";
import { ProfPrepCoursesController } from "./prof-prep-courses.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { ContentImportModule } from "../content-import/content-import.module";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [NotificationsModule, ContentImportModule, UploadsModule],
  providers: [PrepCoursesService],
  controllers: [PrepCoursesController, AdminPrepCoursesController, ProfPrepCoursesController],
  exports: [PrepCoursesService],
})
export class PrepCoursesModule {}
