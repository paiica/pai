import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { EmailModule } from "../email/email.module";
import { MailModule } from "../mail/mail.module";
import { CertificatesModule } from "../certificates/certificates.module";

@Module({
  imports: [EmailModule, MailModule, CertificatesModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
