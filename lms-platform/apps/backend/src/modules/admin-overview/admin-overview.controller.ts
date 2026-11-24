import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AdminOverviewService } from "./admin-overview.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Admin Overview")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/overview")
export class AdminOverviewController {
  constructor(private service: AdminOverviewService) {}

  @Get()
  @ApiOperation({ summary: "Admin: everything new and needing staff attention across the platform" })
  getOverview() {
    return this.service.getOverview();
  }
}
