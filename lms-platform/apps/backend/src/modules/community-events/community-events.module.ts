import { Module } from "@nestjs/common";
import { CommunityEventsController } from "./community-events.controller";
import { CommunityEventsService } from "./community-events.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [CommunityEventsController],
  providers: [CommunityEventsService],
})
export class CommunityEventsModule {}
