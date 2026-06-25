import { Module } from "@nestjs/common";
import { MailSchedulerService } from "./mail-scheduler.service";
import { MailModule } from "./mail.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [MailModule, PrismaModule],
  providers: [MailSchedulerService],
})
export class MailSchedulerModule {}
