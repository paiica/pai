import { Module } from "@nestjs/common";
import { PageBlocksController } from "./page-blocks.controller";
import { PageBlocksService } from "./page-blocks.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PageBlocksController],
  providers: [PageBlocksService],
})
export class PageBlocksModule {}
