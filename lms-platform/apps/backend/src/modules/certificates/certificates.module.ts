import { Module } from "@nestjs/common";
import { CertificatesService } from "./certificates.service";
import { CertificatesController } from "./certificates.controller";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  providers: [CertificatesService],
  controllers: [CertificatesController],
  exports: [CertificatesService],
})
export class CertificatesModule {}
