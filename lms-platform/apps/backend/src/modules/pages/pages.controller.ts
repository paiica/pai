import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PagesService } from "./pages.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Pages")
@Controller("pages")
export class PagesController {
  constructor(private service: PagesService) {}

  @Public()
  @Get("public/:slug")
  @ApiOperation({ summary: "Get a published page by slug (no auth)" })
  getBySlug(@Param("slug") slug: string, @Query("lang") lang?: string) {
    return this.service.getBySlug(slug, lang);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get all pages (admin)" })
  getAll() {
    return this.service.getAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Create a page" })
  create(@Body() dto: {
    slug: string; title: string; content?: string; meta_description?: string; is_published?: boolean;
    hero_enabled?: boolean; hero_badge?: string; hero_headline?: string; hero_subheadline?: string;
    hero_align?: string; hero_image_url?: string; hero_image_position?: string; hero_image_zoom?: number;
    hero_overlay?: boolean; hero_cta_label?: string; hero_cta_href?: string;
  }) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Update a page" })
  update(@Param("id") id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Delete a page" })
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
