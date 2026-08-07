import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { LeadsService } from "./leads.service";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CaptureLeadDto } from "./dto/capture-lead.dto";

@ApiTags("Leads")
@Controller("leads")
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: "Capture a lead (public — blog subscribe popup)" })
  capture(@Body() dto: CaptureLeadDto) {
    return this.service.capture(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get()
  @ApiOperation({ summary: "List captured leads (admin)" })
  adminList(@Query("page") page = "1", @Query("limit") limit = "25", @Query("q") q?: string) {
    return this.service.adminList(parseInt(page), parseInt(limit), q);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Delete(":id")
  @ApiOperation({ summary: "Delete a lead (admin)" })
  adminDelete(@Param("id") id: string) {
    return this.service.adminDelete(id);
  }
}
