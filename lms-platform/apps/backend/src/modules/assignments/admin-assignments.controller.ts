import {
  Controller, Get, Post, Patch, Delete, Put, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { AssignmentsService } from "./assignments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Admin — Assignments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin, Role.admin)
@Controller("admin/assignments")
export class AdminAssignmentsController {
  constructor(private service: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: "List all assignments, optionally filtered by certification" })
  list(@Query("cert_id") certId?: string) {
    return this.service.adminList(certId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new assignment" })
  create(@Body() dto: any) {
    return this.service.adminCreate(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single assignment" })
  getOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an assignment" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.adminUpdate(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an assignment" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminDelete(id);
  }

  @Post(":id/release-grades")
  @ApiOperation({ summary: "Release grades to students" })
  releaseGrades(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminReleaseGrades(id);
  }

  @Get(":id/entries")
  @ApiOperation({ summary: "List all student entries for an assignment" })
  getEntries(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetEntries(id);
  }

  @Put(":id/entries/:entryId/grade")
  @ApiOperation({ summary: "Grade a student submission (section-based)" })
  gradeEntry(
    @Param("id", ParseUUIDPipe) _id: string,
    @Param("entryId", ParseUUIDPipe) entryId: string,
    @Body() dto: { section_grades: { section_id: string; grade: number; feedback?: string }[]; overall_feedback?: string },
    @CurrentUser("id") adminId: string,
  ) {
    return this.service.adminGradeEntry(entryId, adminId, dto);
  }
}
