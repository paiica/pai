import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CertificationRecommendationsService {
  constructor(private prisma: PrismaService) {}

  async listMine(studentId: string) {
    const rows = await this.prisma.certificationRecommendation.findMany({
      where: { student_id: studentId },
      include: {
        certification: { select: { id: true, slug: true, acronym: true, title: true, price: true } },
        professor: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      certification: r.certification,
      professor_name: r.professor.profile ? `${r.professor.profile.first_name} ${r.professor.profile.last_name}`.trim() : r.professor.email,
    }));
  }
}
