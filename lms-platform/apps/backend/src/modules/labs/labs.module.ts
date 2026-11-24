import { Module } from "@nestjs/common";
import { LabsService } from "./labs.service";
import { LabsController } from "./labs.controller";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { AiModule } from "../ai/ai.module";
import { PrepCoursesModule } from "../prep-courses/prep-courses.module";

@Module({
  imports: [SiteSettingsModule, AiModule, PrepCoursesModule],
  providers: [LabsService],
  controllers: [LabsController],
  exports: [LabsService],
})
export class LabsModule {}
