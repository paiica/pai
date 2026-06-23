import { Module } from "@nestjs/common";
import { OnlineToolsService } from "./online-tools.service";
import { OnlineToolsController } from "./online-tools.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [OnlineToolsController],
  providers: [OnlineToolsService],
  exports: [OnlineToolsService],
})
export class OnlineToolsModule {}
