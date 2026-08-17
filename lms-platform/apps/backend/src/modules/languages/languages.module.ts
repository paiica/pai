import { Module, forwardRef } from "@nestjs/common";
import { LanguagesController } from "./languages.controller";
import { LanguagesService } from "./languages.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  // forwardRef breaks the LanguagesModule <-> TranslationsModule cycle — see
  // the matching note in translations.module.ts.
  imports: [PrismaModule, forwardRef(() => TranslationsModule)],
  controllers: [LanguagesController],
  providers: [LanguagesService],
  exports: [LanguagesService],
})
export class LanguagesModule {}
