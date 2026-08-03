import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { OrganizationsService } from "./organizations.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { OrganizationAdminGuard } from "../../common/guards/organization-admin.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Organizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OrganizationsController {
  constructor(private service: OrganizationsService) {}

  // ── Org admin (org-portal) ─────────────────────────────────────────────────

  @Get("org/dashboard")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: seat usage + enrollment status summary for my organization" })
  getDashboard(@CurrentUser("organization_id") organizationId: string) {
    return this.service.getDashboard(organizationId);
  }

  @Get("org/employees")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: list my organization's employees with enrollment/progress" })
  getEmployees(@CurrentUser("organization_id") organizationId: string) {
    return this.service.getEmployees(organizationId);
  }

  @Post("org/employees/invite")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: bulk-invite employees into one or more certifications" })
  inviteEmployees(
    @CurrentUser("organization_id") organizationId: string,
    @Body() dto: { emails: string[]; certification_ids: string[] },
  ) {
    return this.service.inviteEmployees(organizationId, dto);
  }

  @Delete("org/employees/:userId")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: offboard an employee (removes their org-scoped enrollments)" })
  removeEmployee(
    @CurrentUser("organization_id") organizationId: string,
    @Param("userId") userId: string,
  ) {
    return this.service.removeEmployee(organizationId, userId);
  }

  @Get("org/billing")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: current plan, seat usage, and subscription status" })
  getBilling(@CurrentUser("organization_id") organizationId: string) {
    return this.service.getBilling(organizationId);
  }

  @Post("org/billing/checkout/seats")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: buy additional seats" })
  checkoutSeats(
    @CurrentUser() user: { id: string; organization_id: string },
    @Body() dto: { seat_count: number },
  ) {
    return this.service.checkoutSeats(user.id, user.organization_id, dto.seat_count);
  }

  @Post("org/billing/checkout/renew")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: renew the subscription for another period" })
  checkoutRenewal(@CurrentUser() user: { id: string; organization_id: string }) {
    return this.service.checkoutRenewal(user.id, user.organization_id);
  }

  @Get("org/invite-link")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: get (or lazily create) this org's self-service employee sign-up link" })
  getInviteLink(@CurrentUser("organization_id") organizationId: string) {
    return this.service.getInviteLink(organizationId);
  }

  @Post("org/invite-link/regenerate")
  @UseGuards(OrganizationAdminGuard)
  @ApiOperation({ summary: "Org admin: regenerate the invite link, invalidating the old one" })
  regenerateInviteLink(@CurrentUser("organization_id") organizationId: string) {
    return this.service.regenerateInviteLink(organizationId);
  }

  // ── Public: self-service employee sign-up via invite link ─────────────────

  @Public()
  @Get("org/join/:token")
  @ApiOperation({ summary: "Public: look up org name/availability for an invite link" })
  getJoinInfo(@Param("token") token: string) {
    return this.service.getJoinInfo(token);
  }

  @Public()
  @Post("org/join/:token")
  @ApiOperation({ summary: "Public: self-service employee sign-up via an org's invite link" })
  joinViaLink(
    @Param("token") token: string,
    @Body() dto: { email: string; password: string; first_name: string; last_name: string; certification_ids: string[] },
  ) {
    return this.service.joinViaLink(token, dto);
  }

  // ── PAII staff (admin app) ─────────────────────────────────────────────────

  @Get("admin/organizations")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list all organizations" })
  adminList() {
    return this.service.adminList();
  }

  @Post("admin/organizations")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create an organization" })
  adminCreate(@Body() dto: { name: string; contact_email: string; seats_purchased?: number; notes?: string; price_per_seat?: number; renewal_period_months?: number }) {
    return this.service.adminCreate(dto);
  }

  @Get("admin/organizations/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: organization detail — admins, employees, and payment history" })
  adminGetDetail(@Param("id") id: string) {
    return this.service.adminGetDetail(id);
  }

  @Patch("admin/organizations/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update an organization's name/seats/notes/billing" })
  adminUpdate(
    @Param("id") id: string,
    @Body() dto: Partial<{ name: string; contact_email: string; seats_purchased: number; notes: string; price_per_seat: number | null; renewal_period_months: number; subscription_expires_at: string | null }>,
  ) {
    return this.service.adminUpdate(id, dto);
  }

  @Post("admin/organizations/:id/admins")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: provision an org admin for an organization" })
  adminProvisionAdmin(
    @Param("id") id: string,
    @Body() dto: { email: string; first_name: string; last_name: string },
  ) {
    return this.service.adminProvisionAdmin(id, dto);
  }
}
