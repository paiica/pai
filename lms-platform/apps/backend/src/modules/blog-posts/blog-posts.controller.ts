import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { BlogPostsService } from "./blog-posts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("Blog Posts")
@Controller("blog-posts")
export class BlogPostsController {
  constructor(private service: BlogPostsService) {}

  @Public()
  @Get("public")
  @ApiOperation({ summary: "Get all published posts (no auth)" })
  getPublicAll() {
    return this.service.getPublicAll();
  }

  @Public()
  @Get("public/:slug")
  @ApiOperation({ summary: "Get a published post by slug (no auth)" })
  getPublicBySlug(@Param("slug") slug: string) {
    return this.service.getPublicBySlug(slug);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get all posts (admin)" })
  getAll() {
    return this.service.getAll();
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Get post by id (admin)" })
  getById(@Param("id") id: string) {
    return this.service.getById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Create a post" })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Update a post" })
  update(@Param("id") id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: "Delete a post" })
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }
}
