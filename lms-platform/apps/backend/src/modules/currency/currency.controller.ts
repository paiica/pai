import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrencyService } from "./currency.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Currency")
@Controller()
export class CurrencyController {
  constructor(private service: CurrencyService) {}

  @Public()
  @Get("currencies")
  @ApiOperation({ summary: "Public: every active currency, for the storefront currency selector" })
  listActive() {
    return this.service.listActive();
  }

  @Get("admin/currencies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: every currency including inactive ones" })
  adminList() {
    return this.service.adminList();
  }

  @Post("admin/currencies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: add a currency" })
  adminCreate(@CurrentUser("id") userId: string, @Body() dto: { code: string; symbol: string; name: string; fx_rate?: number }) {
    return this.service.adminCreate(dto, userId);
  }

  @Patch("admin/currencies/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update a currency's symbol/name/fx rate/active state" })
  adminUpdate(@CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: Partial<{ symbol: string; name: string; fx_rate: number; is_active: boolean }>) {
    return this.service.adminUpdate(id, dto, userId);
  }

  @Post("admin/currencies/:id/set-default")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: make this currency the platform's default/base currency" })
  adminSetDefault(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.service.adminSetDefault(id, userId);
  }

  @Post("admin/currencies/refresh-rates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: refresh FX rates for every active non-default currency from a live rate feed" })
  refreshRates(@CurrentUser("id") userId: string) {
    return this.service.refreshLiveRates(userId);
  }

  @Delete("admin/currencies/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: remove a currency (not the default one)" })
  adminDelete(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.service.adminDelete(id, userId);
  }
}
