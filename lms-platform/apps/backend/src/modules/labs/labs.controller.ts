import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LabsService } from "./labs.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ExecuteCellDto } from "./dto/execute-cell.dto";
import { SaveCodeDto } from "./dto/save-code.dto";
import { CheckExerciseDto } from "./dto/check-exercise.dto";

@ApiTags("Labs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("labs")
export class LabsController {
  constructor(private labsService: LabsService) {}

  @Get("my")
  @ApiOperation({ summary: "Every lab across the student's enrolled courses, with progress — powers the Labs hub" })
  getMyLabs(@CurrentUser("id") userId: string) {
    return this.labsService.getMyLabs(userId);
  }

  @Post("playground/session")
  @ApiOperation({ summary: "Start (or resume) a standalone sandbox not tied to any course/lesson" })
  startPlaygroundSession(@CurrentUser("id") userId: string) {
    return this.labsService.startPlaygroundSession(userId);
  }

  @Get("playground/sandbox-access")
  @ApiOperation({ summary: "Whether the student has an active paid Playground cloud-sandbox subscription" })
  getSandboxAccess(@CurrentUser("id") userId: string) {
    return this.labsService.getSandboxAccess(userId);
  }

  @Post("enrollment/:enrollmentId/lesson/:lessonId/session")
  @ApiOperation({ summary: "Start (or resume) an in-browser lab sandbox for a lesson" })
  startSession(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.labsService.startSession(enrollmentId, lessonId, userId);
  }

  @Post("sessions/:sessionId/execute")
  @ApiOperation({ summary: "Run one code cell in an active lab sandbox" })
  executeCell(
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: ExecuteCellDto,
  ) {
    return this.labsService.executeCell(sessionId, userId, dto.code);
  }

  @Delete("sessions/:sessionId")
  @ApiOperation({ summary: "Stop an active lab sandbox" })
  stopSession(@Param("sessionId", ParseUUIDPipe) sessionId: string, @CurrentUser("id") userId: string) {
    return this.labsService.stopSession(sessionId, userId);
  }

  @Get("enrollment/:enrollmentId/lesson/:lessonId/progress")
  @ApiOperation({ summary: "Get this student's saved code and exercise pass/fail state for a lab (either runtime)" })
  getProgress(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.labsService.getProgress(enrollmentId, lessonId, userId);
  }

  @Post("enrollment/:enrollmentId/lesson/:lessonId/save")
  @ApiOperation({ summary: "Autosave a cell's current code" })
  saveCode(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SaveCodeDto,
  ) {
    return this.labsService.saveCode(enrollmentId, lessonId, userId, dto.cell_index, dto.code);
  }

  @Post("enrollment/:enrollmentId/lesson/:lessonId/check")
  @ApiOperation({ summary: "Grade an exercise cell against its hidden tests — runs server-side regardless of runtime" })
  checkExercise(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CheckExerciseDto,
  ) {
    return this.labsService.checkExercise(enrollmentId, lessonId, userId, dto.cell_index, dto.code);
  }

  @Post("enrollment/:enrollmentId/lesson/:lessonId/hint")
  @ApiOperation({ summary: "Ask the AI for a nudge on a stuck exercise — never the full solution" })
  getHint(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CheckExerciseDto,
  ) {
    return this.labsService.getHint(enrollmentId, lessonId, userId, dto.cell_index, dto.code);
  }
}
