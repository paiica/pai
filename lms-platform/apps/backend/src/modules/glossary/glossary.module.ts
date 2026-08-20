import { Module } from "@nestjs/common";
import { GlossaryController } from "./glossary.controller";
import { GlossaryService } from "./glossary.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [GlossaryController],
  providers: [GlossaryService],
})
export class GlossaryModule {}
