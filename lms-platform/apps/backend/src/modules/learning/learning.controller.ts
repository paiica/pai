import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { LearningService } from "./learning.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CompleteLessonDto } from "./dto/complete-lesson.dto";
import { SubmitQuizDto } from "./dto/submit-quiz.dto";
import { SubmitAssignmentDto } from "./dto/submit-assignment.dto";
import { UpdateProgressDto } from "./dto/update-progress.dto";

@ApiTags("Learning")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("learn")
export class LearningController {
  constructor(private learningService: LearningService) {}

  @Get("assignments")
  @ApiOperation({ summary: "Get all assignment lessons across my enrollments" })
  getMyAssignments(@CurrentUser("id") userId: string) {
    return this.learningService.getMyAssignments(userId);
  }

  @Get(":enrollmentId")
  @ApiOperation({ summary: "Get course outline with my progress" })
  getCourseOutline(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.learningService.getCourseOutline(enrollmentId, userId);
  }

  @Get(":enrollmentId/lesson/:lessonId")
  @ApiOperation({ summary: "Get lesson content" })
  getLessonContent(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.learningService.getLessonContent(enrollmentId, lessonId, userId);
  }

  @Patch(":enrollmentId/lesson/:lessonId/progress")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update video position / watch time (heartbeat)" })
  updateProgress(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.learningService.updateLessonProgress(enrollmentId, lessonId, userId, dto);
  }

  @Post(":enrollmentId/lesson/:lessonId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a lesson as completed" })
  completeLesson(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.learningService.completeLesson(enrollmentId, lessonId, userId, dto);
  }

  @Post(":enrollmentId/lesson/:lessonId/scorm-progress")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Report SCORM completion/score from the in-page bridge script" })
  updateScormProgress(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: { completed: boolean; score?: number; cmi_snapshot: any },
  ) {
    return this.learningService.updateScormProgress(enrollmentId, lessonId, userId, dto);
  }

  @Post(":enrollmentId/lesson/:lessonId/quiz/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit quiz answers — returns score and pass/fail" })
  submitQuiz(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.learningService.submitQuiz(enrollmentId, lessonId, userId, dto);
  }

  @Post(":enrollmentId/lesson/:lessonId/assignment/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit assignment (file URL or text)" })
  submitAssignment(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.learningService.submitAssignment(enrollmentId, lessonId, userId, dto);
  }

  @Get(":enrollmentId/grades")
  @ApiOperation({ summary: "Get my quiz and assignment grades for an enrollment" })
  getGrades(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.learningService.getMyGrades(enrollmentId, userId);
  }
}
