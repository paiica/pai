import { Module } from "@nestjs/common";
import { AiToolsController } from "./ai-tools.controller";
import { AiToolsService } from "./ai-tools.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}
