import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { SiteSettingsModule } from "../site-settings/site-settings.module";

@Module({
  imports: [SiteSettingsModule],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
