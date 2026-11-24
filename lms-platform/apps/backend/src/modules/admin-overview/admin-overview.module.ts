import { Module } from "@nestjs/common";
import { AdminOverviewService } from "./admin-overview.service";
import { AdminOverviewController } from "./admin-overview.controller";

@Module({
  providers: [AdminOverviewService],
  controllers: [AdminOverviewController],
})
export class AdminOverviewModule {}
