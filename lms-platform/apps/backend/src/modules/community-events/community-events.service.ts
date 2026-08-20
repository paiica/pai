import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { localizeMany } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

@Injectable()
export class CommunityEventsService {
  constructor(
    private prisma: PrismaService,
    private translationsService: TranslationsService,
  ) {}

  async getPublic(lang?: string) {
    const rows = await this.prisma.communityEvent.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { event_date: "asc" }],
    });
    return localizeMany(rows, lang, ["title", "description", "location"]);
  }

  getAll() {
    return this.prisma.communityEvent.findMany({ orderBy: [{ sort_order: "asc" }, { event_date: "asc" }] });
  }

  async create(dto: { title: string; description?: string; event_date?: string; location?: string; link_url?: string; sort_order?: number; is_published?: boolean; slug?: string }) {
    const created = await this.prisma.communityEvent.create({
      data: { ...dto, event_date: dto.event_date ? new Date(dto.event_date) : undefined, slug: dto.slug?.trim() || slugify(dto.title) },
    });
    this.translationsService.translateToAllEnabledLocales("community_event", created);
    return created;
  }

  async update(id: string, dto: { title?: string; description?: string; event_date?: string; location?: string; link_url?: string; sort_order?: number; is_published?: boolean }) {
    const { event_date, ...rest } = dto;
    const updated = await this.prisma.communityEvent.update({
      where: { id },
      data: { ...rest, event_date: event_date ? new Date(event_date) : undefined },
    });
    if (dto.title !== undefined || dto.description !== undefined || dto.location !== undefined) {
      this.translationsService.translateToAllEnabledLocales("community_event", updated);
    }
    return updated;
  }

  remove(id: string) {
    return this.prisma.communityEvent.delete({ where: { id } });
  }
}
