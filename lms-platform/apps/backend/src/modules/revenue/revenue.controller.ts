import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role, InstitutionRole } from "@prisma/client";
import { RevenueService } from "./revenue.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { InstitutionRoleGuard } from "../../common/guards/institution-role.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { InstitutionRoles } from "../../common/decorators/institution-roles.decorator";

type SplitDto = { institution_percentage: number; professor_percentage: number; paii_percentage: number };

@ApiTags("Revenue Sharing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RevenueController {
  constructor(private service: RevenueService) {}

  // ── PAII staff (admin app) ─────────────────────────────────────────────────

  @Get("admin/revenue/default-split")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: the global default institution/professor/PAII split" })
  getDefaultSplit() {
    return this.service.adminGetDefaultSplit();
  }

  @Post("admin/revenue/default-split")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: set the global default split (must sum to 100)" })
  setDefaultSplit(@Body() dto: SplitDto) {
    return this.service.adminSetDefaultSplit(dto);
  }

  @Get("admin/revenue/rules")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list institution/course-specific split overrides" })
  listRules() {
    return this.service.adminListRules();
  }

  @Put("admin/revenue/rules/institution/:institutionId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: set an institution-specific split override" })
  setInstitutionRule(@Param("institutionId") institutionId: string, @Body() dto: SplitDto) {
    return this.service.adminSetInstitutionRule(institutionId, dto);
  }

  @Put("admin/revenue/rules/course/:courseId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: set a course-specific split override" })
  setCourseRule(@Param("courseId") courseId: string, @Body() dto: SplitDto) {
    return this.service.adminSetCourseRule(courseId, dto);
  }

  @Delete("admin/revenue/rules/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: remove a split override (falls back to the next rule in resolution order)" })
  deleteRule(@Param("id") id: string) {
    return this.service.adminDeleteRule(id);
  }

  @Get("admin/revenue/transactions")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: revenue-share ledger for institution course sales" })
  listTransactions(@Query("institutionId") institutionId?: string, @Query("status") status?: string) {
    return this.service.adminListTransactions({ institutionId, status });
  }

  @Post("admin/revenue/transactions/:id/mark-paid")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: mark an institution's or professor's share of a sale as paid out" })
  markPaid(@Param("id") id: string, @Body() dto: { party: "institution" | "professor" }) {
    return this.service.adminMarkPaid(id, dto.party);
  }

  // ── Institution admin (academia app) ────────────────────────────────────────

  @Get("institutions/:institutionId/revenue")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: earnings from public paid course sales" })
  getInstitutionEarnings(@Param("institutionId") institutionId: string) {
    return this.service.getInstitutionEarnings(institutionId);
  }
}
