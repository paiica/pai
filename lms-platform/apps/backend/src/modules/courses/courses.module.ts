import { Module } from "@nestjs/common";
import { CoursesService } from "./courses.service";
import { CoursesController } from "./courses.controller";
import { ProfCoursesController } from "./prof-courses.controller";
import { AdminCoursesController } from "./admin-courses.controller";
import { LearningModule } from "../learning/learning.module";
import { PrepCoursesModule } from "../prep-courses/prep-courses.module";
import { ContentImportModule } from "../content-import/content-import.module";
import { UploadsModule } from "../uploads/uploads.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [LearningModule, PrepCoursesModule, ContentImportModule, UploadsModule, AiModule],
  providers: [CoursesService],
  controllers: [CoursesController, ProfCoursesController, AdminCoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
