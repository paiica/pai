import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_NAV: Array<{ label: string; href: string; sort_order: number; children?: Array<{ label: string; href: string; sort_order: number }> }> = [
  { label: "Certifications", href: "/certifications", sort_order: 1, children: [
    { label: "AI Foundations (Free)", href: "/certifications/ai-foundations", sort_order: 1 },
    { label: "CAIP – Certified AI Professional", href: "/certifications/certified-ai-professional", sort_order: 2 },
    { label: "CAIM – Certified AI Manager", href: "/certifications/certified-ai-manager", sort_order: 3 },
    { label: "CAIE – Certified AI Educator", href: "/certifications/certified-ai-educator", sort_order: 4 },
    { label: "CAIDA – Certified AI Data Analyst", href: "/certifications/certified-ai-data-analyst", sort_order: 5 },
  ]},
  { label: "Learning",          href: "/blog",        sort_order: 2 },
  { label: "Resources",         href: "/faq",         sort_order: 3 },
  { label: "For Organizations", href: "/corporate",   sort_order: 4 },
  { label: "About PAII",         href: "/about",       sort_order: 5 },
];

@Injectable()
export class NavigationService {
  constructor(private prisma: PrismaService) {}

  async getPublic() {
    const items = await this.prisma.navItem.findMany({
      where: { is_visible: true, parent_id: null },
      include: { children: { where: { is_visible: true }, orderBy: { sort_order: "asc" } } },
      orderBy: { sort_order: "asc" },
    });
    if (items.length === 0) return this.defaultPublic();
    return items;
  }

  async getAll(): Promise<any[]> {
    const items = await this.prisma.navItem.findMany({
      where: { parent_id: null },
      include: { children: { orderBy: { sort_order: "asc" } } },
      orderBy: { sort_order: "asc" },
    });
    if (items.length === 0) {
      await this.seed();
      return this.prisma.navItem.findMany({
        where: { parent_id: null },
        include: { children: { orderBy: { sort_order: "asc" } } },
        orderBy: { sort_order: "asc" },
      });
    }
    return items;
  }

  async create(dto: { label: string; href: string; sort_order?: number; parent_id?: string; open_new_tab?: boolean }) {
    return this.prisma.navItem.create({ data: dto });
  }

  async update(id: string, dto: { label?: string; href?: string; sort_order?: number; is_visible?: boolean; open_new_tab?: boolean }) {
    return this.prisma.navItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.navItem.delete({ where: { id } });
  }

  private defaultPublic() {
    return DEFAULT_NAV.map((item, i) => ({
      id: `default-${i}`,
      label: item.label,
      href: item.href,
      sort_order: item.sort_order,
      is_visible: true,
      open_new_tab: false,
      parent_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      children: (item.children ?? []).map((c, j) => ({
        id: `default-${i}-${j}`,
        label: c.label,
        href: c.href,
        sort_order: c.sort_order,
        is_visible: true,
        open_new_tab: false,
        parent_id: `default-${i}`,
        created_at: new Date(),
        updated_at: new Date(),
        children: [],
      })),
    }));
  }

  private async seed() {
    for (const item of DEFAULT_NAV) {
      const { children, ...parentData } = item;
      const parent = await this.prisma.navItem.create({ data: { ...parentData, is_visible: true } });
      if (children) {
        for (const child of children) {
          await this.prisma.navItem.create({ data: { ...child, parent_id: parent.id, is_visible: true } });
        }
      }
    }
  }
}
