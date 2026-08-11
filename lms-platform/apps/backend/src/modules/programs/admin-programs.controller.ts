import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ProgramsService } from "./programs.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Admin — Programs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/programs")
export class AdminProgramsController {
  constructor(private service: ProgramsService) {}

  @Get()
  @ApiOperation({ summary: "List all programs" })
  list(@Query("page") page = 1, @Query("limit") limit = 25, @Query("q") q?: string, @Query("status") status?: string) {
    return this.service.adminList({ page: +page, limit: +limit, q, status });
  }

  // Registered before ":id" so the literal "enrollments" segment isn't
  // swallowed by the dynamic :id route below.
  @Get("enrollments")
  @ApiOperation({ summary: "List program enrollments — across all programs, or filtered to one via ?program_id=" })
  listAllEnrollments(
    @Query("page") page = 1,
    @Query("limit") limit = 25,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("program_id") program_id?: string,
  ) {
    return this.service.adminListAllEnrollments({ page: +page, limit: +limit, q, status, program_id });
  }

  @Patch("certificates/:certificateId/revoke")
  @ApiOperation({ summary: "Revoke an issued program certificate" })
  revokeCertificate(@Param("certificateId") certificateId: string, @Body() dto: { reason?: string }) {
    return this.service.adminRevokeCertificate(certificateId, dto?.reason);
  }

  @Patch("certificates/:certificateId/reactivate")
  @ApiOperation({ summary: "Reactivate a revoked program certificate" })
  reactivateCertificate(@Param("certificateId") certificateId: string) {
    return this.service.adminReactivateCertificate(certificateId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one program with full curriculum" })
  getOne(@Param("id") id: string) {
    return this.service.adminGetOne(id);
  }

  @Post(":id/ai-overview-from-build")
  @ApiOperation({ summary: "Draft overview/marketing copy from the program's actual bundled courses" })
  generateOverviewFromBuild(@Param("id") id: string) {
    return this.service.adminGenerateOverviewFromBuild(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a program" })
  create(@Body() dto: Record<string, any>, @CurrentUser("id") adminUserId: string) {
    return this.service.adminCreate(dto, adminUserId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a program's fields" })
  update(@Param("id") id: string, @Body() dto: Record<string, any>) {
    return this.service.adminUpdate(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a program" })
  remove(@Param("id") id: string) {
    return this.service.adminDelete(id);
  }

  @Post(":id/duplicate")
  @ApiOperation({ summary: "Duplicate a program (as a new draft) including its curriculum" })
  duplicate(@Param("id") id: string) {
    return this.service.adminDuplicate(id);
  }

  @Patch(":id/publish")
  @ApiOperation({ summary: "Publish a program" })
  publish(@Param("id") id: string) {
    return this.service.adminSetStatus(id, "published");
  }

  @Patch(":id/unpublish")
  @ApiOperation({ summary: "Unpublish a program back to draft" })
  unpublish(@Param("id") id: string) {
    return this.service.adminSetStatus(id, "draft");
  }

  @Patch(":id/archive")
  @ApiOperation({ summary: "Archive a program" })
  archive(@Param("id") id: string) {
    return this.service.adminSetStatus(id, "archived");
  }

  // ── Curriculum ──────────────────────────────────────────────────────────

  @Post(":id/courses")
  @ApiOperation({ summary: "Add an existing course to the program" })
  addCourse(@Param("id") id: string, @Body() dto: { course_id: string; is_required?: boolean }) {
    return this.service.adminAddCourse(id, dto.course_id, dto.is_required ?? true);
  }

  @Delete(":id/courses/:programCourseId")
  @ApiOperation({ summary: "Remove a course from the program" })
  removeCourse(@Param("id") id: string, @Param("programCourseId") programCourseId: string) {
    return this.service.adminRemoveCourse(id, programCourseId);
  }

  @Patch(":id/courses/reorder")
  @ApiOperation({ summary: "Reorder the program's curriculum" })
  reorderCourses(@Param("id") id: string, @Body() dto: { program_course_ids: string[] }) {
    return this.service.adminReorderCourses(id, dto.program_course_ids);
  }

  @Patch(":id/courses/:programCourseId")
  @ApiOperation({ summary: "Toggle a course between required and elective" })
  setCourseRequired(@Param("id") id: string, @Param("programCourseId") programCourseId: string, @Body() dto: { is_required: boolean }) {
    return this.service.adminSetCourseRequired(id, programCourseId, dto.is_required);
  }

  @Patch(":id/courses/:programCourseId/special-type")
  @ApiOperation({ summary: "Flag (or unflag) a bundled course as this program's capstone or internship" })
  setCourseSpecialType(
    @Param("id") id: string,
    @Param("programCourseId") programCourseId: string,
    @Body() dto: { special_type: "capstone" | "internship" | null; special_metadata?: Record<string, any> },
  ) {
    return this.service.adminSetCourseSpecialType(id, programCourseId, dto);
  }

  // ── Instructors ──────────────────────────────────────────────────────────

  @Post(":id/instructors")
  @ApiOperation({ summary: "Assign an instructor to the program" })
  assignInstructor(@Param("id") id: string, @Body() dto: { user_id: string; is_lead?: boolean }) {
    return this.service.adminAssignInstructor(id, dto.user_id, dto.is_lead ?? false);
  }

  @Delete(":id/instructors/:userId")
  @ApiOperation({ summary: "Remove an instructor from the program" })
  removeInstructor(@Param("id") id: string, @Param("userId") userId: string) {
    return this.service.adminRemoveInstructor(id, userId);
  }

  // ── Course waivers ──────────────────────────────────────────────────────

  @Get("enrollments/:programEnrollmentId/course-waivers")
  @ApiOperation({ summary: "List course waivers granted on a program enrollment" })
  getCourseWaivers(@Param("programEnrollmentId") programEnrollmentId: string) {
    return this.service.adminGetCourseWaivers(programEnrollmentId);
  }

  @Put("enrollments/:programEnrollmentId/course-waivers/:courseId")
  @ApiOperation({ summary: "Waive a required course for a student's program enrollment" })
  setCourseWaiver(
    @Param("programEnrollmentId") programEnrollmentId: string,
    @Param("courseId") courseId: string,
    @Body() dto: { reason?: string },
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.service.adminSetCourseWaiver(programEnrollmentId, courseId, adminUserId, dto?.reason);
  }

  @Delete("enrollments/:programEnrollmentId/course-waivers/:courseId")
  @ApiOperation({ summary: "Revoke a course waiver" })
  removeCourseWaiver(@Param("programEnrollmentId") programEnrollmentId: string, @Param("courseId") courseId: string) {
    return this.service.adminRemoveCourseWaiver(programEnrollmentId, courseId);
  }
}
