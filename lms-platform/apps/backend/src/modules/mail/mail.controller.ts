import { Controller, Get, Post, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { MailService } from "./mail.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Mail")
@Controller("mail")
export class MailController {
  constructor(private mail: MailService) {}

  @Get("templates/defaults")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get default HTML body and metadata for all email templates (admin)" })
  getTemplateDefaults() {
    return this.mail.getDefaultTemplates();
  }

  @Post("test-send")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Send a test email to the calling admin's address to verify Resend integration" })
  async testSend(@CurrentUser("email") email: string) {
    return this.mail.sendTestEmail(email);
  }

  @Post("templates/:key/test-send")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Send a specific email template with sample data to the calling admin's address" })
  async testSendTemplate(@Param("key") key: string, @CurrentUser("email") email: string) {
    return this.mail.sendTemplateTest(key, email);
  }
}
