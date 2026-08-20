import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { localizeMany } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

@Injectable()
export class AiToolsService {
  constructor(
    private prisma: PrismaService,
    private translationsService: TranslationsService,
  ) {}

  async getPublic(lang?: string) {
    const rows = await this.prisma.aiToolListing.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    });
    return localizeMany(rows, lang, ["category", "name", "description", "pricing_summary"]);
  }

  getAll() {
    return this.prisma.aiToolListing.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }] });
  }

  async create(dto: { name: string; category: string; description?: string; website_url?: string; logo_url?: string; pricing_summary?: string; sort_order?: number; is_published?: boolean; slug?: string }) {
    const created = await this.prisma.aiToolListing.create({
      data: { ...dto, slug: dto.slug?.trim() || slugify(dto.name) },
    });
    this.translationsService.translateToAllEnabledLocales("ai_tool_listing", created);
    return created;
  }

  async update(id: string, dto: { name?: string; category?: string; description?: string; website_url?: string; logo_url?: string; pricing_summary?: string; sort_order?: number; is_published?: boolean }) {
    const updated = await this.prisma.aiToolListing.update({ where: { id }, data: dto });
    if (dto.name !== undefined || dto.category !== undefined || dto.description !== undefined || dto.pricing_summary !== undefined) {
      this.translationsService.translateToAllEnabledLocales("ai_tool_listing", updated);
    }
    return updated;
  }

  remove(id: string) {
    return this.prisma.aiToolListing.delete({ where: { id } });
  }
}
