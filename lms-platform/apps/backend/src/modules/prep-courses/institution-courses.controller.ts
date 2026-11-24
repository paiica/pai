import {
  BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe, Res,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PrepCoursesService } from "./prep-courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { GradeSubmissionDto } from "../courses/dto/grade-submission.dto";

const RAM_STORAGE: any = {
  _handleFile(_req: any, file: any, cb: any) {
    const chunks: Buffer[] = [];
    file.stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    file.stream.on("end", () => cb(null, { buffer: Buffer.concat(chunks) }));
    file.stream.on("error", (err: Error) => cb(err));
  },
  _removeFile(_req: any, _file: any, cb: any) { cb(null); },
};

// Institution-admin mirror of ProfPrepCoursesController — same
// PrepCoursesService, same underlying Prisma logic, unchanged. The only
// meaningful difference is the guard: there's no @Roles() gate here (an
// institution admin's global Role is typically "student", so the
// professor-only RolesGuard would block them entirely) — every method here
// relies on PrepCoursesService.assertTeacherAccess's institution
// owner/admin branch (see prep-courses.service.ts) for the real per-course
// authorization, exactly the same defense-in-depth split the professor
// controller already uses (coarse controller guard + fine service-level check).
@ApiTags("Institution Admin — Course Builder")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("institution-courses")
export class InstitutionCoursesController {
  constructor(private service: PrepCoursesService) {}

  @Post()
  @ApiOperation({ summary: "Institution admin: create a course, attributed to a chosen professor at the institution" })
  createCourse(
    @Body() dto: { title: string; subtitle?: string; description?: string; price?: number; level?: string; institution_id: string; visibility?: "private" | "public"; term_id?: string; instructor_user_id: string },
    @CurrentUser("id") userId: string,
  ) {
    return this.service.institutionCreateCourse(userId, dto);
  }

  @Post(":courseId/submit-for-approval")
  @ApiOperation({ summary: "Submit a course for admin review" })
  submitForApproval(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profSubmitForApproval(courseId, userId, role);
  }

  @Get(":courseId")
  @ApiOperation({ summary: "Get course with full module/lesson tree (builder view)" })
  getCourse(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profGetCourse(courseId, userId, role);
  }

  @Put(":courseId")
  @ApiOperation({ summary: "Update course details" })
  updateCourse(@Param("courseId", ParseUUIDPipe) courseId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profUpdateCourse(courseId, dto, userId, role);
  }

  @Delete(":courseId")
  @ApiOperation({ summary: "Delete a course — blocked if it has any enrollments (archive instead)" })
  deleteCourse(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profDeleteCourse(courseId, userId, role);
  }

  @Get(":courseId/modules")
  @ApiOperation({ summary: "Get full module/lesson tree with rich per-lesson fields (builder view)" })
  getModules(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profGetModules(courseId, userId, role);
  }

  @Post(":courseId/import")
  @ApiOperation({ summary: "Import an Articulate Rise 360 export (.zip) as new modules/lessons" })
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 150 * 1024 * 1024 } }))
  importRiseExport(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
    @Body("mode") mode?: "decompose" | "preserve" | "scorm",
  ) {
    if (!file) throw new BadRequestException("No file received");
    return this.service.profImportRiseExport(courseId, file.buffer, userId, role, mode);
  }

  @Post(":courseId/publish-all")
  @ApiOperation({ summary: "Publish all modules and lessons in this course" })
  publishAll(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profPublishAll(courseId, userId, role);
  }

  @Get(":courseId/documents")
  @ApiOperation({ summary: "List downloadable documents for this course" })
  getDocuments(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profGetDocuments(courseId, userId, role);
  }

  @Post(":courseId/documents")
  @ApiOperation({ summary: "Add a downloadable document to this course" })
  createDocument(@Param("courseId", ParseUUIDPipe) courseId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profCreateDocument(courseId, dto, userId, role);
  }

  @Put(":courseId/documents/:documentId")
  @ApiOperation({ summary: "Rename or replace a document" })
  updateDocument(@Param("courseId", ParseUUIDPipe) courseId: string, @Param("documentId", ParseUUIDPipe) documentId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profUpdateDocument(courseId, documentId, dto, userId, role);
  }

  @Delete(":courseId/documents/:documentId")
  @ApiOperation({ summary: "Delete a document" })
  deleteDocument(@Param("courseId", ParseUUIDPipe) courseId: string, @Param("documentId", ParseUUIDPipe) documentId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profDeleteDocument(courseId, documentId, userId, role);
  }

  @Post(":courseId/modules")
  @ApiOperation({ summary: "Add a module to this course" })
  createModule(@Param("courseId", ParseUUIDPipe) courseId: string, @Body("title") title: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.createCourseModule(courseId, title, userId, role);
  }

  @Put("modules/:moduleId")
  @ApiOperation({ summary: "Update a module" })
  updateModule(@Param("moduleId", ParseUUIDPipe) moduleId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.updateCourseModule(moduleId, dto, userId, role);
  }

  @Delete("modules/:moduleId")
  @ApiOperation({ summary: "Delete a module" })
  deleteModule(@Param("moduleId", ParseUUIDPipe) moduleId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.deleteCourseModule(moduleId, userId, role);
  }

  @Post("modules/:moduleId/lessons")
  @ApiOperation({ summary: "Add a lesson to a module" })
  createLesson(@Param("moduleId", ParseUUIDPipe) moduleId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.createCourseLesson(moduleId, dto, userId, role);
  }

  @Put("lessons/:lessonId")
  @ApiOperation({ summary: "Update a lesson" })
  updateLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.updateCourseLesson(lessonId, dto, userId, role);
  }

  @Delete("lessons/:lessonId")
  @ApiOperation({ summary: "Delete a lesson" })
  deleteLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.deleteCourseLesson(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/blocks/preview")
  @ApiOperation({ summary: "Render a block list to HTML without saving" })
  previewLessonBlocks(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Body("blocks") blocks: any[], @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.previewCourseLessonBlocks(lessonId, blocks ?? [], userId, role);
  }

  @Put("lessons/:lessonId/blocks")
  @ApiOperation({ summary: "Save a lesson's block list" })
  saveLessonBlocks(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Body("blocks") blocks: any[], @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.saveCourseLessonBlocks(lessonId, blocks ?? [], userId, role);
  }

  @Get("lessons/:lessonId/questions")
  @ApiOperation({ summary: "List quiz questions for a lesson" })
  getQuestions(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profGetQuestions(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/questions")
  @ApiOperation({ summary: "Add a quiz question to a lesson" })
  createQuestion(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profCreateQuestion(lessonId, dto, userId, role);
  }

  @Put("lessons/:lessonId/questions/:questionId")
  @ApiOperation({ summary: "Update a quiz question" })
  updateQuestion(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Param("questionId", ParseUUIDPipe) questionId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profUpdateQuestion(lessonId, questionId, dto, userId, role);
  }

  @Delete("lessons/:lessonId/questions/:questionId")
  @ApiOperation({ summary: "Delete a quiz question" })
  deleteQuestion(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Param("questionId", ParseUUIDPipe) questionId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profDeleteQuestion(lessonId, questionId, userId, role);
  }

  @Get(":courseId/students")
  @ApiOperation({ summary: "Get enrolled students with progress" })
  getStudents(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.getCourseStudents(courseId, userId, role);
  }

  @Get(":courseId/submissions")
  @ApiOperation({ summary: "List assignment submissions for this course" })
  getSubmissions(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.getCourseSubmissions(courseId, userId, role);
  }

  @Put("submissions/:submissionId/grade")
  @ApiOperation({ summary: "Grade an assignment submission" })
  gradeSubmission(@Param("submissionId", ParseUUIDPipe) submissionId: string, @Body() dto: GradeSubmissionDto, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.gradeCourseSubmission(submissionId, dto, userId, role);
  }

  @Get(":courseId/submissions/export")
  @ApiOperation({ summary: "Export this course's gradebook as CSV" })
  async exportSubmissions(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role, @Res() res: Response) {
    const csv = await this.service.exportCourseSubmissions(courseId, userId, role);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csv);
  }

  @Get("lessons/:lessonId/submissions/:studentUserId/attempts")
  @ApiOperation({ summary: "Full attempt history for one student's assignment submissions" })
  getSubmissionAttempts(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Param("studentUserId", ParseUUIDPipe) studentUserId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.getSubmissionAttempts(lessonId, studentUserId, userId, role);
  }

  @Get("lessons/:lessonId/statistics")
  @ApiOperation({ summary: "Submission/grading statistics for one assignment lesson" })
  getAssignmentStatistics(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.getAssignmentStatistics(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/duplicate")
  @ApiOperation({ summary: "Duplicate a lesson" })
  duplicateLesson(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.duplicateLesson(lessonId, userId, role);
  }

  @Get("lessons/:lessonId/resources")
  @ApiOperation({ summary: "List a lesson's downloadable resources" })
  getLessonResources(@Param("lessonId", ParseUUIDPipe) lessonId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profGetLessonResources(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/resources")
  @ApiOperation({ summary: "Attach a downloadable resource to a lesson" })
  createLessonResource(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profCreateLessonResource(lessonId, dto, userId, role);
  }

  @Put("lessons/:lessonId/resources/:resourceId")
  @ApiOperation({ summary: "Rename or replace a lesson resource" })
  updateLessonResource(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Param("resourceId", ParseUUIDPipe) resourceId: string, @Body() dto: any, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profUpdateLessonResource(lessonId, resourceId, dto, userId, role);
  }

  @Delete("lessons/:lessonId/resources/:resourceId")
  @ApiOperation({ summary: "Delete a lesson resource" })
  deleteLessonResource(@Param("lessonId", ParseUUIDPipe) lessonId: string, @Param("resourceId", ParseUUIDPipe) resourceId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profDeleteLessonResource(lessonId, resourceId, userId, role);
  }

  @Get(":courseId/prerequisites")
  @ApiOperation({ summary: "Get prerequisite/co-requisite courses for this course" })
  getPrerequisites(@Param("courseId", ParseUUIDPipe) courseId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profGetPrerequisites(courseId, userId, role);
  }

  @Put(":courseId/prerequisites")
  @ApiOperation({ summary: "Replace prerequisite/co-requisite courses for this course" })
  setPrerequisites(@Param("courseId", ParseUUIDPipe) courseId: string, @Body("prerequisites") prerequisites: { course_id: string; type: "prerequisite" | "corequisite" }[], @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.profSetPrerequisites(courseId, prerequisites ?? [], userId, role);
  }

  // ─── Institution-specific additions (no professor-app equivalent) ─────────

  @Post(":courseId/instructors")
  @ApiOperation({ summary: "Add a co-instructor (must be an active professor at this course's institution)" })
  addInstructor(@Param("courseId", ParseUUIDPipe) courseId: string, @Body("user_id") instructorUserId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.institutionAddCourseInstructor(courseId, instructorUserId, userId, role);
  }

  @Delete(":courseId/instructors/:instructorUserId")
  @ApiOperation({ summary: "Remove a co-instructor from this course" })
  removeInstructor(@Param("courseId", ParseUUIDPipe) courseId: string, @Param("instructorUserId", ParseUUIDPipe) instructorUserId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.institutionRemoveCourseInstructor(courseId, instructorUserId, userId, role);
  }

  @Post(":courseId/enroll-cohort")
  @ApiOperation({ summary: "Bulk-enroll every member of a cohort into this (free, private) course" })
  enrollCohort(@Param("courseId", ParseUUIDPipe) courseId: string, @Body("cohort_id") cohortId: string, @CurrentUser("id") userId: string, @CurrentUser("role") role: Role) {
    return this.service.institutionEnrollCohort(courseId, cohortId, userId, role);
  }
}
