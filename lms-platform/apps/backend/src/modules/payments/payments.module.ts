import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";
import { MailModule } from "../mail/mail.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { CertificatesModule } from "../certificates/certificates.module";
import { PrepCoursesModule } from "../prep-courses/prep-courses.module";

@Module({
  imports: [PromoCodesModule, MailModule, SiteSettingsModule, CertificatesModule, PrepCoursesModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
