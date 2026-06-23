import { Controller, Get, Post, Patch, Put, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { extname, join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Role } from "@prisma/client";
import { ExamsService } from "./exams.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

const RAM_STORAGE: any = {
  _handleFile(_req: any, file: any, cb: any) {
    const chunks: Buffer[] = [];
    file.stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    file.stream.on("end", () => cb(null, { buffer: Buffer.concat(chunks) }));
    file.stream.on("error", (err: Error) => cb(err));
  },
  _removeFile(_req: any, _file: any, cb: any) { cb(null); },
};

@ApiTags("Exams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("exams")
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Post("enrollments/:enrollmentId/start")
  @ApiOperation({ summary: "Start exam for an enrollment" })
  start(
    @CurrentUser("id") userId: string,
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.examsService.startExam(userId, enrollmentId);
  }

  @Post("attempts/:attemptId/submit")
  @ApiOperation({ summary: "Submit exam answers" })
  submit(
    @CurrentUser("id") userId: string,
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
    @Body("answers") answers: Record<string, number>,
  ) {
    return this.examsService.submitExam(userId, attemptId, answers);
  }

  @Get("enrollments/:enrollmentId/attempts")
  @ApiOperation({ summary: "Get exam attempt history for enrollment" })
  getAttempts(
    @CurrentUser("id") userId: string,
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.examsService.getMyAttempts(userId, enrollmentId);
  }

  @Get("attempts/:attemptId")
  @ApiOperation({ summary: "Get a specific exam attempt (questions + state)" })
  getAttempt(
    @CurrentUser("id") userId: string,
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
  ) {
    return this.examsService.getAttempt(userId, attemptId);
  }

  // ── Student: Proctoring ────────────────────────────────────────────────────

  @Post("attempts/:attemptId/proctor-events")
  @ApiOperation({ summary: "Log a proctoring violation event" })
  logProctorEvent(
    @CurrentUser("id") userId: string,
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
    @Body() dto: { event_type: string; severity?: string; detail?: any },
  ) {
    return this.examsService.logProctorEvent(userId, attemptId, dto);
  }

  @Post("attempts/:attemptId/snapshots")
  @ApiOperation({ summary: "Log a webcam snapshot" })
  logSnapshot(
    @CurrentUser("id") userId: string,
    @Param("attemptId", ParseUUIDPipe) attemptId: string,
    @Body() dto: { snapshot_url: string; face_detected?: boolean },
  ) {
    return this.examsService.logSnapshot(userId, attemptId, dto.snapshot_url, dto.face_detected ?? null);
  }

  // ── Admin: Exam Versions ───────────────────────────────────────────────────

  @Get("admin/exams")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list exam versions for a certification" })
  adminListExams(@Query("certification_id") certificationId: string) {
    return this.examsService.adminListExams(certificationId);
  }

  @Post("admin/exams")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create a new exam version" })
  adminCreateExam(@Body() dto: { certification_id: string; title: string; version?: string; description?: string }) {
    return this.examsService.adminCreateExam(dto.certification_id, dto);
  }

  @Patch("admin/exams/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update exam version" })
  adminUpdateExam(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.examsService.adminUpdateExam(id, dto);
  }

  @Delete("admin/exams/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete exam version (and its questions)" })
  adminDeleteExam(@Param("id", ParseUUIDPipe) id: string) {
    return this.examsService.adminDeleteExam(id);
  }

  // ── Admin: Exam Bank ───────────────────────────────────────────────────────

  @Get("admin/exam-bank")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list exam bank questions for a certification (optionally filtered by exam)" })
  adminListExamBank(
    @Query("certification_id") certificationId: string,
    @Query("exam_id") examId?: string,
  ) {
    return this.examsService.adminListExamBank(certificationId, examId);
  }

  @Post("admin/exam-bank")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create exam bank question" })
  adminCreateQuestion(@Body() dto: any) {
    return this.examsService.adminCreateExamBankQuestion(dto);
  }

  @Patch("admin/exam-bank/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update exam bank question" })
  adminUpdateQuestion(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.examsService.adminUpdateExamBankQuestion(id, dto);
  }

  @Delete("admin/exam-bank/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete exam bank question" })
  adminDeleteQuestion(@Param("id", ParseUUIDPipe) id: string) {
    return this.examsService.adminDeleteExamBankQuestion(id);
  }

  // ── Admin: Structured Exams ───────────────────────────────────────────────

  @Get("admin/structured-exams")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list structured exams for a certification" })
  adminListStructuredExams(@Query("certification_id") certificationId: string) {
    return this.examsService.adminListStructuredExams(certificationId);
  }

  @Post("admin/structured-exams")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create structured exam" })
  adminCreateStructuredExam(@CurrentUser("id") adminId: string, @Body() dto: any) {
    return this.examsService.adminCreateStructuredExam(adminId, dto);
  }

  @Get("admin/structured-exams/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: get structured exam with all sections/questions" })
  adminGetStructuredExam(@Param("id", ParseUUIDPipe) id: string) {
    return this.examsService.adminGetStructuredExam(id);
  }

  @Patch("admin/structured-exams/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update structured exam metadata" })
  adminUpdateStructuredExam(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.examsService.adminUpdateStructuredExam(id, dto);
  }

  @Delete("admin/structured-exams/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete structured exam" })
  adminDeleteStructuredExam(@Param("id", ParseUUIDPipe) id: string) {
    return this.examsService.adminDeleteStructuredExam(id);
  }

  // ── Admin: Sections ───────────────────────────────────────────────────────

  @Post("admin/structured-exams/:examId/sections")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: add section to structured exam" })
  adminCreateSection(@Param("examId", ParseUUIDPipe) examId: string, @Body() dto: any) {
    return this.examsService.adminCreateSection(examId, dto);
  }

  @Patch("admin/sections/:sectionId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update section" })
  adminUpdateSection(@Param("sectionId", ParseUUIDPipe) sectionId: string, @Body() dto: any) {
    return this.examsService.adminUpdateSection(sectionId, dto);
  }

  @Delete("admin/sections/:sectionId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete section" })
  adminDeleteSection(@Param("sectionId", ParseUUIDPipe) sectionId: string) {
    return this.examsService.adminDeleteSection(sectionId);
  }

  // ── Admin: Instruction Pages ──────────────────────────────────────────────

  @Post("admin/sections/:sectionId/instruction-pages")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: add instruction page to section" })
  adminCreateInstructionPage(@Param("sectionId", ParseUUIDPipe) sectionId: string, @Body() dto: any) {
    return this.examsService.adminCreateInstructionPage(sectionId, dto);
  }

  @Patch("admin/instruction-pages/:pageId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update instruction page" })
  adminUpdateInstructionPage(@Param("pageId", ParseUUIDPipe) pageId: string, @Body() dto: any) {
    return this.examsService.adminUpdateInstructionPage(pageId, dto);
  }

  @Delete("admin/instruction-pages/:pageId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete instruction page" })
  adminDeleteInstructionPage(@Param("pageId", ParseUUIDPipe) pageId: string) {
    return this.examsService.adminDeleteInstructionPage(pageId);
  }

  // ── Admin: Questions ──────────────────────────────────────────────────────

  @Post("admin/sections/:sectionId/questions")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: add question to section" })
  adminCreateSectionQuestion(@Param("sectionId", ParseUUIDPipe) sectionId: string, @Body() dto: any) {
    return this.examsService.adminCreateQuestion(sectionId, dto);
  }

  @Patch("admin/questions/:questionId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update question" })
  adminUpdateSectionQuestion(@Param("questionId", ParseUUIDPipe) questionId: string, @Body() dto: any) {
    return this.examsService.adminUpdateQuestion(questionId, dto);
  }

  @Delete("admin/questions/:questionId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete question" })
  adminDeleteSectionQuestion(@Param("questionId", ParseUUIDPipe) questionId: string) {
    return this.examsService.adminDeleteQuestion(questionId);
  }

  @Put("admin/questions/:questionId/options")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: replace all options for a question" })
  adminReplaceOptions(@Param("questionId", ParseUUIDPipe) questionId: string, @Body("options") options: any[]) {
    return this.examsService.adminReplaceOptions(questionId, options);
  }

  @Get("admin/attempts")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list all exam attempts" })
  adminGetAllAttempts() {
    return this.examsService.adminGetAllAttempts();
  }

  @Get("admin/attempts/:attemptId/proctor-events")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: get proctor events for an attempt" })
  adminGetProctorEvents(@Param("attemptId", ParseUUIDPipe) attemptId: string) {
    return this.examsService.adminGetProctorEvents(attemptId);
  }

  @Get("admin/attempts/:attemptId/snapshots")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: get webcam snapshots for an attempt" })
  adminGetSnapshots(@Param("attemptId", ParseUUIDPipe) attemptId: string) {
    return this.examsService.adminGetSnapshots(attemptId);
  }

  // ── Admin: Image Upload ───────────────────────────────────────────────────

  @Post("admin/upload/exam-image")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @UseInterceptors(FileInterceptor("file", { storage: RAM_STORAGE, limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiOperation({ summary: "Admin: upload exam question image" })
  adminUploadExamImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file received");
    if (!/\.(jpg|jpeg|png|svg|gif|webp)$/i.test(file.originalname)) {
      throw new BadRequestException("Only PNG, JPG, SVG, GIF, or WEBP files are allowed");
    }
    const dir = join(process.cwd(), "uploads", "exam-images");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
    writeFileSync(join(dir, filename), file.buffer);
    const baseUrl = process.env.API_URL || "http://localhost:4000";
    return { url: `${baseUrl}/uploads/exam-images/${filename}` };
  }

  // ── Admin: Question Images ─────────────────────────────────────────────────

  @Post("admin/questions/:questionId/images")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: add image to question" })
  adminAddQuestionImage(
    @Param("questionId", ParseUUIDPipe) questionId: string,
    @Body() dto: { url: string; alt_text?: string },
  ) {
    return this.examsService.adminAddQuestionImage(questionId, dto);
  }

  @Delete("admin/questions/:questionId/images/:imageId")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete question image" })
  adminDeleteQuestionImage(@Param("imageId", ParseUUIDPipe) imageId: string) {
    return this.examsService.adminDeleteQuestionImage(imageId);
  }
}
