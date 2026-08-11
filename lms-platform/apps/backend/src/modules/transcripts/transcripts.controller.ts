import { Controller, Get, Post, Patch, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { TranscriptsService } from "./transcripts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Transcripts")
@Controller()
export class TranscriptsController {
  constructor(private service: TranscriptsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("programs/:id/transcript")
  @ApiOperation({ summary: "My live-computed transcript for a program I'm enrolled in (created on first request)" })
  getMyTranscript(@Param("id") programId: string, @CurrentUser("id") userId: string) {
    return this.service.getMyTranscriptPayload(userId, programId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("transcripts/:id/shares")
  @ApiOperation({ summary: "List my share links for a transcript" })
  listShares(@Param("id") transcriptId: string, @CurrentUser("id") userId: string) {
    return this.service.listShares(transcriptId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("transcripts/:id/shares")
  @ApiOperation({ summary: "Create a new secure share link for a transcript" })
  createShare(@Param("id") transcriptId: string, @CurrentUser("id") userId: string) {
    return this.service.createShare(transcriptId, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch("transcripts/shares/:shareId/revoke")
  @ApiOperation({ summary: "Revoke one of my transcript share links" })
  revokeShare(@Param("shareId") shareId: string, @CurrentUser("id") userId: string) {
    return this.service.revokeShare(shareId, userId);
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get("transcripts/share/:token")
  @ApiOperation({ summary: "Public — view a transcript via a secure share link (also serves as its verification page)" })
  getByShareToken(@Param("token") token: string) {
    return this.service.getBySharedToken(token);
  }
}
