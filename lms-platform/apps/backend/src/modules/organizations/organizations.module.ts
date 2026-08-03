import { Module } from "@nestjs/common";
import { OrganizationsService } from "./organizations.service";
import { OrganizationsController } from "./organizations.controller";
import { MailModule } from "../mail/mail.module";
import { UsersModule } from "../users/users.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [MailModule, UsersModule, PaymentsModule],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
})
export class OrganizationsModule {}
