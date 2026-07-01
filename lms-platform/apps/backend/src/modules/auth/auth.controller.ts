import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("register")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Register a new student account" })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, req.ip);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Login and receive JWT token pair" })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip, req.headers["user-agent"]);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Exchange refresh token for new token pair (rotation)" })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshTokens(dto.refresh_token, req.ip, req.headers["user-agent"]);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout (revoke refresh token)" })
  async logout(
    @CurrentUser("id") userId: string,
    @Body() dto: RefreshTokenDto,
  ) {
    return this.authService.logout(userId, dto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout-all")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout from all devices" })
  async logoutAll(@CurrentUser("id") userId: string) {
    return this.authService.logout(userId);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: "Request password reset email" })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Reset password using token from email" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.new_password);
  }

  @Public()
  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email address" })
  async verifyEmail(@Body("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: "Resend email verification link" })
  async resendVerification(@Body("email") email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  async getMe(@CurrentUser("id") userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("exam-token")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate a short-lived exam SSO token (5 min)" })
  async generateExamToken(@CurrentUser("id") userId: string) {
    return this.authService.generateExamToken(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("structured-exam-preview-link")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate a 4-hour admin preview link for a structured exam (no session needed)" })
  async generateStructuredExamPreviewLink(@Body("exam_id") examId: string) {
    return this.authService.generateStructuredExamPreviewLink(examId);
  }

  @Public()
  @Post("exchange-exam-token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange exam SSO token for a user JWT pair (paiiexams)" })
  async exchangeExamToken(@Body("exam_token") examToken: string) {
    return this.authService.exchangeExamToken(examToken);
  }

  @Public()
  @Post("verify-exam-link")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify unique student exam link, start/resume attempt (paiiexams /join)" })
  async verifyExamLink(@Body("link_token") linkToken: string) {
    return this.authService.verifyExamLink(linkToken);
  }

  @Public()
  @Post("verify-preview-link")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify admin exam preview link, returns questions without creating an attempt" })
  async verifyPreviewLink(@Body("preview_token") previewToken: string) {
    return this.authService.verifyPreviewLink(previewToken);
  }

  @Public()
  @Post("save-student-photo")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save student camera photo taken during exam setup" })
  async saveStudentPhoto(
    @Body("preview_token") previewToken: string,
    @Body("image") image: string,
  ) {
    return this.authService.saveStudentPhoto(previewToken, image);
  }
}
