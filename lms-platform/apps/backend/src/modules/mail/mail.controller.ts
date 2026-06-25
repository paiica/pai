import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { MailService } from "./mail.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

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
}
