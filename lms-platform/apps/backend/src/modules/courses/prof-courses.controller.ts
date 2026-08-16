import {
  BadRequestException, Controller, Get, Post, Put, Delete, Body, Param, Res, UploadedFile, UseGuards, UseInterceptors, ParseUUIDPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CoursesService } from "./courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateModuleDto } from "./dto/create-module.dto";

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

  @Post("certifications/:certId/import")
  @ApiOperation({ summary: "Import an Articulate Rise 360 export (.zip) as new modules/lessons" })
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 150 * 1024 * 1024 } }))
  importRiseExport(
    @Param("certId", ParseUUIDPipe) certId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
    @Body("mode") mode?: "decompose" | "preserve" | "scorm",
  ) {
    if (!file) throw new BadRequestException("No file received");
    return this.coursesService.importRiseExport(certId, file.buffer, userId, role, mode);
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

  @Delete("certifications/:certId/modules")
  @ApiOperation({ summary: "Delete ALL modules (and their lessons) for a certification — irreversible, clears the whole build" })
  deleteAllModules(
    @Param("certId", ParseUUIDPipe) certId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.deleteAllModules(certId, userId, role);
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

  @Post("lessons/:lessonId/blocks/preview")
  @ApiOperation({ summary: "Render a block list to HTML without saving (block builder live preview)" })
  previewLessonBlocks(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("blocks") blocks: any[],
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.previewLessonBlocks(lessonId, blocks ?? [], userId, role);
  }

  @Put("lessons/:lessonId/blocks")
  @ApiOperation({ summary: "Save a lesson's block list (renders + persists blocks_json and content_body)" })
  saveLessonBlocks(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("blocks") blocks: any[],
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.saveLessonBlocks(lessonId, blocks ?? [], userId, role);
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

  // ─── Sublessons ──────────────────────────────────────────────────────
  // A secondary/contextual content layer attached to a Lesson — see
  // schema.prisma's Lesson model comment. Created, edited, and deleted
  // through the same generic lesson endpoints above (a Sublesson IS a
  // Lesson row); this section is only the sublesson-specific create and
  // reorder routes that don't fit the generic module-scoped ones.

  @Post("lessons/:lessonId/sublessons")
  @ApiOperation({ summary: "Add a sublesson under a lesson" })
  createSublesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body("title") title: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.createSublesson(lessonId, title, userId, role);
  }

  @Post("lessons/:lessonId/sublessons/reorder")
  @ApiOperation({ summary: "Reorder the sublessons under a lesson" })
  reorderSublessons(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: ReorderItemsDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.reorderSublessons(lessonId, dto, userId, role);
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

  @Get("certifications/:certId/submissions/export")
  @ApiOperation({ summary: "Export this certification's gradebook as CSV" })
  async exportSubmissions(
    @Param("certId", ParseUUIDPipe) certId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
    @Res() res: Response,
  ) {
    const csv = await this.coursesService.exportCertificationSubmissions(certId, userId, role);
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
    return this.coursesService.getSubmissionAttempts(lessonId, studentUserId, userId, role);
  }

  @Get("lessons/:lessonId/statistics")
  @ApiOperation({ summary: "Submission/grading statistics for one assignment lesson" })
  getAssignmentStatistics(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getAssignmentStatistics(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/duplicate")
  @ApiOperation({ summary: "Duplicate a lesson (settings + resources/questions, never submissions or progress)" })
  duplicateLesson(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.duplicateLesson(lessonId, userId, role);
  }

  @Get("lessons/:lessonId/resources")
  @ApiOperation({ summary: "List a lesson's downloadable resources" })
  getLessonResources(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.getLessonResources(lessonId, userId, role);
  }

  @Post("lessons/:lessonId/resources")
  @ApiOperation({ summary: "Attach a downloadable resource to a lesson" })
  createLessonResource(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Body() dto: { title: string; url: string; file_name?: string; file_type?: string },
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.createLessonResource(lessonId, dto, userId, role);
  }

  @Put("lessons/:lessonId/resources/:resourceId")
  @ApiOperation({ summary: "Rename or replace a lesson resource" })
  updateLessonResource(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("resourceId", ParseUUIDPipe) resourceId: string,
    @Body() dto: { title?: string; url?: string },
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.updateLessonResource(lessonId, resourceId, dto, userId, role);
  }

  @Delete("lessons/:lessonId/resources/:resourceId")
  @ApiOperation({ summary: "Delete a lesson resource" })
  deleteLessonResource(
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @Param("resourceId", ParseUUIDPipe) resourceId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.coursesService.deleteLessonResource(lessonId, resourceId, userId, role);
  }
}
