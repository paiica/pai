import { Module } from "@nestjs/common";
import { PageBlocksController } from "./page-blocks.controller";
import { PageBlocksService } from "./page-blocks.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [PageBlocksController],
  providers: [PageBlocksService],
})
export class PageBlocksModule {}
