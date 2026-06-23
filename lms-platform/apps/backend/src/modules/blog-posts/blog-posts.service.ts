import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BlogPostsService {
  constructor(private prisma: PrismaService) {}

  getPublicAll() {
    return this.prisma.blogPost.findMany({
      where: { is_published: true },
      orderBy: { published_at: "desc" },
      select: {
        id: true, slug: true, title: true, excerpt: true,
        cover_image_url: true, category: true, tags: true,
        author_name: true, author_avatar: true, reading_time: true,
        published_at: true, created_at: true,
      },
    });
  }

  async getPublicBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post || !post.is_published) throw new NotFoundException("Post not found");
    return post;
  }

  getAll() {
    return this.prisma.blogPost.findMany({ orderBy: { created_at: "desc" } });
  }

  async getById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Post not found");
    return post;
  }

  create(dto: {
    slug: string; title: string; excerpt?: string; content?: string;
    cover_image_url?: string; category?: string; tags?: string[];
    author_name?: string; author_avatar?: string; reading_time?: string;
    is_published?: boolean;
  }) {
    const data: any = { ...dto };
    if (dto.is_published && !data.published_at) data.published_at = new Date();
    return this.prisma.blogPost.create({ data });
  }

  async update(id: string, dto: {
    slug?: string; title?: string; excerpt?: string; content?: string;
    cover_image_url?: string; category?: string; tags?: string[];
    author_name?: string; author_avatar?: string; reading_time?: string;
    is_published?: boolean; is_featured?: boolean;
  }) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Post not found");
    const data: any = { ...dto };
    if (dto.is_published && !post.published_at && !data.published_at) {
      data.published_at = new Date();
    }
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async delete(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Post not found");
    return this.prisma.blogPost.delete({ where: { id } });
  }
}
