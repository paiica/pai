import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PrepCoursesService } from "./prep-courses.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

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
}
