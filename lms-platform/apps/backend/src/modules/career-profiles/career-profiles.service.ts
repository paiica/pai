import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { localizeMany } from "../../common/utils/localize";
import { TranslationsService } from "../translations/translations.service";

function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

@Injectable()
export class CareerProfilesService {
  constructor(
    private prisma: PrismaService,
    private translationsService: TranslationsService,
  ) {}

  async getPublic(lang?: string) {
    const rows = await this.prisma.careerProfile.findMany({
      where: { is_published: true },
      orderBy: [{ sort_order: "asc" }, { role_title: "asc" }],
    });
    return localizeMany(rows, lang, ["role_title", "summary", "responsibilities"]);
  }

  getAll() {
    return this.prisma.careerProfile.findMany({ orderBy: [{ sort_order: "asc" }, { role_title: "asc" }] });
  }

  async create(dto: { role_title: string; summary?: string; responsibilities?: string[]; related_cert_acronyms?: string[]; sort_order?: number; is_published?: boolean; slug?: string }) {
    const created = await this.prisma.careerProfile.create({
      data: { ...dto, slug: dto.slug?.trim() || slugify(dto.role_title) },
    });
    this.translationsService.translateToAllEnabledLocales("career_profile", created);
    return created;
  }

  async update(id: string, dto: { role_title?: string; summary?: string; responsibilities?: string[]; related_cert_acronyms?: string[]; sort_order?: number; is_published?: boolean }) {
    const updated = await this.prisma.careerProfile.update({ where: { id }, data: dto });
    if (dto.role_title !== undefined || dto.summary !== undefined || dto.responsibilities !== undefined) {
      this.translationsService.translateToAllEnabledLocales("career_profile", updated);
    }
    return updated;
  }

  remove(id: string) {
    return this.prisma.careerProfile.delete({ where: { id } });
  }
}
