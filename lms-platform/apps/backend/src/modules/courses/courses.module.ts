import { Module } from "@nestjs/common";
import { CoursesService } from "./courses.service";
import { CoursesController } from "./courses.controller";
import { ProfCoursesController } from "./prof-courses.controller";
import { AdminCoursesController } from "./admin-courses.controller";

@Module({
  providers: [CoursesService],
  controllers: [CoursesController, ProfCoursesController, AdminCoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
