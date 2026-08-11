import { Controller, Get, Patch, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { TranscriptsService } from "./transcripts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Admin — Transcripts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.super_admin)
@Controller("admin/transcripts")
export class AdminTranscriptsController {
  constructor(private service: TranscriptsService) {}

  @Get()
  @ApiOperation({ summary: "Search/list all issued transcripts" })
  list(@Query("search") search?: string, @Query("page") page?: string, @Query("limit") limit?: string) {
    return this.service.adminList({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "View a transcript's full computed record + its share links" })
  getOne(@Param("id") id: string) {
    return this.service.adminGetOne(id);
  }

  @Patch("shares/:shareId/revoke")
  @ApiOperation({ summary: "Revoke any student's transcript share link" })
  revokeShare(@Param("shareId") shareId: string, @Body("reason") reason?: string) {
    return this.service.adminRevokeShare(shareId, reason);
  }
}
