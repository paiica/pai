import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CaptureLeadDto } from "./dto/capture-lead.dto";

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  // A plain create, not an upsert — a second submission from the same email
  // (e.g. someone filling both the Employers and Corporate inquiry forms, or
  // just the lead-magnet popup twice) is a second genuine signal, not a
  // duplicate to collapse. Upserting-by-email used to silently overwrite and
  // destroy an earlier submission's message/organization.
  capture(dto: CaptureLeadDto) {
    const email = dto.email.trim().toLowerCase();
    return this.prisma.lead.create({
      data: {
        email,
        name: dto.name ?? "",
        interest: dto.interest ?? "",
        source: dto.source ?? "",
        page_url: dto.page_url ?? "",
        organization: dto.organization ?? "",
        message: dto.message ?? "",
      },
    });
  }

  async adminList(page: number, limit: number, q?: string) {
    const where: Prisma.LeadWhereInput = q
      ? { email: { contains: q, mode: "insensitive" } }
      : {};
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({ where, orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  adminDelete(id: string) {
    return this.prisma.lead.delete({ where: { id } });
  }
}
