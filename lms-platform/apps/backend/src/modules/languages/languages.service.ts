import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SUPPORTED_LANGUAGES, getSupportedLanguage } from "./supported-languages";

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  async getEnabled() {
    return this.prisma.language.findMany({ where: { enabled: true }, orderBy: { sort_order: "asc" } });
  }

  async getAll() {
    return this.prisma.language.findMany({ orderBy: { sort_order: "asc" } });
  }

  // Used by TranslationsService to know which locales to translate new/updated
  // content into — always excludes "en" since that's the source language.
  async getEnabledLocaleCodes(): Promise<string[]> {
    const rows = await this.prisma.language.findMany({ where: { enabled: true, NOT: { code: "en" } } });
    return rows.map((r) => r.code);
  }

  // Curated languages not yet added (enabled or disabled) — the admin picks
  // from this list rather than typing an arbitrary code.
  async getAvailableToAdd() {
    const existing = await this.prisma.language.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map((r) => r.code));
    return SUPPORTED_LANGUAGES.filter((l) => !existingCodes.has(l.code));
  }

  async add(code: string) {
    const language = getSupportedLanguage(code);
    if (!language) throw new BadRequestException(`Unsupported language code: ${code}`);
    const existing = await this.prisma.language.findUnique({ where: { code } });
    if (existing) throw new BadRequestException(`${language.name} has already been added.`);
    const count = await this.prisma.language.count();
    return this.prisma.language.create({
      data: { code, name: language.name, native_name: language.native_name, is_rtl: language.is_rtl, enabled: true, sort_order: count },
    });
  }

  async setEnabled(code: string, enabled: boolean) {
    if (code === "en") throw new BadRequestException("English is the source language and can't be disabled.");
    const existing = await this.prisma.language.findUnique({ where: { code } });
    if (!existing) throw new BadRequestException(`${code} hasn't been added yet.`);
    return this.prisma.language.update({ where: { code }, data: { enabled } });
  }

  // Admin drag/reorder sends the full list of codes in the order they should
  // display in — sort_order is just each code's index in that list. English
  // isn't pinned to a position; the admin can put it wherever they like.
  async reorder(codes: string[]) {
    const existing = await this.prisma.language.findMany({ select: { code: true } });
    const existingCodes = new Set(existing.map((r) => r.code));
    if (codes.length !== existing.length || !codes.every((c) => existingCodes.has(c))) {
      throw new BadRequestException("The reorder list must contain exactly the currently added languages.");
    }
    await this.prisma.$transaction(
      codes.map((code, index) => this.prisma.language.update({ where: { code }, data: { sort_order: index } }))
    );
    return this.getAll();
  }
}
