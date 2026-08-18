import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, Query, ParseIntPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CertificatesService } from "./certificates.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Certificates")
@Controller("certificates")
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Public()
  @Get("verify/:certificateNumber")
  @ApiOperation({ summary: "Verify certificate by number (public)" })
  verify(@Param("certificateNumber") certificateNumber: string) {
    return this.certificatesService.verify(certificateNumber);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my")
  @ApiOperation({ summary: "Get my certificates" })
  getMy(@CurrentUser("id") userId: string) {
    return this.certificatesService.getMyCertificates(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":certificateId/renewal-progress")
  @ApiOperation({ summary: "Get PDU progress and eligibility toward renewing my certificate" })
  getRenewalProgress(
    @Param("certificateId", ParseUUIDPipe) certificateId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.certificatesService.getRenewalProgress(certificateId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(":certificateId/external-pdus")
  @ApiOperation({ summary: "Submit an external PDU activity (conference, other provider, etc.) for admin approval" })
  submitExternalPdu(
    @Param("certificateId", ParseUUIDPipe) certificateId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: {
      title: string; provider?: string; description?: string;
      activity_date: string; proof_url?: string; requested_pdu_value?: number;
    },
  ) {
    return this.certificatesService.submitExternalPdu(userId, certificateId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get("admin/external-pdus")
  @ApiOperation({ summary: "List external PDU submissions for review (admin)" })
  adminListExternalPdus(@Query("status") status?: string) {
    return this.certificatesService.adminListExternalPdus(status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("admin/external-pdus/:submissionId/approve")
  @ApiOperation({ summary: "Approve an external PDU submission and set its awarded PDU value (admin)" })
  adminApproveExternalPdu(
    @Param("submissionId", ParseUUIDPipe) submissionId: string,
    @Body("pdu_value") pduValue: number,
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.certificatesService.adminApproveExternalPdu(submissionId, adminUserId, Number(pduValue));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("admin/external-pdus/:submissionId/reject")
  @ApiOperation({ summary: "Reject an external PDU submission (admin)" })
  adminRejectExternalPdu(
    @Param("submissionId", ParseUUIDPipe) submissionId: string,
    @Body("reason") reason: string | undefined,
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.certificatesService.adminRejectExternalPdu(submissionId, adminUserId, reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get()
  @ApiOperation({ summary: "Get all certificates (admin)" })
  getAll(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.certificatesService.getAll({ page: +page, limit: +limit });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get("admin/enrollments")
  @ApiOperation({ summary: "Get all enrollments with certificate status (admin)" })
  getAdminEnrollments(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.certificatesService.adminGetEnrollments({ page: +page, limit: +limit });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Post("issue/:enrollmentId")
  @ApiOperation({ summary: "Issue certificate for completed enrollment (admin)" })
  issue(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Body("exam_score") examScore: number,
  ) {
    return this.certificatesService.issue(enrollmentId, examScore);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("fail/:enrollmentId")
  @ApiOperation({ summary: "Mark enrollment as failed/suspended (admin)" })
  fail(@Param("enrollmentId", ParseUUIDPipe) enrollmentId: string) {
    return this.certificatesService.fail(enrollmentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("reset-enrollment/:enrollmentId")
  @ApiOperation({ summary: "Reset enrollment to active so student can rebook the exam (admin)" })
  resetToEnrolled(@Param("enrollmentId", ParseUUIDPipe) enrollmentId: string) {
    return this.certificatesService.resetToEnrolled(enrollmentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("reset-to-step/:enrollmentId")
  @ApiOperation({ summary: "Reset student progress to a specific step, undoing everything after it (admin)" })
  resetToStep(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Body("step", ParseIntPipe) step: number,
  ) {
    if (![1, 2, 3, 4].includes(step)) throw new Error("Step must be 1, 2, 3, or 4");
    return this.certificatesService.resetToStep(enrollmentId, step as 1 | 2 | 3 | 4);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("revoke/:certificateId")
  @ApiOperation({ summary: "Revoke an issued certificate (admin)" })
  revoke(@Param("certificateId", ParseUUIDPipe) certificateId: string) {
    return this.certificatesService.revoke(certificateId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch("reactivate/:certificateId")
  @ApiOperation({ summary: "Reactivate a revoked certificate (admin)" })
  reactivate(@Param("certificateId", ParseUUIDPipe) certificateId: string) {
    return this.certificatesService.reactivate(certificateId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get(":enrollmentId/required-courses")
  @ApiOperation({ summary: "List required courses for this enrollment's certification, with purchase/completion/exemption status (admin)" })
  getRequiredCourses(@Param("enrollmentId", ParseUUIDPipe) enrollmentId: string) {
    return this.certificatesService.getRequiredCourseWaivers(enrollmentId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":enrollmentId/my-required-courses")
  @ApiOperation({ summary: "List required courses for my own enrollment's certification, with completion/exemption status" })
  getMyRequiredCourses(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.certificatesService.getMyRequiredCourses(enrollmentId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Put(":enrollmentId/course-waivers/:courseId")
  @ApiOperation({ summary: "Exempt this student from a specific required course for exam booking (admin)" })
  setCourseWaiver(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body("reason") reason: string | undefined,
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.certificatesService.setCourseWaiver(enrollmentId, courseId, adminUserId, reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Delete(":enrollmentId/course-waivers/:courseId")
  @ApiOperation({ summary: "Remove a course exemption (admin)" })
  removeCourseWaiver(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("courseId", ParseUUIDPipe) courseId: string,
  ) {
    return this.certificatesService.removeCourseWaiver(enrollmentId, courseId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Put(":enrollmentId/course-waivers")
  @ApiOperation({ summary: "Exempt this student from ALL required courses for exam booking (admin)" })
  waiveAllCourses(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Body("reason") reason: string | undefined,
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.certificatesService.waiveAllRequiredCourses(enrollmentId, adminUserId, reason);
  }
}
