import { Module } from "@nestjs/common";
import { AffiliateService } from "./affiliate.service";
import { AffiliateController } from "./affiliate.controller";
import { AdminAffiliatesController } from "./admin-affiliates.controller";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  providers: [AffiliateService],
  controllers: [AffiliateController, AdminAffiliatesController],
  exports: [AffiliateService],
})
export class AffiliateModule {}
