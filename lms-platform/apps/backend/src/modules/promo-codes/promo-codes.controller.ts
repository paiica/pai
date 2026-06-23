import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PromoCodesService } from "./promo-codes.service";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Promo Codes")
@Controller("promo-codes")
export class PromoCodesController {
  constructor(private service: PromoCodesService) {}

  @Public()
  @Get("validate/:code")
  @ApiOperation({ summary: "Validate a promo code" })
  validate(
    @Param("code") code: string,
    @Query("subtotal") subtotal = "0",
    @Query("courseId") courseId?: string,
    @Query("certificationId") certificationId?: string,
  ) {
    return this.service.validate(code, parseFloat(subtotal), { courseId, certificationId });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get()
  @ApiOperation({ summary: "List all promo codes (admin)" })
  adminList() { return this.service.adminList(); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Post()
  @ApiOperation({ summary: "Create promo code (admin)" })
  adminCreate(@Body() dto: any) { return this.service.adminCreate(dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch(":id")
  @ApiOperation({ summary: "Update promo code (admin)" })
  adminUpdate(@Param("id") id: string, @Body() dto: any) { return this.service.adminUpdate(id, dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Delete(":id")
  @ApiOperation({ summary: "Delete promo code (admin)" })
  adminDelete(@Param("id") id: string) { return this.service.adminDelete(id); }
}
