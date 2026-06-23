import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
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
  findAll(@Query("page") page = 1, @Query("limit") limit = 20, @Query("q") q?: string) {
    return this.usersService.findAll({ page: +page, limit: +limit, q });
  }

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
}
