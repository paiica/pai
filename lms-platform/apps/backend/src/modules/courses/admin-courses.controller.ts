import {
  Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe, NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CoursesService } from "./courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AssignInstructorDto } from "./dto/assign-instructor.dto";

@ApiTags("Admin — Certifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/certifications")
export class AdminCoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: "List all certifications with stats" })
  getAll() {
    return this.coursesService.adminGetAllCertifications();
  }

  @Get(":certId")
  @ApiOperation({ summary: "Get a single certification with full detail" })
  getOne(@Param("certId", ParseUUIDPipe) certId: string) {
    return this.coursesService.adminGetCertification(certId);
  }

  @Get(":certId/enrollments")
  @ApiOperation({ summary: "List all enrollments for a certification" })
  getCertEnrollments(@Param("certId", ParseUUIDPipe) certId: string) {
    return this.coursesService.adminGetCertificationEnrollments(certId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new certification program" })
  create(@Body() dto: any) {
    return this.coursesService.adminCreateCertification(dto);
  }

  @Patch(":certId")
  @ApiOperation({ summary: "Update certification (publish, archive, edit metadata)" })
  update(@Param("certId", ParseUUIDPipe) certId: string, @Body() dto: any) {
    return this.coursesService.adminUpdateCertification(certId, dto);
  }

  @Post(":certId/instructors")
  @ApiOperation({ summary: "Assign an instructor to this certification" })
  assignInstructor(
    @Param("certId", ParseUUIDPipe) certId: string,
    @Body() dto: AssignInstructorDto,
  ) {
    return this.coursesService.assignInstructor(certId, dto.user_id, dto.is_lead ?? false);
  }

  @Delete(":certId")
  @ApiOperation({ summary: "Permanently delete a certification and all related data" })
  deleteCert(@Param("certId", ParseUUIDPipe) certId: string) {
    return this.coursesService.adminDeleteCertification(certId);
  }

  @Delete(":certId/instructors/:userId")
  @ApiOperation({ summary: "Remove an instructor from this certification" })
  removeInstructor(
    @Param("certId", ParseUUIDPipe) certId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.coursesService.removeInstructor(certId, userId);
  }
}
