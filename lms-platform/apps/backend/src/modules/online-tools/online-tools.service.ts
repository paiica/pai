import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const WITH_LINKS = `
  SELECT t.*,
    c.title AS course_title, c.slug AS course_slug,
    cert.title AS cert_title, cert.slug AS cert_slug, cert.acronym AS cert_acronym
  FROM lms.online_tools t
  LEFT JOIN lms.courses c ON c.id = t.course_id
  LEFT JOIN lms.certifications cert ON cert.id = t.certification_id
`;

@Injectable()
export class OnlineToolsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.$queryRawUnsafe<any[]>(
      `${WITH_LINKS} WHERE t.status = 'active' ORDER BY t.sort_order ASC, t.created_at DESC`
    );
  }

  async findBySlug(slug: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `${WITH_LINKS} WHERE t.slug = $1`, slug
    );
    if (!rows.length) throw new NotFoundException("Tool not found");
    const tool = rows[0];
    // Resolve related tools
    if (tool.related_tool_ids?.length) {
      const ids = tool.related_tool_ids;
      const related = await this.prisma.$queryRawUnsafe<any[]>(
        `${WITH_LINKS} WHERE t.id = ANY($1::uuid[]) AND t.status = 'active'`,
        ids
      );
      tool.related_tools = related;
    } else {
      tool.related_tools = [];
    }
    return tool;
  }

  async adminGetAll() {
    return this.prisma.$queryRawUnsafe<any[]>(
      `${WITH_LINKS} ORDER BY t.sort_order ASC, t.created_at DESC`
    );
  }

  async adminGetOne(id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `${WITH_LINKS} WHERE t.id = $1`, id
    );
    if (!rows.length) throw new NotFoundException("Tool not found");
    return rows[0];
  }

  async adminCreate(dto: any) {
    const {
      slug, title, tagline, offered_by, tool_type = "course",
      price = 0, member_price, billing_type = "one_time",
      short_description, overview, thumbnail_url, badge_text,
      cta_label = "Add To Cart", cta_url,
      features = [], how_it_works = [],
      status = "draft", sort_order = 0,
      course_id, certification_id,
    } = dto;
    if (!slug?.trim() || !title?.trim()) throw new BadRequestException("slug and title are required");

    const rows = await this.prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO lms.online_tools (
        id, slug, title, tagline, offered_by, tool_type,
        price, member_price, billing_type,
        short_description, overview, thumbnail_url, badge_text,
        cta_label, cta_url, features, how_it_works,
        status, sort_order, course_id, certification_id,
        created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6::numeric, $7::numeric, $8,
        $9, $10, $11, $12,
        $13, $14, $15::jsonb, $16::jsonb,
        $17, $18::int, $19, $20,
        now(), now()
      ) RETURNING *`,
      slug.trim(), title.trim(), tagline ?? null, offered_by ?? null, tool_type,
      price, member_price ?? null, billing_type,
      short_description ?? null, overview ?? null, thumbnail_url ?? null, badge_text ?? null,
      cta_label, cta_url ?? null, JSON.stringify(features), JSON.stringify(how_it_works),
      status, sort_order, course_id || null, certification_id || null
    );
    return rows[0];
  }

  async adminUpdate(id: string, dto: any) {
    const allowed = [
      "title", "tagline", "offered_by", "tool_type", "billing_type",
      "short_description", "overview", "thumbnail_url", "badge_text",
      "cta_label", "cta_url", "status", "sort_order",
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let p = 1;

    for (const key of allowed) {
      if (!(key in dto)) continue;
      if (key === "sort_order") sets.push(`"${key}" = $${p}::int`);
      else sets.push(`"${key}" = $${p}`);
      vals.push(dto[key] ?? null);
      p++;
    }
    if ("price" in dto) { sets.push(`price = $${p}::numeric`); vals.push(dto.price); p++; }
    if ("member_price" in dto) { sets.push(`member_price = $${p}::numeric`); vals.push(dto.member_price ?? null); p++; }
    if ("features" in dto) { sets.push(`features = $${p}::jsonb`); vals.push(JSON.stringify(dto.features ?? [])); p++; }
    if ("how_it_works" in dto) { sets.push(`how_it_works = $${p}::jsonb`); vals.push(JSON.stringify(dto.how_it_works ?? [])); p++; }
    if ("course_id" in dto) { sets.push(`course_id = $${p}`); vals.push(dto.course_id || null); p++; }
    if ("certification_id" in dto) { sets.push(`certification_id = $${p}`); vals.push(dto.certification_id || null); p++; }

    if (!sets.length) return this.adminGetOne(id);
    sets.push(`updated_at = now()`);
    vals.push(id);
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.online_tools SET ${sets.join(", ")} WHERE id = $${p}`,
      ...vals
    );
    return this.adminGetOne(id);
  }

  async adminDelete(id: string) {
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.online_tools WHERE id = $1`, id);
    return { deleted: true };
  }
}
