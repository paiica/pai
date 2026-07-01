import { Module } from "@nestjs/common";
import { ExamsService } from "./exams.service";
import { ExamsController } from "./exams.controller";
import { MailModule } from "../mail/mail.module";
import { CertificatesModule } from "../certificates/certificates.module";

@Module({
  imports: [MailModule, CertificatesModule],
  providers: [ExamsService],
  controllers: [ExamsController],
  exports: [ExamsService],
})
export class ExamsModule {}
