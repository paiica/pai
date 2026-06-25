import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_KEYS = ["site_title", "site_description", "favicon_url", "site_logo_url", "logo_height"];

@Injectable()
export class SiteSettingsService {
  constructor(private prisma: PrismaService) {}

  async getPublic(): Promise<Record<string, string>> {
    const settings = await this.prisma.siteSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
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

  async upsertMany(data: Record<string, string>) {
    const ops = Object.entries(data).map(([key, value]) =>
      this.prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    );
    return this.prisma.$transaction(ops);
  }

  async getApiSettings() {
    const keys = [
      "resend_api_key", "email_from", "email_from_name",
      "s3_endpoint", "s3_region", "s3_bucket_name", "s3_access_key_id", "s3_secret_access_key",
      "supabase_project_url", "supabase_anon_key",
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
      supabase_project_url:     map.supabase_project_url     ?? "",
      supabase_anon_key:        map.supabase_anon_key        ?? "",
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
