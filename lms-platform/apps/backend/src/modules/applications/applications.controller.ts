import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ApplicationStatus, Role } from "@prisma/client";
import { ApplicationsService } from "./applications.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Applications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("applications")
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Get("my")
  @ApiOperation({ summary: "Get my applications" })
  getMyApplications(@CurrentUser("id") userId: string) {
    return this.applicationsService.getMyApplications(userId);
  }

  @Post()
  @ApiOperation({ summary: "Submit a new application" })
  create(@CurrentUser("id") userId: string, @Body() dto: any) {
    return this.applicationsService.create(userId, dto);
  }

  @Get("pending")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get pending applications (admin)" })
  getPending(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.applicationsService.getPendingApplications({ page: +page, limit: +limit });
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get all applications with filter (admin)" })
  getAll(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("status") status?: ApplicationStatus,
  ) {
    return this.applicationsService.getAll({ page: +page, limit: +limit, status });
  }

  @Patch(":id/approve")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Approve application (admin)" })
  approve(@Param("id", ParseUUIDPipe) id: string, @CurrentUser("id") adminId: string) {
    return this.applicationsService.approve(id, adminId);
  }

  @Patch(":id/reject")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Reject application (admin)" })
  reject(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") adminId: string,
    @Body("reason") reason?: string,
  ) {
    return this.applicationsService.reject(id, adminId, reason);
  }

  @Patch(":id/set-pending")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Reset application to pending review (admin)" })
  setPending(@Param("id", ParseUUIDPipe) id: string) {
    return this.applicationsService.setPending(id);
  }

  @Patch(":id/verify-payment")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Verify submitted payment and move to pending review (admin)" })
  verifyPayment(@Param("id", ParseUUIDPipe) id: string) {
    return this.applicationsService.verifyPayment(id);
  }

  @Patch(":id/reject-payment")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Reject submitted payment and reset to unpaid (admin)" })
  rejectPayment(@Param("id", ParseUUIDPipe) id: string) {
    return this.applicationsService.rejectPayment(id);
  }

  @Patch(":id/unverify-payment")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Un-verify payment — move from pending_review back to payment_submitted (admin)" })
  unverifyPayment(@Param("id", ParseUUIDPipe) id: string) {
    return this.applicationsService.unverifyPayment(id);
  }

  @Patch(":id/withdraw")
  @ApiOperation({ summary: "Student withdraws their own application (pending_payment only)" })
  withdraw(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.applicationsService.withdraw(id, userId);
  }

  // ── Document request (admin) ─────────────────────────────────────────────────

  @Patch(":id/request-documents")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Request supporting documents from applicant (admin)" })
  requestDocuments(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") adminId: string,
    @Body("message") message?: string,
  ) {
    return this.applicationsService.requestDocuments(id, adminId, message);
  }

  @Patch(":id/cancel-document-request")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Cancel document request (admin)" })
  cancelDocumentRequest(@Param("id", ParseUUIDPipe) id: string) {
    return this.applicationsService.cancelDocumentRequest(id);
  }

  // ── Document upload (student) ────────────────────────────────────────────────

  @Post(":id/submit-documents")
  @ApiOperation({ summary: "Student marks their document uploads as complete" })
  submitDocuments(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.applicationsService.submitDocuments(id, userId);
  }

  @Post(":id/documents")
  @ApiOperation({ summary: "Student uploads a supporting document" })
  addDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: { file_url: string; s3_key: string; file_name: string; mime_type?: string; file_size?: number },
  ) {
    return this.applicationsService.addDocument(id, userId, dto);
  }

  @Get(":id/documents")
  @ApiOperation({ summary: "List documents for an application" })
  getDocuments(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: string },
  ) {
    const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";
    return this.applicationsService.getDocuments(id, isAdmin ? undefined : currentUser.id);
  }

  @Delete(":id/documents/:docId")
  @ApiOperation({ summary: "Delete a document (student only)" })
  deleteDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("docId", ParseUUIDPipe) docId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.applicationsService.deleteDocument(docId, userId);
  }

  @Delete("bulk")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Bulk delete applications by IDs (admin)" })
  bulkDelete(@Body("ids") ids: string[]) {
    return this.applicationsService.adminBulkDelete(ids ?? []);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Delete a single application (admin)" })
  adminDelete(@Param("id", ParseUUIDPipe) id: string) {
    return this.applicationsService.adminDelete(id);
  }
}
