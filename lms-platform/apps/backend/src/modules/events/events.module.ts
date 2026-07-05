import { Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { AdminEventsController } from "./admin-events.controller";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  providers: [EventsService],
  controllers: [EventsController, AdminEventsController],
  exports: [EventsService],
})
export class EventsModule {}
