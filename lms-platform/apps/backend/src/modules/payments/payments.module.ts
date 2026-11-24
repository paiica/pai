import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { PromoCodesModule } from "../promo-codes/promo-codes.module";
import { MailModule } from "../mail/mail.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { CertificatesModule } from "../certificates/certificates.module";
import { PrepCoursesModule } from "../prep-courses/prep-courses.module";
import { RevenueModule } from "../revenue/revenue.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { InstitutionsModule } from "../institutions/institutions.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [PromoCodesModule, MailModule, SiteSettingsModule, CertificatesModule, PrepCoursesModule, RevenueModule, AuditLogModule, InstitutionsModule, NotificationsModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
