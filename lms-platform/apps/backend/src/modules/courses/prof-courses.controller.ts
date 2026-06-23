import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CoursesService } from "./courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateModuleDto } from "./dto/create-module.dto";
import { UpdateModuleDto } from "./dto/update-module.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { ReorderItemsDto } from "./dto/reorder-items.dto";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { GradeSubmissionDto } from "./dto/grade-submission.dto";

@ApiTags("Professor — Course Builder")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.professor, Role.admin, Role.super_admin)
@Controller("prof")
export class ProfCoursesController {
  constructor(private coursesService: CoursesService) {}

  // ─── Certifications ───────────────────────────────────────────────────

  @Get("certifications")
  @ApiOperation({ summary: "List certifications I am assigned to" })
  getMyCertifications(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getProfessorCertifications(userId, role);
  }

  @Get("certifications/:certId")
  @ApiOperation({ summary: "Get full certification with all modules and lessons (builder view)" })
  getCertification(
    @Param("certId", ParseUUIDPipe) certId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getCertificationForBuilder(certId, userId, role);
  }

  // ─── Modules ─────────────────────────────────────────────────────────

  @Post("certifications/:certId/modules")
  @ApiOperation({ summary: "Create a module" })
  createModule(
    @Param("certId", ParseUUIDPipe) certId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.createModule(certId, dto, userId, role);
  }

  @Put("modules/:moduleId")
  @ApiOperation({ summary: "Update a module" })
  updateModule(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.updateModule(moduleId, dto, userId, role);
  }

  @Delete("modules/:moduleId")
  @ApiOperation({ summary: "Delete a module" })
  deleteModule(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.deleteModule(moduleId, userId, role);
  }

  @Post("certifications/:certId/modules/reorder")
  @ApiOperation({ summary: "Reorder modules" })
  reorderModules(
    @Param("certId", ParseUUIDPipe) certId: string,
    @Body() dto: ReorderItemsDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.reorderModules(certId, dto, userId, role);
  }

  // ─── Lessons ─────────────────────────────────────────────────────────

  @Post("modules/:moduleId/lessons")
  @ApiOperation({ summary: "Create a lesson" })
  createLesson(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.createLesson(moduleId, dto, userId, role);
  }

  @Put("lessons/:lessonId")
  @ApiOperation({ summary: "Update a lesson" })
  updateLesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.updateLesson(lessonId, dto, userId, role);
  }

  @Delete("lessons/:lessonId")
  @ApiOperation({ summary: "Delete a lesson" })
  deleteLesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.deleteLesson(lessonId, userId, role);
  }

  @Post("modules/:moduleId/lessons/reorder")
  @ApiOperation({ summary: "Reorder lessons within a module" })
  reorderLessons(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: ReorderItemsDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.reorderLessons(moduleId, dto, userId, role);
  }

  // ─── Quiz Questions ───────────────────────────────────────────────────

  @Post("lessons/:lessonId/questions")
  @ApiOperation({ summary: "Add a quiz question to a lesson" })
  createQuestion(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.createQuestion(lessonId, dto, userId, role);
  }

  @Put("questions/:questionId")
  @ApiOperation({ summary: "Update a quiz question" })
  updateQuestion(
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.updateQuestion(questionId, dto, userId, role);
  }

  @Delete("questions/:questionId")
  @ApiOperation({ summary: "Delete a quiz question" })
  deleteQuestion(
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.deleteQuestion(questionId, userId, role);
  }

  // ─── Students & Submissions ───────────────────────────────────────────

  @Get("certifications/:certId/students")
  @ApiOperation({ summary: "Get enrolled students with progress" })
  getStudents(
    @Param("certId", ParseUUIDPipe) certId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getCertificationStudents(certId, userId, role);
  }

  @Get("certifications/:certId/submissions")
  @ApiOperation({ summary: "Get all assignment submissions for this certification" })
  getSubmissions(
    @Param("certId", ParseUUIDPipe) certId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getCertificationSubmissions(certId, userId, role);
  }

  @Put("submissions/:submissionId/grade")
  @ApiOperation({ summary: "Grade an assignment submission" })
  gradeSubmission(
    @Param("submissionId", ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.gradeSubmission(submissionId, dto, userId, role);
  }

  @Get("certifications/:certId/gradebook")
  @ApiOperation({ summary: "Get full gradebook for this certification" })
  getGradebook(
    @Param("certId", ParseUUIDPipe) certId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getGradebook(certId, userId, role);
  }
}
