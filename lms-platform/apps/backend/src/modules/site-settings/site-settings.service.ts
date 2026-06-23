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
}
