import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  async validate(
    code: string,
    subtotal: number,
    context?: { courseId?: string; certificationId?: string; userId?: string },
  ): Promise<{ valid: boolean; discount_amount: number; message: string; promo_id?: string }> {
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.promo_codes WHERE code = $1`,
      code.toUpperCase()
    );
    const promo = rows[0];
    if (!promo) return { valid: false, discount_amount: 0, message: "Invalid promo code" };
    if (!promo.is_active) return { valid: false, discount_amount: 0, message: "Promo code is no longer active" };
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { valid: false, discount_amount: 0, message: "Promo code has expired" };
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return { valid: false, discount_amount: 0, message: "Promo code usage limit reached" };

    // Per-user redemption limit
    if (context?.userId && promo.max_uses_per_user !== null && promo.max_uses_per_user !== undefined) {
      const usedRows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int AS count FROM lms.promo_redemptions WHERE promo_id = $1 AND user_id = $2`,
        promo.id, context.userId,
      );
      const userUsed = usedRows[0]?.count ?? 0;
      if (userUsed >= promo.max_uses_per_user) {
        return { valid: false, discount_amount: 0, message: "You have already used this promo code" };
      }
    }

    // Enforce item restriction if the code is scoped to a specific course or certification
    if (promo.course_id) {
      if (!context?.courseId || context.courseId !== promo.course_id) {
        return { valid: false, discount_amount: 0, message: "This promo code is not valid for this course" };
      }
    }
    if (promo.certification_id) {
      if (!context?.certificationId || context.certificationId !== promo.certification_id) {
        return { valid: false, discount_amount: 0, message: "This promo code is not valid for this certification" };
      }
    }

    const val = Number(promo.discount_value);
    const discount_amount = promo.discount_type === "percentage"
      ? Math.round(subtotal * (val / 100) * 100) / 100
      : Math.min(val, subtotal);

    return { valid: true, discount_amount, message: `${promo.discount_type === "percentage" ? val + "% off" : "$" + val + " off"} applied`, promo_id: promo.id };
  }

  async incrementUsed(promoId: string, userId?: string) {
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.promo_codes SET used_count = used_count + 1, updated_at = now() WHERE id = $1`,
      promoId
    );
    if (userId) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO lms.promo_redemptions (id, promo_id, user_id) VALUES (gen_random_uuid(), $1, $2)`,
        promoId, userId,
      );
    }
  }

  async adminList() {
    return this.prisma.$queryRawUnsafe<any[]>(`
      SELECT p.*,
        c.title AS course_title,
        cert.title AS certification_title, cert.acronym AS certification_acronym
      FROM lms.promo_codes p
      LEFT JOIN lms.courses c ON c.id = p.course_id
      LEFT JOIN lms.certifications cert ON cert.id = p.certification_id
      ORDER BY p.created_at DESC
    `);
  }

  async adminCreate(dto: {
    code: string; description?: string; discount_type: string; discount_value: number;
    max_uses?: number; expires_at?: string; is_active?: boolean;
    course_id?: string; certification_id?: string;
  }) {
    const { code, description, discount_type, discount_value, max_uses, expires_at, is_active = true, course_id, certification_id } = dto;
    if (!["percentage", "fixed"].includes(discount_type)) throw new BadRequestException("discount_type must be percentage or fixed");
    this.assertValidDiscountValue(discount_type, discount_value);
    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO lms.promo_codes (id, code, description, discount_type, discount_value, max_uses, expires_at, is_active, used_count, course_id, certification_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4::numeric, $5, $6, $7, 0, $8, $9, now(), now()) RETURNING *`,
      code.toUpperCase(), description ?? null, discount_type, discount_value, max_uses ?? null,
      expires_at ? new Date(expires_at) : null, is_active,
      course_id || null, certification_id || null
    );
    return rows[0];
  }

  async adminUpdate(id: string, dto: Partial<{
    description: string; discount_type: string; discount_value: number;
    max_uses: number; expires_at: string; is_active: boolean;
    course_id: string; certification_id: string;
  }>) {
    const { description, discount_type, discount_value, max_uses, expires_at, is_active, course_id, certification_id } = dto;
    if (discount_type !== undefined || discount_value !== undefined) {
      if (discount_type !== undefined && !["percentage", "fixed"].includes(discount_type)) {
        throw new BadRequestException("discount_type must be percentage or fixed");
      }
      if (discount_value !== undefined) {
        let effectiveType: string = discount_type ?? "";
        if (!effectiveType) {
          const [current] = await this.prisma.$queryRawUnsafe<any[]>(
            `SELECT discount_type FROM lms.promo_codes WHERE id = $1`, id,
          );
          effectiveType = current?.discount_type ?? "fixed";
        }
        this.assertValidDiscountValue(effectiveType, discount_value);
      }
    }
    await this.prisma.$executeRawUnsafe(
      `UPDATE lms.promo_codes SET
        description = COALESCE($1, description),
        discount_type = COALESCE($2, discount_type),
        discount_value = COALESCE($3::numeric, discount_value),
        max_uses = COALESCE($4, max_uses),
        expires_at = COALESCE($5, expires_at),
        is_active = COALESCE($6, is_active),
        course_id = $7,
        certification_id = $8,
        updated_at = now()
       WHERE id = $9`,
      description ?? null, discount_type ?? null, discount_value ?? null, max_uses ?? null,
      expires_at ? new Date(expires_at) : null, is_active ?? null,
      course_id ?? null, certification_id ?? null, id
    );
    const rows = await this.prisma.$queryRawUnsafe<any[]>(`SELECT * FROM lms.promo_codes WHERE id = $1`, id);
    return rows[0];
  }

  async adminDelete(id: string) {
    await this.prisma.$executeRawUnsafe(`DELETE FROM lms.promo_codes WHERE id = $1`, id);
    return { deleted: true };
  }

  private assertValidDiscountValue(discountType: string, discountValue: number) {
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new BadRequestException("discount_value must be a positive number");
    }
    if (discountType === "percentage" && discountValue > 100) {
      throw new BadRequestException("A percentage discount cannot exceed 100");
    }
  }
}
