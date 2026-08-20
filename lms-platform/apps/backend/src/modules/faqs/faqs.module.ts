import { Module } from "@nestjs/common";
import { FaqsController } from "./faqs.controller";
import { FaqsService } from "./faqs.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [FaqsController],
  providers: [FaqsService],
})
export class FaqsModule {}
