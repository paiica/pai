import { Module } from "@nestjs/common";
import { RevenueService } from "./revenue.service";
import { RevenueController } from "./revenue.controller";
import { SiteSettingsModule } from "../site-settings/site-settings.module";

@Module({
  imports: [SiteSettingsModule],
  providers: [RevenueService],
  controllers: [RevenueController],
  exports: [RevenueService],
})
export class RevenueModule {}
