import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { localizeMany } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

function slugify(term: string): string {
  return term.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

@Injectable()
export class GlossaryService {
  constructor(
    private prisma: PrismaService,
    private translationsService: TranslationsService,
  ) {}

  async getPublic(lang?: string) {
    const rows = await this.prisma.glossaryTerm.findMany({
      where: { is_published: true },
      orderBy: { term: "asc" },
    });
    return localizeMany(rows, lang, ["category", "term", "definition", "example"]);
  }

  getAll() {
    return this.prisma.glossaryTerm.findMany({ orderBy: { term: "asc" } });
  }

  async create(dto: { term: string; category: string; definition: string; example?: string; related_terms?: string[]; slug?: string }) {
    const created = await this.prisma.glossaryTerm.create({
      data: { ...dto, slug: dto.slug?.trim() || slugify(dto.term) },
    });
    this.translationsService.translateToAllEnabledLocales("glossary_term", created);
    return created;
  }

  async update(id: string, dto: { term?: string; category?: string; definition?: string; example?: string; related_terms?: string[]; is_published?: boolean }) {
    const updated = await this.prisma.glossaryTerm.update({ where: { id }, data: dto });
    if (dto.term !== undefined || dto.category !== undefined || dto.definition !== undefined || dto.example !== undefined) {
      this.translationsService.translateToAllEnabledLocales("glossary_term", updated);
    }
    return updated;
  }

  remove(id: string) {
    return this.prisma.glossaryTerm.delete({ where: { id } });
  }
}
