import { Module, forwardRef } from "@nestjs/common";
import { TranslationsController } from "./translations.controller";
import { TranslationsService } from "./translations.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AiModule } from "../ai/ai.module";
import { LanguagesModule } from "../languages/languages.module";

@Module({
  // forwardRef breaks the LanguagesModule <-> TranslationsModule cycle:
  // LanguagesController triggers bulk translation (needs TranslationsService),
  // TranslationsService needs LanguagesService to know which locales are enabled.
  imports: [PrismaModule, AiModule, forwardRef(() => LanguagesModule)],
  controllers: [TranslationsController],
  providers: [TranslationsService],
  exports: [TranslationsService],
})
export class TranslationsModule {}
