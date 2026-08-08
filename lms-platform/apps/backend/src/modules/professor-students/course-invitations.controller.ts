import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CourseInvitationsService } from "./course-invitations.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RejectInvitationDto } from "./dto/reject-invitation.dto";

@ApiTags("My Course Invitations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("me/course-invitations")
export class CourseInvitationsController {
  constructor(private service: CourseInvitationsService) {}

  @Get()
  @ApiOperation({ summary: "List course invitations sent to me" })
  listMine(@CurrentUser("id") studentId: string) {
    return this.service.listMine(studentId);
  }

  @Post(":id/accept")
  @ApiOperation({ summary: "Accept a course invitation" })
  accept(@Param("id") id: string, @CurrentUser("id") studentId: string) {
    return this.service.accept(id, studentId);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Decline a course invitation" })
  reject(@Param("id") id: string, @CurrentUser("id") studentId: string, @Body() dto: RejectInvitationDto) {
    return this.service.reject(id, studentId, dto.reason);
  }
}
