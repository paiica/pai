import {
  BadRequestException, Controller, Get, Post, Put, Patch, Delete, Body, Param, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe, Res,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PrepCoursesService } from "./prep-courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

// In-memory storage that avoids importing multer v2 directly (ESM-only
// package) — same pattern as ai.controller.ts / uploads.controller.ts.
const RAM_STORAGE: any = {
  _handleFile(_req: any, file: any, cb: any) {
    const chunks: Buffer[] = [];
    file.stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    file.stream.on("end", () => cb(null, { buffer: Buffer.concat(chunks) }));
    file.stream.on("error", (err: Error) => cb(err));
  },
  _removeFile(_req: any, _file: any, cb: any) { cb(null); },
};

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

  @Post(":courseId/approve")
  @ApiOperation({ summary: "Approve a professor-submitted course — publishes it to the public catalog" })
  approveCourse(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.service.adminApproveCourse(courseId, adminUserId);
  }

  @Post(":courseId/reject")
  @ApiOperation({ summary: "Reject a professor-submitted course, with a reason" })
  rejectCourse(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body() dto: { reason: string },
    @CurrentUser("id") adminUserId: string,
  ) {
    return this.service.adminRejectCourse(courseId, adminUserId, dto.reason);
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

  @Post(":id/ai-overview-from-build")
  @ApiOperation({ summary: "Draft the Overview/Content fields from this course's actual built modules/lessons" })
  generateOverviewFromBuild(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.generateOverviewFromBuild(id);
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

  @Post(":id/import")
  @ApiOperation({ summary: "Import an Articulate Rise 360 export (.zip) as new modules/lessons" })
  // 600MB — Rise exports with several embedded (non-YouTube/Vimeo) videos
  // can land well past the old 150MB ceiling.
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 600 * 1024 * 1024 } }))
  importRiseExport(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("mode") mode?: "decompose" | "preserve" | "scorm",
  ) {
    if (!file) throw new BadRequestException("No file received");
    return this.service.adminImportRiseExport(id, file.buffer, mode);
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

  @Delete(":id/modules")
  @ApiOperation({ summary: "Delete ALL modules (and their lessons) for a course — irreversible, clears the whole build" })
  deleteAllModules(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminDeleteAllModules(id);
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

  @Post(":id/modules/:moduleId/lessons/:lessonId/blocks/preview")
  @ApiOperation({ summary: "Render a block list to HTML without saving (block builder live preview)" })
  previewLessonBlocks(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("blocks") blocks: any[],
  ) {
    return this.service.adminPreviewLessonBlocks(id, moduleId, lessonId, blocks ?? []);
  }

  @Put(":id/modules/:moduleId/lessons/:lessonId/blocks")
  @ApiOperation({ summary: "Save a lesson's block list (renders + persists blocks_json and content_body)" })
  saveLessonBlocks(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("blocks") blocks: any[],
  ) {
    return this.service.adminSaveLessonBlocks(id, moduleId, lessonId, blocks ?? []);
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

  @Get(":id/submissions/export")
  @ApiOperation({ summary: "Export this course's gradebook as CSV" })
  async exportSubmissions(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCourseSubmissions(id, userId, role);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }

  @Get("lessons/:lessonId/submissions/:studentUserId/attempts")
  @ApiOperation({ summary: "Full attempt history for one student's assignment submissions" })
  getSubmissionAttempts(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("studentUserId", ParseUUIDPipe) studentUserId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.getSubmissionAttempts(lessonId, studentUserId, userId, role);
  }

  @Get("lessons/:lessonId/statistics")
  @ApiOperation({ summary: "Submission/grading statistics for one assignment lesson" })
  getAssignmentStatistics(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.getAssignmentStatistics(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/duplicate")
  @ApiOperation({ summary: "Duplicate a lesson (settings + resources/questions, never submissions or progress)" })
  duplicateLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.duplicateLesson(lessonId, userId, role);
  }

  @Get("lessons/:lessonId/resources")
  @ApiOperation({ summary: "List a lesson's downloadable resources (assignment instructions, datasets, templates, etc.)" })
  getLessonResources(@Param("lessonId", ParseUUIDPipe) lessonId: string) {
    return this.service.getLessonResources(lessonId);
  }

  @Post("lessons/:lessonId/resources")
  @ApiOperation({ summary: "Attach a downloadable resource to a lesson" })
  createLessonResource(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Body() dto: any) {
    return this.service.createLessonResource(lessonId, dto);
  }

  @Patch("lessons/:lessonId/resources/:resourceId")
  @ApiOperation({ summary: "Rename or replace a lesson resource" })
  updateLessonResource(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("resourceId", ParseUUIDPipe) resourceId: string,
    @Body() dto: any,
  ) {
    return this.service.updateLessonResource(lessonId, resourceId, dto);
  }

  @Delete("lessons/:lessonId/resources/:resourceId")
  @ApiOperation({ summary: "Delete a lesson resource" })
  deleteLessonResource(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Param("resourceId", ParseUUIDPipe) resourceId: string) {
    return this.service.deleteLessonResource(lessonId, resourceId);
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
