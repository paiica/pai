import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PageBlocksService } from "./page-blocks.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Page Blocks")
@Controller("page-blocks")
export class PageBlocksController {
  constructor(private service: PageBlocksService) {}

  @Public()
  @Get("public")
  @ApiOperation({ summary: "Get all visible page blocks for the marketing site" })
  getPublic() {
    return this.service.getPublic();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get all page blocks (admin)" })
  getAll() {
    return this.service.getAll();
  }

  @Patch("order")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Update sort order and visibility for multiple blocks" })
  updateMany(@Body() body: Array<{ key: string; sort_order: number; is_visible: boolean }>) {
    return this.service.updateMany(body);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Create a new block (uses default content for known types)" })
  create(@Body() body: { key: string; label?: string; sort_order?: number; content?: Record<string, any> }) {
    return this.service.create(body.key, body.label, body.sort_order, body.content);
  }

  @Patch(":key")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Update a page block (content, visibility, order)" })
  update(@Param("key") key: string, @Body() dto: any) {
    return this.service.update(key, dto);
  }

  @Delete(":key")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Delete a page block" })
  delete(@Param("key") key: string) {
    return this.service.delete(key);
  }
}
