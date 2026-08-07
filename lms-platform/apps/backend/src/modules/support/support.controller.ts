import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { MailService } from "../mail/mail.service";
import { ContactSupportDto } from "./dto/contact-support.dto";

@ApiTags("Support")
@Public()
@Controller("support")
export class SupportController {
  constructor(private mail: MailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send a support request email (public — /support page)" })
  contact(@Body() dto: ContactSupportDto) {
    return this.mail.sendSupportRequest(dto);
  }
}
