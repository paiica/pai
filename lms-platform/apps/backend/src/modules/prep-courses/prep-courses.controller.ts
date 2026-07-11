import { Controller, Get, Post, Patch, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrepCoursesService } from "./prep-courses.service";
import { SubmitAssignmentDto } from "../learning/dto/submit-assignment.dto";
import { CompleteLessonDto } from "../learning/dto/complete-lesson.dto";
import { UpdateProgressDto } from "../learning/dto/update-progress.dto";

@ApiTags("Prep Courses — Public")
@Controller("prep-courses")
export class PrepCoursesController {
  constructor(private service: PrepCoursesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List all active prep courses" })
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get("featured")
  @ApiOperation({ summary: "List featured prep courses for homepage" })
  findFeatured() {
    return this.service.findFeatured();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my/enrollments")
  @ApiOperation({ summary: "Get my prep course enrollments" })
  async getMyEnrollments(@CurrentUser("id") userId: string) {
    return this.service.getMyEnrollments(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my/assignments")
  @ApiOperation({ summary: "Get all assignment lessons across my course enrollments" })
  async getMyAssignments(@CurrentUser("id") userId: string) {
    return this.service.getMyCourseAssignments(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("learn/:enrollmentId")
  @ApiOperation({ summary: "Get course learn view (modules + lessons) for enrolled student" })
  getCourseLearnView(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.getCourseLearnView(enrollmentId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("learn/:enrollmentId/lesson/:lessonId")
  @ApiOperation({ summary: "Get lesson content for enrolled student" })
  getCourseLessonContent(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.getCourseLessonContent(enrollmentId, lessonId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch("learn/:enrollmentId/lesson/:lessonId/progress")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update video position / watch time (heartbeat)" })
  updateCourseLessonProgress(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.service.updateCourseLessonProgress(enrollmentId, lessonId, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("learn/:enrollmentId/lesson/:lessonId/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Mark a prep-course lesson as completed" })
  completeCourseLesson(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.service.completeCourseLesson(enrollmentId, lessonId, userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("learn/:enrollmentId/lesson/:lessonId/assignment/submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit an assignment (file URL or text)" })
  submitAssignment(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.service.submitCourseAssignment(enrollmentId, lessonId, userId, dto);
  }

  @Public()
  @Get("recommended-by-cert/:certificationId")
  @ApiOperation({ summary: "Get courses recommended for a certification" })
  getRecommendedByCert(@Param("certificationId") certificationId: string) {
    return this.service.getRecommendedCoursesByCert(certificationId);
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Get prep course by slug" })
  findOne(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }
}
