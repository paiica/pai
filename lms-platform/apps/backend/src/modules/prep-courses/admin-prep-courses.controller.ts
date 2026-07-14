import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PrepCoursesService } from "./prep-courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Admin — Courses")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.super_admin)
@Controller("admin/courses")
export class AdminPrepCoursesController {
  constructor(private service: PrepCoursesService) {}

  @Get()
  @ApiOperation({ summary: "List all courses (super_admin only)" })
  getAll() {
    return this.service.adminGetAll();
  }

  @Get("enrollments")
  @ApiOperation({ summary: "List all course enrollments with student details" })
  getEnrollments() {
    return this.service.adminGetEnrollments();
  }

  @Delete("enrollments/:enrollmentId")
  @ApiOperation({ summary: "Delete a course enrollment (admin)" })
  deleteEnrollment(@Param("enrollmentId", ParseUUIDPipe) enrollmentId: string) {
    return this.service.adminDeleteEnrollment(enrollmentId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get course with full detail" })
  getOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new course" })
  create(@Body() dto: any) {
    return this.service.adminCreate(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a course" })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.adminUpdate(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a course" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminDelete(id);
  }

  @Post(":id/teachers")
  @ApiOperation({ summary: "Assign a professor to this course" })
  assignTeacher(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("user_id") userId: string,
    @Body("is_lead") isLead?: boolean,
  ) {
    return this.service.assignTeacher(id, userId, isLead ?? false);
  }

  @Delete(":id/teachers/:userId")
  @ApiOperation({ summary: "Remove a professor from this course" })
  removeTeacher(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.service.removeTeacher(id, userId);
  }

  @Get(":id/documents")
  @ApiOperation({ summary: "List downloadable documents (syllabus, outline, etc.) for this course" })
  getDocuments(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetDocuments(id);
  }

  @Post(":id/documents")
  @ApiOperation({ summary: "Add a downloadable document to this course" })
  createDocument(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.adminCreateDocument(id, dto);
  }

  @Patch(":id/documents/:documentId")
  @ApiOperation({ summary: "Rename or replace a document" })
  updateDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() dto: any,
  ) {
    return this.service.adminUpdateDocument(id, documentId, dto);
  }

  @Delete(":id/documents/:documentId")
  @ApiOperation({ summary: "Delete a document" })
  deleteDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.service.adminDeleteDocument(id, documentId);
  }

  @Post(":id/publish-all")
  @ApiOperation({ summary: "Publish all modules and lessons for a course" })
  publishAll(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminPublishAll(id);
  }

  @Get(":id/modules")
  @ApiOperation({ summary: "List all modules for a course" })
  getModules(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetModules(id);
  }

  @Post(":id/modules")
  @ApiOperation({ summary: "Create a module in a course" })
  createModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.service.adminCreateModule(id, dto);
  }

  @Patch(":id/modules/:moduleId")
  @ApiOperation({ summary: "Update a module" })
  updateModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: any,
  ) {
    return this.service.adminUpdateModule(id, moduleId, dto);
  }

  @Delete(":id/modules/:moduleId")
  @ApiOperation({ summary: "Delete a module from a course" })
  deleteModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
  ) {
    return this.service.adminDeleteModule(id, moduleId);
  }

  @Post(":id/modules/:moduleId/lessons")
  @ApiOperation({ summary: "Create a lesson in a module" })
  createLesson(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: any,
  ) {
    return this.service.adminCreateLesson(id, moduleId, dto);
  }

  @Patch(":id/modules/:moduleId/lessons/:lessonId")
  @ApiOperation({ summary: "Update a lesson" })
  updateLesson(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: any,
  ) {
    return this.service.adminUpdateLesson(id, moduleId, lessonId, dto);
  }

  @Delete(":id/modules/:moduleId/lessons/:lessonId")
  @ApiOperation({ summary: "Delete a lesson from a module" })
  deleteLesson(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
  ) {
    return this.service.adminDeleteLesson(id, moduleId, lessonId);
  }

  @Get(":id/modules/:moduleId/lessons/:lessonId/questions")
  getQuestions(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
  ) {
    return this.service.adminGetQuestions(id, moduleId, lessonId);
  }

  @Post(":id/modules/:moduleId/lessons/:lessonId/questions")
  createQuestion(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: any,
  ) {
    return this.service.adminCreateQuestion(id, moduleId, lessonId, dto);
  }

  @Patch(":id/modules/:moduleId/lessons/:lessonId/questions/:questionId")
  updateQuestion(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @Body() dto: any,
  ) {
    return this.service.adminUpdateQuestion(id, moduleId, lessonId, questionId, dto);
  }

  @Delete(":id/modules/:moduleId/lessons/:lessonId/questions/:questionId")
  deleteQuestion(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("questionId", ParseUUIDPipe) questionId: string,
  ) {
    return this.service.adminDeleteQuestion(id, moduleId, lessonId, questionId);
  }

  @Get(":id/submissions")
  getSubmissions(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetSubmissions(id);
  }

  @Get(":id/recommendations")
  @ApiOperation({ summary: "Get recommended certifications for this course" })
  getRecommendations(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetRecommendations(id);
  }

  @Put(":id/recommendations")
  @ApiOperation({ summary: "Replace recommended certifications for this course" })
  setRecommendations(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("certifications") certifications: { certification_id: string; is_required?: boolean }[],
  ) {
    return this.service.adminSetRecommendations(id, certifications ?? []);
  }

  @Get(":id/prerequisites")
  @ApiOperation({ summary: "Get prerequisite/co-requisite courses for this course" })
  getPrerequisites(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetPrerequisites(id);
  }

  @Put(":id/prerequisites")
  @ApiOperation({ summary: "Replace prerequisite/co-requisite courses for this course" })
  setPrerequisites(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("prerequisites") prerequisites: { course_id: string; type: "prerequisite" | "corequisite" }[],
  ) {
    return this.service.adminSetPrerequisites(id, prerequisites ?? []);
  }
}
