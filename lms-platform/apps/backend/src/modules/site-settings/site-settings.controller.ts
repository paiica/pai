import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { SiteSettingsService } from "./site-settings.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Site Settings")
@Controller("site-settings")
export class SiteSettingsController {
  constructor(private service: SiteSettingsService) {}

  @Public()
  @Get("public")
  @ApiOperation({ summary: "Get public site settings (no auth required)" })
  getPublic() {
    return this.service.getPublic();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get all site settings (admin)" })
  getAll() {
    return this.service.getAll();
  }

  @Patch()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Update site settings (admin)" })
  update(@Body() body: Record<string, unknown>) {
    return this.service.upsertMany(body);
  }

  @Get("api-settings")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get API integration settings — secrets masked (admin)" })
  getApiSettings() {
    return this.service.getApiSettings();
  }

  @Get("payment-settings")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get payment settings — secrets masked (admin)" })
  getPaymentSettings() {
    return this.service.getPaymentSettings();
  }
}
