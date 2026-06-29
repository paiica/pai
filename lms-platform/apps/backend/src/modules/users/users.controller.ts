import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me/profile")
  @ApiOperation({ summary: "Get own profile" })
  getMyProfile(@CurrentUser("id") userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch("me/profile")
  @ApiOperation({ summary: "Update own profile" })
  updateMyProfile(@CurrentUser("id") userId: string, @Body() dto: any) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post("me/email-change")
  @ApiOperation({ summary: "Request email address change (sends verification email)" })
  requestEmailChange(@CurrentUser("id") userId: string, @Body("new_email") newEmail: string) {
    return this.usersService.requestEmailChange(userId, newEmail);
  }

  @Get("email-change/verify")
  @Public()
  @ApiOperation({ summary: "Verify email change token (public)" })
  async verifyEmailChange(@Query("token") token: string, @Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    try {
      await this.usersService.verifyEmailChange(token);
      return res.redirect(`${frontendUrl}/profile?emailChanged=true`);
    } catch (err: any) {
      return res.redirect(`${frontendUrl}/profile?emailError=${encodeURIComponent(err.message)}`);
    }
  }

  @Patch("me/password")
  @ApiOperation({ summary: "Change own password" })
  changePassword(
    @CurrentUser("id") userId: string,
    @Body("current_password") currentPassword: string,
    @Body("new_password") newPassword: string,
  ) {
    return this.usersService.changePassword(userId, currentPassword, newPassword);
  }

  @Get()
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "List all users (admin)" })
  findAll(
    @Query("page") page = 1,
    @Query("limit") limit = 25,
    @Query("q") q?: string,
    @Query("role") role?: string,
    @Query("status") status?: string,
  ) {
    return this.usersService.findAll({ page: +page, limit: +limit, q, role, status });
  }

  @Get("export")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Export all users as CSV (admin)" })
  async exportCsv(
    @Query("q") q: string | undefined,
    @Query("role") role: string | undefined,
    @Query("status") status: string | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.usersService.exportCsv({ q, role, status });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="users-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  }

  // ── Admin invitation (static route — must be before /:id) ────────────────────

  @Post("invite-admin")
  @Roles(Role.super_admin)
  @ApiOperation({ summary: "Invite a new admin user with tab permissions (super_admin)" })
  inviteAdmin(@Body() dto: { email: string; first_name: string; last_name: string; tabs: string[] }) {
    return this.usersService.inviteAdmin(dto);
  }

  // ── Bulk endpoints (must be before /:id to avoid NestJS route conflicts) ──────

  @Patch("bulk/activate")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Bulk activate users (admin)" })
  bulkActivate(@Body("ids") ids: string[]) {
    return this.usersService.bulkSetActive(ids, true);
  }

  @Patch("bulk/deactivate")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Bulk deactivate users (admin)" })
  bulkDeactivate(@Body("ids") ids: string[]) {
    return this.usersService.bulkSetActive(ids, false);
  }

  @Patch("bulk/role")
  @Roles(Role.super_admin)
  @ApiOperation({ summary: "Bulk change role (super_admin)" })
  bulkRole(@Body("ids") ids: string[], @Body("role") role: Role) {
    return this.usersService.bulkChangeRole(ids, role);
  }

  @Post("bulk/require-password-reset")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Bulk send password reset emails (admin)" })
  bulkRequirePasswordReset(@Body("ids") ids: string[]) {
    return this.usersService.bulkRequirePasswordReset(ids);
  }

  @Delete("bulk")
  @Roles(Role.super_admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Bulk delete users (super_admin)" })
  bulkDelete(@Body("ids") ids: string[]) {
    return this.usersService.bulkDelete(ids);
  }

  // ── Single-user endpoints ────────────────────────────────────────────────────

  @Get(":id")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get user by ID (admin)" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch(":id/role")
  @Roles(Role.super_admin)
  @ApiOperation({ summary: "Change user role (super_admin)" })
  changeRole(@Param("id", ParseUUIDPipe) id: string, @Body("role") role: Role) {
    return this.usersService.changeRole(id, role);
  }

  @Patch(":id/deactivate")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Deactivate a user account (admin)" })
  deactivate(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, false);
  }

  @Patch(":id/activate")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Activate a user account (admin)" })
  activate(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, true);
  }

  @Post(":id/require-password-reset")
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Send password reset email to user (admin)" })
  requirePasswordReset(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.requirePasswordReset(id);
  }

  @Delete(":id")
  @Roles(Role.super_admin)
  @ApiOperation({ summary: "Hard delete a user (super_admin only)" })
  deleteUser(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.deleteUser(id);
  }

  // ── Admin Permissions ────────────────────────────────────────────────────────

  @Get(":id/admin-permissions")
  @Roles(Role.super_admin)
  @ApiOperation({ summary: "Get admin tab permissions for a user (super_admin)" })
  getAdminPermissions(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.getAdminPermissions(id);
  }

  @Put(":id/admin-permissions")
  @Roles(Role.super_admin)
  @ApiOperation({ summary: "Set admin tab permissions for a user (super_admin)" })
  setAdminPermissions(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("tabs") tabs: string[],
  ) {
    return this.usersService.setAdminPermissions(id, tabs);
  }
}
