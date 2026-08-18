import { BadRequestException, Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { LanguagesService } from "../languages/languages.service";
import { getSupportedLanguage } from "../languages/supported-languages";
import { hasContent, mergeTranslated, stripNonTranslatable } from "../../common/utils/translate-json";

export type EntityType = "page" | "blog_post" | "nav_item" | "page_block" | "certification" | "course" | "program" | "event";

// Everything needed to translate one row of a given entity type: how to look
// it up, which English fields to translate (with JSON fields pre-stripped of
// non-text keys like hrefs/colors/icons), and how to write the result back
// into that row's `translations` JSON column.
@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    @Inject(forwardRef(() => LanguagesService)) private languagesService: LanguagesService,
  ) {}

  private buildEnglishFields(entityType: EntityType, row: any): Record<string, any> {
    switch (entityType) {
      case "page":
        return {
          title: row.title, content: row.content, meta_description: row.meta_description,
          hero_badge: row.hero_badge, hero_headline: row.hero_headline,
          hero_subheadline: row.hero_subheadline, hero_cta_label: row.hero_cta_label,
        };
      case "blog_post":
        return { title: row.title, excerpt: row.excerpt, content: row.content };
      case "nav_item":
        return { label: row.label };
      case "page_block":
        return stripNonTranslatable(row.content);
      case "certification": {
        // certificate_template_html is a raw HTML certificate design (with
        // placeholder tokens like {{name}}) — never sent through the AI
        // translator, unlike the rest of marketing_meta.
        const { certificate_template_html, ...marketingMetaTranslatable } = row.marketing_meta ?? {};
        return {
          title: row.title, description: row.description, long_description: row.long_description,
          learning_outcomes: row.learning_outcomes, target_audience: row.target_audience, skills: row.skills,
          curriculum_overview: stripNonTranslatable(row.curriculum_overview),
          faqs_json: stripNonTranslatable(row.faqs_json),
          marketing_meta: stripNonTranslatable(marketingMetaTranslatable),
          industry_focus: row.industry_focus, required_education: row.required_education, required_documents: row.required_documents,
        };
      }
      case "course":
        return {
          title: row.title, subtitle: row.subtitle, description: row.description,
          content: row.content ? stripNonTranslatable(row.content) : undefined,
        };
      case "program": {
        // testimonials deliberately excluded — same reasoning as certification's
        // testimonials: real people's names shouldn't be run through the AI translator.
        const { certificate_template_html, ...marketingMetaTranslatable } = row.marketing_meta ?? {};
        return {
          title: row.title, short_description: row.short_description, description: row.description,
          overview: row.overview,
          learning_outcomes: row.learning_outcomes, target_audience: row.target_audience, prerequisites: row.prerequisites,
          faqs_json: stripNonTranslatable(row.faqs_json),
          marketing_meta: stripNonTranslatable(marketingMetaTranslatable),
        };
      }
      case "event":
        // speakers deliberately excluded — same reasoning as above (names/bios).
        return {
          title: row.title, subtitle: row.subtitle, summary: row.summary, description: row.description,
          topics: row.topics,
          agenda: row.agenda ? stripNonTranslatable(row.agenda) : undefined,
        };
    }
  }

  // page_block/certification.curriculum_overview,faqs_json/course.content go
  // through stripNonTranslatable before the AI call, so the translated
  // result needs the stripped keys spliced back from the original — every
  // other field is a plain string/string[] with nothing to merge.
  private mergeBackNonTranslatable(entityType: EntityType, row: any, translated: Record<string, any>): Record<string, any> {
    switch (entityType) {
      case "page_block":
        return hasContent(translated) ? mergeTranslated(row.content, translated) : {};
      case "certification": {
        const out = { ...translated };
        if (translated.curriculum_overview) out.curriculum_overview = mergeTranslated(row.curriculum_overview, translated.curriculum_overview);
        if (translated.faqs_json) out.faqs_json = mergeTranslated(row.faqs_json, translated.faqs_json);
        if (translated.marketing_meta) {
          // Spread the full original object first so untranslated keys —
          // certificate_template_html above all — survive into the merged
          // result instead of vanishing when this locale's marketing_meta
          // wholesale-replaces the English one in localize().
          const { certificate_template_html, ...rest } = row.marketing_meta ?? {};
          out.marketing_meta = { ...(row.marketing_meta ?? {}), ...mergeTranslated(rest, translated.marketing_meta) };
        }
        return out;
      }
      case "course": {
        const out = { ...translated };
        if (translated.content) out.content = mergeTranslated(row.content, translated.content);
        return out;
      }
      case "program": {
        const out = { ...translated };
        if (translated.faqs_json) out.faqs_json = mergeTranslated(row.faqs_json, translated.faqs_json);
        if (translated.marketing_meta) {
          const { certificate_template_html, ...rest } = row.marketing_meta ?? {};
          out.marketing_meta = { ...(row.marketing_meta ?? {}), ...mergeTranslated(rest, translated.marketing_meta) };
        }
        return out;
      }
      case "event": {
        const out = { ...translated };
        if (translated.agenda) out.agenda = mergeTranslated(row.agenda, translated.agenda);
        return out;
      }
      default:
        return translated;
    }
  }

  private async findRow(entityType: EntityType, entityId: string): Promise<any | null> {
    switch (entityType) {
      case "page": return this.prisma.page.findUnique({ where: { id: entityId } });
      case "blog_post": return this.prisma.blogPost.findUnique({ where: { id: entityId } });
      case "nav_item": return this.prisma.navItem.findUnique({ where: { id: entityId } });
      case "page_block": return this.prisma.pageBlock.findUnique({ where: { key: entityId } });
      case "certification": return this.prisma.certification.findUnique({ where: { id: entityId } });
      case "course": return this.prisma.course.findUnique({ where: { id: entityId } });
      case "program": return this.prisma.program.findUnique({ where: { id: entityId } });
      case "event": return this.prisma.event.findUnique({ where: { id: entityId } });
    }
  }

  private async findAllRows(entityType: EntityType): Promise<any[]> {
    switch (entityType) {
      case "page": return this.prisma.page.findMany();
      case "blog_post": return this.prisma.blogPost.findMany();
      case "nav_item": return this.prisma.navItem.findMany();
      case "page_block": return this.prisma.pageBlock.findMany();
      case "certification": return this.prisma.certification.findMany();
      case "course": return this.prisma.course.findMany();
      case "program": return this.prisma.program.findMany();
      case "event": return this.prisma.event.findMany();
    }
  }

  private async writeTranslations(entityType: EntityType, row: any, locale: string, fields: Record<string, any>) {
    const merged = { ...(row.translations ?? {}), [locale]: fields };
    switch (entityType) {
      case "page": await this.prisma.page.update({ where: { id: row.id }, data: { translations: merged } }); return;
      case "blog_post": await this.prisma.blogPost.update({ where: { id: row.id }, data: { translations: merged } }); return;
      case "nav_item": await this.prisma.navItem.update({ where: { id: row.id }, data: { translations: merged } }); return;
      case "page_block": await this.prisma.pageBlock.update({ where: { key: row.key }, data: { translations: merged } }); return;
      case "certification": await this.prisma.certification.update({ where: { id: row.id }, data: { translations: merged } }); return;
      case "course": await this.prisma.course.update({ where: { id: row.id }, data: { translations: merged } }); return;
      case "program": await this.prisma.program.update({ where: { id: row.id }, data: { translations: merged } }); return;
      case "event": await this.prisma.event.update({ where: { id: row.id }, data: { translations: merged } }); return;
    }
  }

  // Translates one row into one locale and writes the result. Used by both
  // the manual "Re-translate" button and the bulk/auto-translate flows below.
  async translateRow(entityType: EntityType, row: any, locale: string): Promise<void> {
    const language = getSupportedLanguage(locale);
    if (!language) throw new BadRequestException(`Unsupported locale: ${locale}`);
    const englishFields = this.buildEnglishFields(entityType, row);
    if (!hasContent(englishFields)) return;
    const translated = await this.aiService.translateFields(englishFields, locale, language.name);
    if (!hasContent(translated)) return;
    const merged = this.mergeBackNonTranslatable(entityType, row, translated);
    await this.writeTranslations(entityType, row, locale, merged);
  }

  // Public entry point for the admin "Re-translate" button — always
  // overwrites, regardless of whether a translation already exists.
  async retranslateEntity(entityType: EntityType, entityId: string, locale: string) {
    const row = await this.findRow(entityType, entityId);
    if (!row) throw new BadRequestException(`${entityType} ${entityId} not found`);
    await this.translateRow(entityType, row, locale);
    return this.findRow(entityType, entityId);
  }

  // Manual save from a content editor's language tab — the admin typed
  // directly into that locale's fields, no AI call involved. Merges into
  // the existing translation for that locale rather than replacing it
  // wholesale, so editing just the title doesn't wipe out an already-
  // translated content field.
  async setEntityTranslation(entityType: EntityType, entityId: string, locale: string, fields: Record<string, any>) {
    const row = await this.findRow(entityType, entityId);
    if (!row) throw new BadRequestException(`${entityType} ${entityId} not found`);
    const existing = row.translations?.[locale] ?? {};
    await this.writeTranslations(entityType, row, locale, { ...existing, ...fields });
    return this.findRow(entityType, entityId);
  }

  // Fire-and-forget: called after a content service saves an English
  // create/update, translates that one row into every currently-enabled
  // non-English locale. Not awaited by callers — errors are logged, never
  // surfaced to the save response, so a slow/failed AI call never blocks or
  // fails an admin's save.
  translateToAllEnabledLocales(entityType: EntityType, row: any): void {
    this.languagesService.getEnabledLocaleCodes()
      .then((locales) => Promise.all(locales.map((locale) =>
        this.translateRow(entityType, row, locale).catch((err) =>
          this.logger.error(`Auto-translate failed for ${entityType} ${row.id ?? row.key} -> ${locale}: ${err?.message ?? err}`)
        )
      )))
      .catch((err) => this.logger.error(`Auto-translate lookup failed for ${entityType}: ${err?.message ?? err}`));
  }

  // Bulk "first-time" job triggered when an admin adds a new language —
  // translates every existing row of every entity type into that locale.
  // Skips rows that already have a non-empty translation for it (idempotent,
  // safe to re-run e.g. after a rate-limit interruption).
  async translateAllContentInto(locale: string): Promise<{ entityType: EntityType; translated: number; total: number }[]> {
    const entityTypes: EntityType[] = ["page", "blog_post", "nav_item", "page_block", "certification", "course", "program", "event"];
    const results: { entityType: EntityType; translated: number; total: number }[] = [];
    for (const entityType of entityTypes) {
      const rows = await this.findAllRows(entityType);
      let translated = 0;
      for (const row of rows) {
        if (hasContent(row.translations?.[locale])) continue;
        try {
          await this.translateRow(entityType, row, locale);
          translated++;
        } catch (err: any) {
          this.logger.error(`Bulk translate failed for ${entityType} ${row.id ?? row.key} -> ${locale}: ${err?.message ?? err}`);
        }
      }
      results.push({ entityType, translated, total: rows.length });
    }
    return results;
  }
}
