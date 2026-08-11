import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService) {}

  getAll() {
    return this.prisma.page.findMany({ orderBy: { created_at: "desc" } });
  }

  async getBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.is_published) throw new NotFoundException("Page not found");
    return page;
  }

  create(dto: {
    slug: string; title: string; content?: string; meta_description?: string; is_published?: boolean;
    hero_enabled?: boolean; hero_badge?: string; hero_headline?: string; hero_subheadline?: string;
    hero_align?: string; hero_image_url?: string; hero_image_position?: string; hero_image_zoom?: number;
    hero_overlay?: boolean; hero_cta_label?: string; hero_cta_href?: string;
  }) {
    return this.prisma.page.create({ data: { ...dto } });
  }

  async update(id: string, dto: { slug?: string; title?: string; content?: string; meta_description?: string; is_published?: boolean }) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");
    return this.prisma.page.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");
    return this.prisma.page.delete({ where: { id } });
  }
}
