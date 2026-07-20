import {
  BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PrepCoursesService } from "./prep-courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { GradeSubmissionDto } from "../courses/dto/grade-submission.dto";

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

@ApiTags("Professor — Course Builder")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.professor, Role.admin, Role.super_admin)
@Controller("prof/courses")
export class ProfPrepCoursesController {
  constructor(private service: PrepCoursesService) {}

  @Get()
  @ApiOperation({ summary: "List courses assigned to me" })
  getMyCourses(
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profGetMyCourses(userId, role);
  }

  @Get(":courseId")
  @ApiOperation({ summary: "Get course with full module/lesson tree (builder view)" })
  getCourse(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profGetCourse(courseId, userId, role);
  }

  @Put(":courseId")
  @ApiOperation({ summary: "Update course details (title, subtitle, description, price, level, status, content, etc.)" })
  updateCourse(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profUpdateCourse(courseId, dto, userId, role);
  }

  @Get(":courseId/modules")
  @ApiOperation({ summary: "Get full module/lesson tree with rich per-lesson fields (builder view)" })
  getModules(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
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
  publishAll(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profPublishAll(courseId, userId, role);
  }

  @Get(":courseId/documents")
  @ApiOperation({ summary: "List downloadable documents (syllabus, outline, etc.) for this course" })
  getDocuments(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profGetDocuments(courseId, userId, role);
  }

  @Post(":courseId/documents")
  @ApiOperation({ summary: "Add a downloadable document to this course" })
  createDocument(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profCreateDocument(courseId, dto, userId, role);
  }

  @Put(":courseId/documents/:documentId")
  @ApiOperation({ summary: "Rename or replace a document" })
  updateDocument(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profUpdateDocument(courseId, documentId, dto, userId, role);
  }

  @Delete(":courseId/documents/:documentId")
  @ApiOperation({ summary: "Delete a document" })
  deleteDocument(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profDeleteDocument(courseId, documentId, userId, role);
  }

  @Post(":courseId/modules")
  @ApiOperation({ summary: "Add a module to this course" })
  createModule(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body("title") title: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.createCourseModule(courseId, title, userId, role);
  }

  @Put("modules/:moduleId")
  @ApiOperation({ summary: "Update a module" })
  updateModule(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.updateCourseModule(moduleId, dto, userId, role);
  }

  @Delete("modules/:moduleId")
  @ApiOperation({ summary: "Delete a module" })
  deleteModule(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.deleteCourseModule(moduleId, userId, role);
  }

  @Post("modules/:moduleId/lessons")
  @ApiOperation({ summary: "Add a lesson to a module" })
  createLesson(
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.createCourseLesson(moduleId, dto, userId, role);
  }

  @Put("lessons/:lessonId")
  @ApiOperation({ summary: "Update a lesson" })
  updateLesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.updateCourseLesson(lessonId, dto, userId, role);
  }

  @Delete("lessons/:lessonId")
  @ApiOperation({ summary: "Delete a lesson" })
  deleteLesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.deleteCourseLesson(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/blocks/preview")
  @ApiOperation({ summary: "Render a block list to HTML without saving (block builder live preview)" })
  previewLessonBlocks(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("blocks") blocks: any[],
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.previewCourseLessonBlocks(lessonId, blocks ?? [], userId, role);
  }

  @Put("lessons/:lessonId/blocks")
  @ApiOperation({ summary: "Save a lesson's block list (renders + persists blocks_json and content_body)" })
  saveLessonBlocks(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("blocks") blocks: any[],
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.saveCourseLessonBlocks(lessonId, blocks ?? [], userId, role);
  }

  @Get("lessons/:lessonId/questions")
  @ApiOperation({ summary: "List quiz questions for a lesson" })
  getQuestions(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profGetQuestions(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/questions")
  @ApiOperation({ summary: "Add a quiz question to a lesson" })
  createQuestion(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profCreateQuestion(lessonId, dto, userId, role);
  }

  @Put("lessons/:lessonId/questions/:questionId")
  @ApiOperation({ summary: "Update a quiz question" })
  updateQuestion(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @Body() dto: any,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profUpdateQuestion(lessonId, questionId, dto, userId, role);
  }

  @Delete("lessons/:lessonId/questions/:questionId")
  @ApiOperation({ summary: "Delete a quiz question" })
  deleteQuestion(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profDeleteQuestion(lessonId, questionId, userId, role);
  }

  @Get(":courseId/submissions")
  @ApiOperation({ summary: "List assignment submissions for this course" })
  getSubmissions(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.getCourseSubmissions(courseId, userId, role);
  }

  @Put("submissions/:submissionId/grade")
  @ApiOperation({ summary: "Grade an assignment submission" })
  gradeSubmission(
    @Param("submissionId", ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.gradeCourseSubmission(submissionId, dto, userId, role);
  }

  @Get(":courseId/prerequisites")
  @ApiOperation({ summary: "Get prerequisite/co-requisite courses for this course" })
  getPrerequisites(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profGetPrerequisites(courseId, userId, role);
  }

  @Put(":courseId/prerequisites")
  @ApiOperation({ summary: "Replace prerequisite/co-requisite courses for this course" })
  setPrerequisites(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @Body("prerequisites") prerequisites: { course_id: string; type: "prerequisite" | "corequisite" }[],
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profSetPrerequisites(courseId, prerequisites ?? [], userId, role);
  }
}
