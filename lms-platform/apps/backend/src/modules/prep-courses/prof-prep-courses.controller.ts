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

  @Post(":courseId/publish-all")
  @ApiOperation({ summary: "Publish all modules and lessons in this course" })
  publishAll(
    @Param("courseId", ParseUUIDPipe) courseId: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("role") role: Role,
  ) {
    return this.service.profPublishAll(courseId, userId, role);
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
}
