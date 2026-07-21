import { Module } from "@nestjs/common";
import { LearningService } from "./learning.service";
import { LearningController } from "./learning.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [NotificationsModule, AiModule],
  providers: [LearningService],
  controllers: [LearningController],
  exports: [LearningService],
})
export class LearningModule {}
