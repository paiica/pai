import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { OnlineToolsService } from "./online-tools.service";
import { Public } from "../../common/decorators/public.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";

@ApiTags("Online Tools")
@Controller("online-tools")
export class OnlineToolsController {
  constructor(private service: OnlineToolsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "List active online tools (public)" })
  findAll() { return this.service.findAll(); }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Get tool by slug (public)" })
  findBySlug(@Param("slug") slug: string) { return this.service.findBySlug(slug); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Get("admin/all")
  @ApiOperation({ summary: "Admin — list all tools" })
  adminGetAll() { return this.service.adminGetAll(); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Post()
  @ApiOperation({ summary: "Admin — create tool" })
  adminCreate(@Body() dto: any) { return this.service.adminCreate(dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Patch(":id")
  @ApiOperation({ summary: "Admin — update tool" })
  adminUpdate(@Param("id") id: string, @Body() dto: any) { return this.service.adminUpdate(id, dto); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @Delete(":id")
  @ApiOperation({ summary: "Admin — delete tool" })
  adminDelete(@Param("id") id: string) { return this.service.adminDelete(id); }
}
