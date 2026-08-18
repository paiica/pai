import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ProgramsService } from "./programs.service";

@ApiTags("Programs — Public")
@Controller("programs")
export class ProgramsController {
  constructor(private service: ProgramsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List all published programs" })
  findAll(@Query("lang") lang?: string) {
    return this.service.findAll(lang);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my")
  @ApiOperation({ summary: "List my program enrollments" })
  getMyPrograms(@CurrentUser("id") userId: string) {
    return this.service.getMyPrograms(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":id/dashboard")
  @ApiOperation({ summary: "My progress dashboard for a program I'm enrolled in — curriculum sequence and locked/unlocked state (capstone/internship submission happens on that course's own assignment lesson)" })
  getDashboard(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.getProgramDashboard(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(":id/certificate")
  @ApiOperation({ summary: "My earned certificate for a program I've completed" })
  getMyCertificate(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.service.getMyCertificate(id, userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.professor, Role.admin, Role.super_admin)
  @Get("instructor/mine")
  @ApiOperation({ summary: "List programs I'm assigned as an instructor on" })
  getMyTaughtPrograms(@CurrentUser("id") professorId: string) {
    return this.service.getMyTaughtPrograms(professorId);
  }

  @Public()
  @Get("verify/:certificateNumber")
  @ApiOperation({ summary: "Verify a program certificate by number (public)" })
  verify(@Param("certificateNumber") certificateNumber: string) {
    return this.service.verify(certificateNumber);
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Get a published program's landing-page data by slug" })
  findBySlug(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return this.service.findBySlug(slug, lang);
  }
}
