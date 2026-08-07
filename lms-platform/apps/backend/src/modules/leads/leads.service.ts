import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CaptureLeadDto } from "./dto/capture-lead.dto";

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  // Upserted by email so a repeat visit (or a resubmit after dismissing once)
  // updates source/page_url on the existing row instead of piling up
  // duplicates for the same person.
  capture(dto: CaptureLeadDto) {
    const email = dto.email.trim().toLowerCase();
    return this.prisma.lead.upsert({
      where: { email },
      create: { email, source: dto.source ?? "", page_url: dto.page_url ?? "" },
      update: { source: dto.source ?? "", page_url: dto.page_url ?? "" },
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
