import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AffiliateService } from "./affiliate.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Affiliate Portal")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("affiliate")
export class AffiliateController {
  constructor(private service: AffiliateService) {}

  @Get("dashboard/stats")
  dashboardStats(@CurrentUser("id") userId: string) {
    return this.service.getDashboardStats(userId);
  }

  @Get("dashboard/charts")
  dashboardCharts(@CurrentUser("id") userId: string) {
    return this.service.getDashboardCharts(userId);
  }

  @Get("products")
  products(@CurrentUser("id") userId: string) {
    return this.service.getMyProducts(userId);
  }

  @Get("promo-codes")
  promoCodes(@CurrentUser("id") userId: string) {
    return this.service.getMyPromoCodes(userId);
  }

  @Get("leads")
  leads(
    @CurrentUser("id") userId: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.service.getMyLeads(userId, {
      page: parseInt(page), limit: parseInt(limit), status, search,
    });
  }

  @Get("commissions/summary")
  commissionSummary(@CurrentUser("id") userId: string) {
    return this.service.getMyCommissionSummary(userId);
  }

  @Get("commissions")
  commissions(
    @CurrentUser("id") userId: string,
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("status") status?: string,
  ) {
    return this.service.getMyCommissions(userId, {
      page: parseInt(page), limit: parseInt(limit), status,
    });
  }

  @Get("analytics")
  analytics(
    @CurrentUser("id") userId: string,
    @Query("range") range = "30d",
  ) {
    return this.service.getAnalytics(userId, range);
  }

  @Get("notifications")
  notifications(@CurrentUser("id") userId: string) {
    return this.service.getMyNotifications(userId);
  }

  @Patch("notifications/:id/read")
  markRead(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.service.markNotificationRead(userId, id);
  }

  @Post("notifications/read-all")
  markAllRead(@CurrentUser("id") userId: string) {
    return this.service.markAllNotificationsRead(userId);
  }

  @Get("invites/stats")
  inviteStats(@CurrentUser("id") userId: string) {
    return this.service.getMyInviteStats(userId);
  }

  @Get("invites")
  invites(@CurrentUser("id") userId: string) {
    return this.service.getMyInvites(userId);
  }

  @Post("invites")
  sendInvite(
    @CurrentUser("id") userId: string,
    @Body() dto: { email: string; name?: string },
  ) {
    return this.service.sendInvite(userId, dto.email, dto.name);
  }

  @Post("invites/:id/resend")
  resendInvite(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) inviteId: string,
  ) {
    return this.service.resendInvite(userId, inviteId);
  }

  @Delete("invites/:id")
  deleteInvite(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) inviteId: string,
  ) {
    return this.service.deleteInvite(userId, inviteId);
  }

  @Get("profile")
  profile(@CurrentUser("id") userId: string) {
    return this.service.getMyProfile(userId);
  }

  @Patch("profile")
  updateProfile(@CurrentUser("id") userId: string, @Body() dto: any) {
    return this.service.updateMyProfile(userId, dto);
  }

  @Patch("profile/payout")
  updatePayout(@CurrentUser("id") userId: string, @Body() dto: any) {
    return this.service.updateMyPayout(userId, dto);
  }

  @Post("profile/change-password")
  changePassword(
    @CurrentUser("id") userId: string,
    @Body() dto: { current_password: string; new_password: string },
  ) {
    return this.service.changePassword(userId, dto.current_password, dto.new_password);
  }
}
