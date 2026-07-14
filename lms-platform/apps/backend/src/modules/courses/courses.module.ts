import { Module } from "@nestjs/common";
import { CoursesService } from "./courses.service";
import { CoursesController } from "./courses.controller";
import { ProfCoursesController } from "./prof-courses.controller";
import { AdminCoursesController } from "./admin-courses.controller";
import { LearningModule } from "../learning/learning.module";
import { PrepCoursesModule } from "../prep-courses/prep-courses.module";

@Module({
  imports: [LearningModule, PrepCoursesModule],
  providers: [CoursesService],
  controllers: [CoursesController, ProfCoursesController, AdminCoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
