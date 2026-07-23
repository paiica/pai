import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { user_id: userId },
      include: {
        course: { select: { id: true, slug: true, title: true, subtitle: true, price: true, thumbnail_url: true, level: true } },
        certification: { select: { id: true, slug: true, title: true, acronym: true, price: true, badge_image_url: true } },
      },
      orderBy: { created_at: "asc" },
    });
    return items.map((i) => this.toDto(i)).filter((i): i is NonNullable<typeof i> => i !== null);
  }

  async addItem(userId: string, dto: { type: string; course_id?: string; certification_id?: string }) {
    if (dto.type === "course") {
      if (!dto.course_id) throw new BadRequestException("course_id is required");
      const course = await this.prisma.course.findUnique({ where: { id: dto.course_id } });
      if (!course) throw new NotFoundException("Course not found");
      await this.prisma.cartItem.upsert({
        where: { user_id_course_id: { user_id: userId, course_id: dto.course_id } },
        create: { user_id: userId, type: "course", course_id: dto.course_id },
        update: {},
      });
    } else if (dto.type === "certification") {
      if (!dto.certification_id) throw new BadRequestException("certification_id is required");
      const cert = await this.prisma.certification.findUnique({ where: { id: dto.certification_id } });
      if (!cert) throw new NotFoundException("Certification not found");
      await this.prisma.cartItem.upsert({
        where: { user_id_certification_id: { user_id: userId, certification_id: dto.certification_id } },
        create: { user_id: userId, type: "certification", certification_id: dto.certification_id },
        update: {},
      });
    } else {
      throw new BadRequestException('type must be "course" or "certification"');
    }
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const result = await this.prisma.cartItem.deleteMany({ where: { id: itemId, user_id: userId } });
    if (result.count === 0) throw new NotFoundException("Cart item not found");
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { user_id: userId } });
    return [];
  }

  private toDto(item: any) {
    if (item.type === "course" && item.course) {
      return {
        id: item.id,
        type: "course" as const,
        course_id: item.course.id,
        slug: item.course.slug,
        title: item.course.title,
        subtitle: item.course.subtitle ?? undefined,
        price: Number(item.course.price),
        thumbnail_url: item.course.thumbnail_url ?? undefined,
        level: item.course.level ?? undefined,
      };
    }
    if (item.type === "certification" && item.certification) {
      return {
        id: item.id,
        type: "certification" as const,
        certification_id: item.certification.id,
        slug: item.certification.slug,
        title: item.certification.title,
        price: Number(item.certification.price),
        thumbnail_url: item.certification.badge_image_url ?? undefined,
        cert_acronym: item.certification.acronym,
      };
    }
    // Referenced course/certification was deleted out from under the cart row —
    // shouldn't happen (onDelete: Cascade removes the row too), but skip defensively.
    return null;
  }
}
