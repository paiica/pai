import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { MailController } from "./mail.controller";
import { SiteSettingsModule } from "../site-settings/site-settings.module";

@Module({
  imports: [SiteSettingsModule],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
