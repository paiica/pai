import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrepCoursesService } from "./prep-courses.service";

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

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Get prep course by slug" })
  findOne(@Param("slug") slug: string) {
    return this.service.findBySlug(slug);
  }
}
