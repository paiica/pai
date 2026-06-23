import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ExamSessionsService } from "./exam-sessions.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Exam Sessions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("exam-sessions")
export class ExamSessionsController {
  constructor(private service: ExamSessionsService) {}

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Post("admin")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: create exam session" })
  adminCreate(@CurrentUser("id") adminId: string, @Body() dto: any) {
    return this.service.adminCreate(adminId, dto);
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: list all exam sessions" })
  adminList(@Query("certification_id") certificationId?: string) {
    return this.service.adminList(certificationId);
  }

  @Get("admin/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: get single exam session" })
  adminGetById(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetById(id);
  }

  @Patch("admin/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: update exam session" })
  adminUpdate(@Param("id", ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.service.adminUpdate(id, dto);
  }

  @Delete("admin/:id")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: delete exam session" })
  adminDelete(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminDelete(id);
  }

  @Get("admin/:id/bookings")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: get bookings for a session (with attempt status)" })
  adminGetBookings(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.adminGetBookingsWithStatus(id);
  }

  @Post("admin/:id/students")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: manually add a student to a session by email" })
  adminAddStudent(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("email") email: string,
  ) {
    return this.service.adminAddStudent(id, email);
  }

  @Patch("admin/bookings/:bookingId/cancel")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: cancel a student exam booking (bypasses 24h rule)" })
  adminCancelBooking(@Param("bookingId", ParseUUIDPipe) bookingId: string) {
    return this.service.adminCancelBooking(bookingId);
  }

  @Post("admin/bookings/:bookingId/exam-link")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: generate a unique student exam link for a booking" })
  generateExamLink(@Param("bookingId", ParseUUIDPipe) bookingId: string) {
    return this.service.generateStudentExamLink(bookingId);
  }

  @Post("admin/:id/preview-link")
  @UseGuards(RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Admin: generate a preview link to experience the exam as a student" })
  adminPreviewLink(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.service.adminPreviewLink(id, adminId);
  }

  // ── Student ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "Student: list available sessions for a certification" })
  listForStudent(
    @Query("certification_id") certificationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.listForStudent(certificationId, userId);
  }

  @Post(":id/book")
  @ApiOperation({ summary: "Student: book an exam session" })
  book(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.book(id, userId);
  }

  @Delete(":id/book")
  @ApiOperation({ summary: "Student: cancel exam booking" })
  cancelBooking(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.cancelBooking(id, userId);
  }

  @Get("my-booking")
  @ApiOperation({ summary: "Student: get my booking for a certification" })
  getMyBooking(
    @Query("certification_id") certificationId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.getMyBooking(certificationId, userId);
  }

  @Post("bookings/:bookingId/start")
  @ApiOperation({ summary: "Student: start exam from booking (T-3min unlock)" })
  startExam(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.startExamFromBooking(bookingId, userId);
  }

  @Post("bookings/:bookingId/link")
  @ApiOperation({ summary: "Student: get paiiexams entry URL (T-3min gated)" })
  getStudentExamLink(
    @Param("bookingId", ParseUUIDPipe) bookingId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.service.getStudentExamLink(bookingId, userId);
  }
}
