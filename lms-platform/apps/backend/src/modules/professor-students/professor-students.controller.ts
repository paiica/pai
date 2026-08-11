import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ProfessorStudentsService } from "./professor-students.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { InviteStudentDto } from "./dto/invite-student.dto";
import { BulkInviteStudentsDto } from "./dto/bulk-invite-students.dto";
import { AddExistingStudentDto } from "./dto/add-existing-student.dto";
import { CreateCourseInvitationsDto } from "./dto/create-course-invitations.dto";

@ApiTags("Professor — Students")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.professor, Role.admin, Role.super_admin)
@Controller("prof")
export class ProfessorStudentsController {
  constructor(private service: ProfessorStudentsService) {}

  @Get("students")
  @ApiOperation({ summary: "List my student roster" })
  listStudents(@CurrentUser("id") professorId: string, @Query("q") q?: string) {
    return this.service.listStudents(professorId, q);
  }

  @Post("students/invite")
  @ApiOperation({ summary: "Invite a student by email — creates their account if new" })
  inviteStudent(@CurrentUser("id") professorId: string, @Body() dto: InviteStudentDto) {
    return this.service.inviteStudent(professorId, dto);
  }

  @Post("students/bulk-invite")
  @ApiOperation({ summary: "Invite multiple students by email at once" })
  bulkInviteStudents(@CurrentUser("id") professorId: string, @Body() dto: BulkInviteStudentsDto) {
    return this.service.bulkInviteStudents(professorId, dto.emails);
  }

  @Post("students/add-existing")
  @ApiOperation({ summary: "Add a student who already has a PAII account" })
  addExisting(@CurrentUser("id") professorId: string, @Body() dto: AddExistingStudentDto) {
    return this.service.addExistingStudent(professorId, dto.email);
  }

  @Delete("students/:studentId")
  @ApiOperation({ summary: "Remove a student from my roster (does not delete their account)" })
  removeStudent(@CurrentUser("id") professorId: string, @Param("studentId") studentId: string) {
    return this.service.removeStudent(professorId, studentId);
  }

  @Post("courses/:courseId/invitations")
  @ApiOperation({ summary: "Invite one or more of my students to a course" })
  createInvitations(
    @Param("courseId") courseId: string,
    @Body() dto: CreateCourseInvitationsDto,
    @CurrentUser("id") professorId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.createInvitations(professorId, courseId, dto.student_ids, role);
  }

  @Get("courses/:courseId/invitations")
  @ApiOperation({ summary: "View invitation status for a course" })
  getCourseInvitations(
    @Param("courseId") courseId: string,
    @CurrentUser("id") professorId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.getCourseInvitations(professorId, courseId, role);
  }

  @Post("certifications/:certificationId/recommendations")
  @ApiOperation({ summary: "Recommend a certification to one or more of my students" })
  createCertificationRecommendations(
    @Param("certificationId") certificationId: string,
    @Body() dto: CreateCourseInvitationsDto,
    @CurrentUser("id") professorId: string,
  ) {
    return this.service.createCertificationRecommendations(professorId, certificationId, dto.student_ids);
  }

  @Post("programs/:programId/recommendations")
  @ApiOperation({ summary: "Recommend a program to one or more of my students" })
  createProgramRecommendations(
    @Param("programId") programId: string,
    @Body() dto: CreateCourseInvitationsDto,
    @CurrentUser("id") professorId: string,
  ) {
    return this.service.createProgramRecommendations(professorId, programId, dto.student_ids);
  }
}
