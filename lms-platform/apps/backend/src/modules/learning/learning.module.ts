import { Module } from "@nestjs/common";
import { LearningService } from "./learning.service";
import { LearningController } from "./learning.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [LearningService],
  controllers: [LearningController],
  exports: [LearningService],
})
export class LearningModule {}
