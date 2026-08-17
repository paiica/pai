import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_KEYS = ["site_title", "site_description", "favicon_url", "site_logo_url", "logo_height", "google_analytics_id", "lead_popup_homepage_enabled", "lead_popup_blog_enabled"];
// Text-facing site_settings keys with per-locale sibling keys — `${key}_${locale}`
// (not a schema change, SiteSetting is a plain key-value table) — that overlay
// their English counterpart when a translated value has actually been set for
// the requested locale. Works for any enabled language, not just Arabic.
const LOCALIZABLE_SETTING_KEYS = ["site_title", "site_description"];

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  async getPublic(lang?: string): Promise<Record<string, string>> {
    const settings = await this.prisma.siteSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    if (lang && lang !== "en") {
      const localeKeys = LOCALIZABLE_SETTING_KEYS.map((k) => `${k}_${lang}`);
      const localized = await this.prisma.siteSetting.findMany({ where: { key: { in: localeKeys } } });
      const localizedMap = Object.fromEntries(localized.map((s) => [s.key, s.value]));
      for (const key of LOCALIZABLE_SETTING_KEYS) {
        const v = localizedMap[`${key}_${lang}`];
        if (v?.trim()) map[key] = v;
      }
    }
    return map;
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.siteSetting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async upsert(key: string, value: string) {
    return this.prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async upsertMany(data: Record<string, unknown>) {
    // `value` is a required String column — callers occasionally send a number
    // (e.g. logo_height) or boolean, which Prisma rejects outright rather than
    // coercing, so normalize everything to a string here.
    const ops = Object.entries(data).map(([key, value]) =>
      this.prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    );
    return this.prisma.$transaction(ops);
  }

  async getApiSettings() {
    const keys = [
      "resend_api_key", "email_from", "email_from_name",
      "s3_endpoint", "s3_region", "s3_bucket_name", "s3_access_key_id", "s3_secret_access_key", "s3_public_url_base",
      "supabase_project_url", "supabase_anon_key",
      "google_analytics_id",
      "e2b_api_key", "e2b_template",
    ];
    const rows = await this.prisma.siteSetting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      resend_key_set:           !!map.resend_api_key,
      email_from:               map.email_from               ?? "",
      email_from_name:          map.email_from_name          ?? "",
      s3_access_key_id_set:     !!map.s3_access_key_id,
      s3_secret_access_key_set: !!map.s3_secret_access_key,
      s3_endpoint:              map.s3_endpoint              ?? "",
      s3_region:                map.s3_region                ?? "us-east-1",
      s3_bucket_name:           map.s3_bucket_name           ?? "",
      s3_public_url_base:       map.s3_public_url_base       ?? "",
      supabase_project_url:     map.supabase_project_url     ?? "",
      supabase_anon_key:        map.supabase_anon_key        ?? "",
      google_analytics_id:      map.google_analytics_id      ?? "",
      e2b_key_set:              !!map.e2b_api_key,
      e2b_template:             map.e2b_template             ?? "",
    };
  }

  async getPaymentSettings() {
    const keys = ["stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret", "stripe_mode"];
    const rows = await this.prisma.siteSetting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      stripe_publishable_key:    map.stripe_publishable_key   ?? "",
      stripe_secret_key_set:     !!map.stripe_secret_key,
      stripe_webhook_secret_set: !!map.stripe_webhook_secret,
      stripe_mode:               map.stripe_mode              ?? "test",
    };
  }
}
