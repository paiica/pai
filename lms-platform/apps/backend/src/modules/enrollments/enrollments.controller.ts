import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { EnrollmentsService } from "./enrollments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Enrollments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("enrollments")
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Get("my")
  @ApiOperation({ summary: "Get my enrollments" })
  getMyEnrollments(@CurrentUser("id") userId: string) {
    return this.enrollmentsService.getMyEnrollments(userId);
  }

  @Get("my/:id")
  @ApiOperation({ summary: "Get enrollment with full progress" })
  getEnrollment(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.enrollmentsService.getEnrollment(userId, id);
  }

  @Post("my/:id/lessons/:lessonId/complete")
  @ApiOperation({ summary: "Mark lesson as completed" })
  markComplete(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() body: { quiz_score?: number; quiz_passed?: boolean; watch_seconds?: number },
  ) {
    return this.enrollmentsService.markLessonComplete(userId, enrollmentId, lessonId, body);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "List all enrollments (admin)" })
  adminGetAll(@Query("page") page = 1, @Query("limit") limit = 20) {
    return this.enrollmentsService.adminGetAll({ page: +page, limit: +limit });
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Delete an enrollment and all its data (admin)" })
  adminDelete(@Param("id", ParseUUIDPipe) id: string) {
    return this.enrollmentsService.adminDelete(id);
  }
}
