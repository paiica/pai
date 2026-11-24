import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { RevenueShareStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";

const TOLERANCE = 0.01; // floating-point slack when checking a split sums to 100

type Split = { institution_percentage: number; professor_percentage: number; paii_percentage: number };

@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  constructor(
    private prisma: PrismaService,
    private settings: SiteSettingsService,
  ) {}

  private assertSumsTo100(split: Split) {
    const total = split.institution_percentage + split.professor_percentage + split.paii_percentage;
    if (Math.abs(total - 100) > TOLERANCE) {
      throw new BadRequestException(`Institution + professor + PAII percentages must add up to 100 (got ${total}).`);
    }
  }

  // Resolution order: course-specific override > institution-specific
  // override > global default (Settings → APIs-style key/value, same
  // pattern as Stripe keys) > 100% to PAII if nothing is configured at all
  // — the safest default, since it never silently starts paying out money
  // nobody set up a rule for.
  async resolveSplit(courseId: string, institutionId: string): Promise<Split> {
    const courseRule = await this.prisma.revenueShareRule.findUnique({ where: { course_id: courseId } });
    if (courseRule) return this.toSplit(courseRule);

    const institutionRule = await this.prisma.revenueShareRule.findUnique({ where: { institution_id: institutionId } });
    if (institutionRule) return this.toSplit(institutionRule);

    const all = await this.settings.getAll();
    const institution_percentage = Number(all["revenue_share_default_institution_pct"] ?? 0);
    const professor_percentage = Number(all["revenue_share_default_professor_pct"] ?? 0);
    const paii_percentage = Number(all["revenue_share_default_paii_pct"] ?? 100);
    return { institution_percentage, professor_percentage, paii_percentage };
  }

  private toSplit(rule: { institution_percentage: any; professor_percentage: any; paii_percentage: any }): Split {
    return {
      institution_percentage: Number(rule.institution_percentage),
      professor_percentage: Number(rule.professor_percentage),
      paii_percentage: Number(rule.paii_percentage),
    };
  }

  // Called from the course-purchase webhook — a no-op for courses with no
  // institution attribution (the overwhelming majority of courses), so this
  // never touches independent-professor or PAII-authored course sales.
  async recordSaleIfApplicable(courseId: string, saleAmount: number, paymentIntentId?: string) {
    if (saleAmount <= 0) return;
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { institution_id: true, created_by: true } });
    if (!course?.institution_id) return;

    const split = await this.resolveSplit(courseId, course.institution_id);
    const institutionAmount = Math.round(saleAmount * split.institution_percentage) / 100;
    const professorAmount = Math.round(saleAmount * split.professor_percentage) / 100;
    const paiiAmount = Math.round((saleAmount * 100 - institutionAmount * 100 - professorAmount * 100)) / 100; // remainder to PAII, avoids rounding leaks

    await this.prisma.revenueTransaction.create({
      data: {
        course_id: courseId,
        institution_id: course.institution_id,
        professor_user_id: course.created_by,
        stripe_payment_intent_id: paymentIntentId,
        sale_amount: saleAmount,
        institution_amount: institutionAmount,
        professor_amount: professorAmount,
        paii_amount: paiiAmount,
        institution_percentage: split.institution_percentage,
        professor_percentage: split.professor_percentage,
        paii_percentage: split.paii_percentage,
      },
    });
    this.logger.log(`Revenue split recorded for course ${courseId}: institution=${institutionAmount} professor=${professorAmount} paii=${paiiAmount}`);
  }

  // ── PAII staff (admin app) ─────────────────────────────────────────────────

  async adminGetDefaultSplit(): Promise<Split> {
    const all = await this.settings.getAll();
    return {
      institution_percentage: Number(all["revenue_share_default_institution_pct"] ?? 0),
      professor_percentage: Number(all["revenue_share_default_professor_pct"] ?? 0),
      paii_percentage: Number(all["revenue_share_default_paii_pct"] ?? 100),
    };
  }

  async adminSetDefaultSplit(split: Split) {
    this.assertSumsTo100(split);
    await this.settings.upsertMany({
      revenue_share_default_institution_pct: split.institution_percentage,
      revenue_share_default_professor_pct: split.professor_percentage,
      revenue_share_default_paii_pct: split.paii_percentage,
    });
    return this.adminGetDefaultSplit();
  }

  async adminListRules() {
    return this.prisma.revenueShareRule.findMany({
      include: {
        institution: { select: { name: true } },
        course: { select: { title: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async adminSetInstitutionRule(institutionId: string, split: Split) {
    this.assertSumsTo100(split);
    await this.prisma.institution.findUniqueOrThrow({ where: { id: institutionId } }).catch(() => { throw new NotFoundException("Institution not found"); });
    return this.prisma.revenueShareRule.upsert({
      where: { institution_id: institutionId },
      create: { institution_id: institutionId, ...split },
      update: split,
    });
  }

  async adminSetCourseRule(courseId: string, split: Split) {
    this.assertSumsTo100(split);
    await this.prisma.course.findUniqueOrThrow({ where: { id: courseId } }).catch(() => { throw new NotFoundException("Course not found"); });
    return this.prisma.revenueShareRule.upsert({
      where: { course_id: courseId },
      create: { course_id: courseId, ...split },
      update: split,
    });
  }

  async adminDeleteRule(id: string) {
    await this.prisma.revenueShareRule.delete({ where: { id } }).catch(() => { throw new NotFoundException("Rule not found"); });
    return { deleted: true };
  }

  async adminListTransactions(query: { institutionId?: string; status?: string }) {
    return this.prisma.revenueTransaction.findMany({
      where: {
        institution_id: query.institutionId,
        ...(query.status ? { OR: [{ institution_status: query.status as RevenueShareStatus }, { professor_status: query.status as RevenueShareStatus }] } : {}),
      },
      include: {
        course: { select: { title: true } },
        institution: { select: { name: true } },
        professor: { select: { email: true, profile: { select: { first_name: true, last_name: true } } } },
      },
      orderBy: { created_at: "desc" },
      take: 200,
    });
  }

  async adminMarkPaid(transactionId: string, party: "institution" | "professor") {
    const transaction = await this.prisma.revenueTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException("Transaction not found");
    return this.prisma.revenueTransaction.update({
      where: { id: transactionId },
      data: party === "institution" ? { institution_status: "paid" } : { professor_status: "paid" },
    });
  }

  // ── Institution admin (academia app) ───────────────────────────────────────

  async getInstitutionEarnings(institutionId: string) {
    const transactions = await this.prisma.revenueTransaction.findMany({
      where: { institution_id: institutionId },
      include: { course: { select: { title: true } } },
      orderBy: { created_at: "desc" },
      take: 100,
    });
    const totalEarned = transactions.reduce((sum, t) => sum + Number(t.institution_amount), 0);
    const totalPaid = transactions.filter((t) => t.institution_status === "paid").reduce((sum, t) => sum + Number(t.institution_amount), 0);
    return { transactions, totalEarned, totalPending: totalEarned - totalPaid, totalPaid };
  }
}
