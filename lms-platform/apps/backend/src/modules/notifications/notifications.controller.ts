import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get my notifications" })
  getMyNotifications(@CurrentUser("id") userId: string, @Query("unread") unread?: string) {
    return this.notificationsService.getMyNotifications(userId, unread === "true");
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notifications count" })
  getUnreadCount(@CurrentUser("id") userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  markRead(@CurrentUser("id") userId: string, @Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  markAllRead(@CurrentUser("id") userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
