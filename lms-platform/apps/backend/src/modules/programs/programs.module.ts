import { Module } from "@nestjs/common";
import { ProgramsService } from "./programs.service";
import { ProgramsController } from "./programs.controller";
import { AdminProgramsController } from "./admin-programs.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [NotificationsModule, AiModule],
  providers: [ProgramsService],
  controllers: [ProgramsController, AdminProgramsController],
  exports: [ProgramsService],
})
export class ProgramsModule {}
