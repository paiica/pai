import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { localize } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

const PAGE_LOCALIZED_FIELDS = ["title", "content", "meta_description", "hero_badge", "hero_headline", "hero_subheadline", "hero_cta_label", "blocks"];

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,
    private translationsService: TranslationsService,
  ) {}

  getAll() {
    return this.prisma.page.findMany({ orderBy: { created_at: "desc" } });
  }

  // Slugs + timestamps only, for the marketing-site's sitemap.xml — deliberately
  // excludes content-heavy fields no sitemap generator needs.
  getPublicSlugs() {
    return this.prisma.page.findMany({
      where: { is_published: true },
      select: { slug: true, updated_at: true },
    });
  }

  async getBySlug(slug: string, lang?: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.is_published) throw new NotFoundException("Page not found");
    return localize(page, lang, PAGE_LOCALIZED_FIELDS);
  }

  async create(dto: {
    slug: string; title: string; content?: string; meta_description?: string; is_published?: boolean;
    hero_enabled?: boolean; hero_badge?: string; hero_headline?: string; hero_subheadline?: string;
    hero_align?: string; hero_image_url?: string; hero_image_position?: string; hero_image_zoom?: number;
    hero_overlay?: boolean; hero_cta_label?: string; hero_cta_href?: string; blocks?: any[];
  }) {
    const created = await this.prisma.page.create({ data: { ...dto } });
    this.translationsService.translateToAllEnabledLocales("page", created);
    return created;
  }

  async update(id: string, dto: { slug?: string; title?: string; content?: string; meta_description?: string; is_published?: boolean; blocks?: any[] }) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");
    const updated = await this.prisma.page.update({ where: { id }, data: dto });
    this.translationsService.translateToAllEnabledLocales("page", updated);
    return updated;
  }

  async delete(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");
    return this.prisma.page.delete({ where: { id } });
  }
}
