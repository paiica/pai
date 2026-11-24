import { Module } from "@nestjs/common";
import { InstitutionsService } from "./institutions.service";
import { InstitutionsController } from "./institutions.controller";
import { MailModule } from "../mail/mail.module";
import { UsersModule } from "../users/users.module";
import { AuditLogModule } from "../audit-log/audit-log.module";

@Module({
  imports: [MailModule, UsersModule, AuditLogModule],
  providers: [InstitutionsService],
  controllers: [InstitutionsController],
  exports: [InstitutionsService],
})
export class InstitutionsModule {}
