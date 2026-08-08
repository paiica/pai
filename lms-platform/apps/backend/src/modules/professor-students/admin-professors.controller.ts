import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AdminProfessorsService } from "./admin-professors.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Admin — Professors")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/professors")
export class AdminProfessorsController {
  constructor(private service: AdminProfessorsService) {}

  @Get()
  @ApiOperation({ summary: "List all professors with activity stats" })
  list(@Query("page") page = 1, @Query("limit") limit = 25, @Query("q") q?: string) {
    return this.service.list({ page: +page, limit: +limit, q });
  }

  @Get(":id")
  @ApiOperation({ summary: "Full activity detail for one professor — roster, courses, invitations, recommendations" })
  getDetail(@Param("id") id: string) {
    return this.service.getDetail(id);
  }
}
