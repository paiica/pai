import { Module } from "@nestjs/common";
import { PrepCoursesService } from "./prep-courses.service";
import { PrepCoursesController } from "./prep-courses.controller";
import { AdminPrepCoursesController } from "./admin-prep-courses.controller";
import { ProfPrepCoursesController } from "./prof-prep-courses.controller";
import { InstitutionCoursesController } from "./institution-courses.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { MailModule } from "../mail/mail.module";
import { ContentImportModule } from "../content-import/content-import.module";
import { UploadsModule } from "../uploads/uploads.module";
import { AiModule } from "../ai/ai.module";
import { ProgramsModule } from "../programs/programs.module";
import { TranslationsModule } from "../translations/translations.module";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { CurrencyModule } from "../currency/currency.module";

@Module({
  imports: [NotificationsModule, MailModule, ContentImportModule, UploadsModule, AiModule, ProgramsModule, TranslationsModule, AuditLogModule, CurrencyModule],
  providers: [PrepCoursesService],
  controllers: [PrepCoursesController, AdminPrepCoursesController, ProfPrepCoursesController, InstitutionCoursesController],
  exports: [PrepCoursesService],
})
export class PrepCoursesModule {}
