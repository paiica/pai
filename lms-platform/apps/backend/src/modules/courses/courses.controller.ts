import {
  Controller, Get, Post, Param, Body,
  UseGuards, ParseUUIDPipe, Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CoursesService } from "./courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Courses")
@Controller("courses")
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List all active certifications (public)" })
  findAll() {
    return this.coursesService.findAll();
  }

  @Public()
  @Get("featured")
  @ApiOperation({ summary: "List featured certifications for homepage" })
  findFeatured() {
    return this.coursesService.findFeaturedCertifications();
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Get certification details by slug (public)" })
  findOne(@Param("slug") slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":certId/lessons/:lessonId")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get lesson content (requires enrollment)" })
  getLesson(
    @Param("certId") certId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
    @Query("enrollment_id") enrollmentId?: string,
  ) {
    return this.coursesService.findLesson(lessonId, userId, enrollmentId);
  }

}
