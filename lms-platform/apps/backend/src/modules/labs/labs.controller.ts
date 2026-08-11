import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LabsService } from "./labs.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ExecuteCellDto } from "./dto/execute-cell.dto";

@ApiTags("Labs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("labs")
export class LabsController {
  constructor(private labsService: LabsService) {}

  @Post("enrollment/:enrollmentId/lesson/:lessonId/session")
  @ApiOperation({ summary: "Start (or resume) an in-browser lab sandbox for a lesson" })
  startSession(
    @Param("enrollmentId", ParseUUIDPipe) enrollmentId: string,
    @Param("lessonId", ParseUUIDPipe) lessonId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.labsService.startSession(enrollmentId, lessonId, userId);
  }

  @Post("sessions/:sessionId/execute")
  @ApiOperation({ summary: "Run one code cell in an active lab sandbox" })
  executeCell(
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: ExecuteCellDto,
  ) {
    return this.labsService.executeCell(sessionId, userId, dto.code);
  }

  @Delete("sessions/:sessionId")
  @ApiOperation({ summary: "Stop an active lab sandbox" })
  stopSession(@Param("sessionId", ParseUUIDPipe) sessionId: string, @CurrentUser("id") userId: string) {
    return this.labsService.stopSession(sessionId, userId);
  }
}
