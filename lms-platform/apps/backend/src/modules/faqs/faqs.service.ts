import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { localizeMany } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

@Injectable()
export class FaqsService {
  constructor(
    private prisma: PrismaService,
    private translationsService: TranslationsService,
  ) {}

  // Grouped server-side (not left to the client) — /faq/page.tsx is a server
  // component and this keeps it a straight render with no client-side
  // grouping logic to get wrong. Category order follows each category's
  // first appearance in sort_order — same convention NavItem.group_label
  // grouping already relies on.
  async getPublic(lang?: string) {
    const rows = await this.prisma.faq.findMany({
      where: { is_published: true },
      orderBy: { sort_order: "asc" },
    });
    const localized = localizeMany(rows, lang, ["category", "question", "answer"]);

    const groups: { category: string; items: { id: string; question: string; answer: string }[] }[] = [];
    for (const row of localized) {
      let group = groups.find((g) => g.category === row.category);
      if (!group) {
        group = { category: row.category, items: [] };
        groups.push(group);
      }
      group.items.push({ id: row.id, question: row.question, answer: row.answer });
    }
    return groups;
  }

  getAll() {
    return this.prisma.faq.findMany({ orderBy: { sort_order: "asc" } });
  }

  async create(dto: { category: string; question: string; answer: string; sort_order?: number; is_published?: boolean }) {
    const created = await this.prisma.faq.create({ data: dto });
    this.translationsService.translateToAllEnabledLocales("faq", created);
    return created;
  }

  async update(id: string, dto: { category?: string; question?: string; answer?: string; sort_order?: number; is_published?: boolean }) {
    const updated = await this.prisma.faq.update({ where: { id }, data: dto });
    if (dto.category !== undefined || dto.question !== undefined || dto.answer !== undefined) {
      this.translationsService.translateToAllEnabledLocales("faq", updated);
    }
    return updated;
  }

  remove(id: string) {
    return this.prisma.faq.delete({ where: { id } });
  }
}
