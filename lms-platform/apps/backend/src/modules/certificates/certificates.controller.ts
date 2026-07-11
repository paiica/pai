import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe, Query, ParseIntPipe } from "@nestjs/common";
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
}
