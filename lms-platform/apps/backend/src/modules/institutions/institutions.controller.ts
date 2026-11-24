import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Response } from "express";
import { Role, InstitutionRole } from "@prisma/client";
import { InstitutionsService } from "./institutions.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { InstitutionRoleGuard } from "../../common/guards/institution-role.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { InstitutionRoles } from "../../common/decorators/institution-roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Institutions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InstitutionsController {
  constructor(private service: InstitutionsService) {}

  // ── PAII staff (admin app) — packages ───────────────────────────────────────

  @Get("admin/packages")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list all packages" })
  adminListPackages() {
    return this.service.adminListPackages();
  }

  @Post("admin/packages")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create a package" })
  adminCreatePackage(@CurrentUser("id") userId: string, @Body() dto: { name: string; tier: "starter" | "professional" | "enterprise"; monthly_price?: number | null; student_limit?: number | null; professor_limit?: number | null; course_limit?: number | null; features?: string[] }) {
    return this.service.adminCreatePackage(dto, userId);
  }

  @Patch("admin/packages/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update a package's pricing/limits/features" })
  adminUpdatePackage(@CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: Partial<{ name: string; monthly_price: number | null; student_limit: number | null; professor_limit: number | null; course_limit: number | null; features: string[]; is_active: boolean; sort_order: number }>) {
    return this.service.adminUpdatePackage(id, dto, userId);
  }

  @Delete("admin/packages/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete a package (only if never subscribed to)" })
  adminDeletePackage(@Param("id") id: string) {
    return this.service.adminDeletePackage(id);
  }

  // ── PAII staff (admin app) ─────────────────────────────────────────────────

  @Get("admin/institutions")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list all institutions" })
  adminList() {
    return this.service.adminList();
  }

  @Post("admin/institutions")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create an institution" })
  adminCreate(@CurrentUser("id") userId: string, @Body() dto: { name: string; code: string; contact_email?: string; website?: string; description?: string }) {
    return this.service.adminCreate(dto, userId);
  }

  @Get("admin/institutions/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: institution detail — domains, memberships, courses" })
  adminGetDetail(@Param("id") id: string) {
    return this.service.adminGetDetail(id);
  }

  @Patch("admin/institutions/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update an institution's profile/status" })
  adminUpdate(@Param("id") id: string, @Body() dto: Partial<{ name: string; status: "active" | "suspended"; logo_url: string | null; description: string | null; website: string | null; contact_email: string | null }>) {
    return this.service.adminUpdate(id, dto);
  }

  @Post("admin/institutions/:id/domains")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: register + verify a domain for an institution" })
  adminAddDomain(@CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: { domain: string }) {
    return this.service.adminAddDomain(id, dto.domain, userId);
  }

  @Delete("admin/institutions/:id/domains/:domainId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: remove a domain from an institution" })
  adminRemoveDomain(@CurrentUser("id") userId: string, @Param("id") id: string, @Param("domainId") domainId: string) {
    return this.service.adminRemoveDomain(id, domainId, userId);
  }

  @Post("admin/institutions/:id/owner")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: provision the first owner account for an institution" })
  adminProvisionOwner(@CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: { email: string; first_name: string; last_name: string }) {
    return this.service.adminProvisionOwner(id, dto, userId);
  }

  // ── Institution admin (academia app) ───────────────────────────────────────

  @Get("institutions/:institutionId/dashboard")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: dashboard counts" })
  getDashboard(@Param("institutionId") institutionId: string) {
    return this.service.getDashboard(institutionId);
  }

  @Get("institutions/:institutionId/activity")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: activity/audit log for this institution" })
  getActivity(@Param("institutionId") institutionId: string, @Query() query: { action?: string; page?: string; limit?: string }) {
    return this.service.getActivity(institutionId, query);
  }

  @Get("institutions/:institutionId/billing")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: current subscription + usage vs. package limits" })
  getBilling(@Param("institutionId") institutionId: string) {
    return this.service.getBilling(institutionId);
  }

  @Get("institutions/:institutionId/invoices")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: subscription invoice/receipt history" })
  getInvoices(@Param("institutionId") institutionId: string) {
    return this.service.getInvoices(institutionId);
  }

  @Get("institutions/:institutionId/available-packages")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: packages available to subscribe to" })
  getAvailablePackages() {
    return this.service.getAvailablePackages();
  }

  @Get("institutions/:institutionId/analytics")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: enrollment/engagement analytics" })
  getAnalytics(@Param("institutionId") institutionId: string, @Query("range") range?: "7d" | "30d" | "90d") {
    return this.service.getAnalytics(institutionId, range);
  }

  @Get("institutions/:institutionId/settings")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: profile + domains" })
  getSettings(@Param("institutionId") institutionId: string) {
    return this.service.getSettings(institutionId);
  }

  @Patch("institutions/:institutionId/settings")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: update branding/profile" })
  updateSettings(@Param("institutionId") institutionId: string, @Body() dto: Partial<{ name: string; logo_url: string | null; description: string | null; website: string | null }>) {
    return this.service.updateSettings(institutionId, dto);
  }

  @Post("institutions/:institutionId/domains")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: add a domain for self-service DNS verification" })
  requestDomainVerification(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Body() dto: { domain: string }) {
    return this.service.requestDomainVerification(institutionId, dto.domain, userId);
  }

  @Post("institutions/:institutionId/domains/:domainId/verify")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: check the TXT record and mark the domain verified" })
  verifyDomainDns(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Param("domainId") domainId: string) {
    return this.service.verifyDomainDns(institutionId, domainId, userId);
  }

  @Delete("institutions/:institutionId/domains/:domainId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: remove a domain" })
  removeDomainSelfService(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Param("domainId") domainId: string) {
    return this.service.removeDomainSelfService(institutionId, domainId, userId);
  }

  @Get("institutions/:institutionId/professors")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: list professors/admins (paginated, searchable)" })
  getProfessors(@Param("institutionId") institutionId: string, @Query() query: { page?: string; limit?: string; search?: string }) {
    return this.service.getProfessors(institutionId, query);
  }

  @Get("institutions/:institutionId/professors/export")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: export professors/admins as CSV" })
  async exportProfessors(@Param("institutionId") institutionId: string, @Query("search") search: string | undefined, @Res() res: Response) {
    const csv = await this.service.exportProfessorsCsv(institutionId, search);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="professors-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }

  @Post("institutions/:institutionId/professors/invite")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: invite a professor or co-admin" })
  inviteProfessor(
    @Param("institutionId") institutionId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: { email: string; first_name?: string; last_name?: string; role?: "admin" | "professor" },
  ) {
    return this.service.inviteProfessor(institutionId, userId, dto);
  }

  @Post("institutions/:institutionId/professors/:membershipId/resend-invite")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: resend the password-setup email for a still-pending invite" })
  resendInvite(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Param("membershipId") membershipId: string) {
    return this.service.resendProfessorInvite(institutionId, membershipId, userId);
  }

  @Patch("institutions/:institutionId/memberships/:membershipId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: change a member's role between admin and professor" })
  updateMembershipRole(
    @CurrentUser("id") userId: string,
    @Param("institutionId") institutionId: string,
    @Param("membershipId") membershipId: string,
    @Body() dto: { role: "admin" | "professor" },
  ) {
    return this.service.updateMembershipRole(institutionId, membershipId, dto.role, userId);
  }

  @Delete("institutions/:institutionId/professors/:membershipId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: suspend a professor's membership" })
  removeProfessor(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Param("membershipId") membershipId: string) {
    return this.service.removeProfessor(institutionId, membershipId, userId);
  }

  @Get("institutions/:institutionId/students")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: student roster (paginated, searchable)" })
  getStudents(@Param("institutionId") institutionId: string, @Query() query: { page?: string; limit?: string; search?: string }) {
    return this.service.getStudents(institutionId, query);
  }

  @Get("institutions/:institutionId/students/export")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: export the student roster as CSV" })
  async exportStudents(@Param("institutionId") institutionId: string, @Query("search") search: string | undefined, @Res() res: Response) {
    const csv = await this.service.exportStudentsCsv(institutionId, search);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="students-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }

  @Post("institutions/:institutionId/students/invite")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: directly add a student by email (not domain-auto-join)" })
  inviteStudent(
    @Param("institutionId") institutionId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: { email: string; first_name?: string; last_name?: string },
  ) {
    return this.service.inviteStudent(institutionId, userId, dto);
  }

  @Post("institutions/:institutionId/students/:membershipId/resend-invite")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: resend the password-setup email for a still-pending student invite" })
  resendStudentInvite(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Param("membershipId") membershipId: string) {
    return this.service.resendProfessorInvite(institutionId, membershipId, userId);
  }

  @Delete("institutions/:institutionId/students/:membershipId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: remove a directly-added student's membership" })
  removeStudent(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Param("membershipId") membershipId: string) {
    return this.service.removeProfessor(institutionId, membershipId, userId);
  }

  @Get("institutions/:institutionId/courses")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: this institution's courses (paginated, searchable)" })
  getCourses(@Param("institutionId") institutionId: string, @Query() query: { page?: string; limit?: string; search?: string }) {
    return this.service.getCourses(institutionId, query);
  }

  @Get("institutions/:institutionId/courses/export")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: export this institution's courses as CSV" })
  async exportCourses(@Param("institutionId") institutionId: string, @Query("search") search: string | undefined, @Res() res: Response) {
    const csv = await this.service.exportCoursesCsv(institutionId, search);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="courses-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }

  // ── Academic terms & cohorts (academia app) ─────────────────────────────────

  @Get("institutions/:institutionId/terms")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin, InstitutionRole.professor)
  @ApiOperation({ summary: "List academic terms — professors can view (to scope a course), only owner/admin can manage" })
  getTerms(@Param("institutionId") institutionId: string) {
    return this.service.getTerms(institutionId);
  }

  @Post("institutions/:institutionId/terms")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: create an academic term" })
  createTerm(@CurrentUser("id") userId: string, @Param("institutionId") institutionId: string, @Body() dto: { name: string; start_date: string; end_date: string; status?: "upcoming" | "active" | "completed" }) {
    return this.service.createTerm(institutionId, dto, userId);
  }

  @Patch("institutions/:institutionId/terms/:termId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: update an academic term" })
  updateTerm(@Param("institutionId") institutionId: string, @Param("termId") termId: string, @Body() dto: Partial<{ name: string; start_date: string; end_date: string; status: "upcoming" | "active" | "completed" }>) {
    return this.service.updateTerm(institutionId, termId, dto);
  }

  @Delete("institutions/:institutionId/terms/:termId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: delete an academic term" })
  deleteTerm(@Param("institutionId") institutionId: string, @Param("termId") termId: string) {
    return this.service.deleteTerm(institutionId, termId);
  }

  @Get("institutions/:institutionId/cohorts")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: list cohorts" })
  getCohorts(@Param("institutionId") institutionId: string) {
    return this.service.getCohorts(institutionId);
  }

  @Post("institutions/:institutionId/cohorts")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: create a cohort" })
  createCohort(@Param("institutionId") institutionId: string, @Body() dto: { name: string; description?: string; term_id?: string | null }) {
    return this.service.createCohort(institutionId, dto);
  }

  @Patch("institutions/:institutionId/cohorts/:cohortId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: update a cohort" })
  updateCohort(@Param("institutionId") institutionId: string, @Param("cohortId") cohortId: string, @Body() dto: Partial<{ name: string; description: string | null; term_id: string | null }>) {
    return this.service.updateCohort(institutionId, cohortId, dto);
  }

  @Delete("institutions/:institutionId/cohorts/:cohortId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: delete a cohort" })
  deleteCohort(@Param("institutionId") institutionId: string, @Param("cohortId") cohortId: string) {
    return this.service.deleteCohort(institutionId, cohortId);
  }

  @Get("institutions/:institutionId/cohorts/:cohortId/members")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: list a cohort's students" })
  getCohortMembers(@Param("institutionId") institutionId: string, @Param("cohortId") cohortId: string) {
    return this.service.getCohortMembers(institutionId, cohortId);
  }

  @Post("institutions/:institutionId/cohorts/:cohortId/members")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: add students (already institution members) to a cohort" })
  addCohortMembers(@Param("institutionId") institutionId: string, @Param("cohortId") cohortId: string, @Body() dto: { user_ids: string[] }) {
    return this.service.addCohortMembers(institutionId, cohortId, dto.user_ids);
  }

  @Delete("institutions/:institutionId/cohorts/:cohortId/members/:membershipId")
  @UseGuards(InstitutionRoleGuard)
  @InstitutionRoles(InstitutionRole.owner, InstitutionRole.admin)
  @ApiOperation({ summary: "Institution admin: remove a student from a cohort" })
  removeCohortMember(@Param("institutionId") institutionId: string, @Param("cohortId") cohortId: string, @Param("membershipId") membershipId: string) {
    return this.service.removeCohortMember(institutionId, cohortId, membershipId);
  }

  // ── Public storefront (marketing-site) ──────────────────────────────────────

  @Public()
  @Get("institutions/public")
  @ApiOperation({ summary: "Public: list active institutions with a public storefront" })
  getPublicList() {
    return this.service.getPublicList();
  }

  @Public()
  @Get("institutions/public/:slug")
  @ApiOperation({ summary: "Public: institution storefront profile by slug" })
  getPublicBySlug(@Param("slug") slug: string) {
    return this.service.getPublicBySlug(slug);
  }

  // ── Professor's own view (professors app) ──────────────────────────────────

  @Get("me/institutions")
  @ApiOperation({ summary: "My active professor/admin/owner institution memberships (for course-creation institution picker)" })
  getMyInstitutions(@CurrentUser("id") userId: string) {
    return this.service.getMyInstitutions(userId);
  }

  @Get("me/institution-memberships")
  @ApiOperation({ summary: "All of my active institution memberships, any role (for the student portal's My University link)" })
  getMyMemberships(@CurrentUser("id") userId: string) {
    return this.service.getMyMemberships(userId);
  }
}
