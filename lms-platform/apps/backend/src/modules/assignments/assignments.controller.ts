import {
  Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AssignmentsService } from "./assignments.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Assignments — Student")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("assignments")
export class AssignmentsController {
  constructor(private service: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: "Get all published assignments for my active enrollments" })
  getMyAssignments(@CurrentUser("id") userId: string) {
    return this.service.getMyAssignments(userId);
  }

  @Get(":id/entry")
  @ApiOperation({ summary: "Get my submission for a specific assignment" })
  getMyEntry(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.getMyEntry(userId, id);
  }

  @Post(":id/submit")
  @ApiOperation({ summary: "Submit or update my entry for an assignment" })
  submit(
    @CurrentUser("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: { text_content?: string; file_url?: string; file_name?: string },
  ) {
    return this.service.submitEntry(userId, id, dto);
  }
}
