import { Module } from "@nestjs/common";
import { PrepCoursesService } from "./prep-courses.service";
import { PrepCoursesController } from "./prep-courses.controller";
import { AdminPrepCoursesController } from "./admin-prep-courses.controller";
import { ProfPrepCoursesController } from "./prof-prep-courses.controller";

@Module({
  providers: [PrepCoursesService],
  controllers: [PrepCoursesController, AdminPrepCoursesController, ProfPrepCoursesController],
  exports: [PrepCoursesService],
})
export class PrepCoursesModule {}
