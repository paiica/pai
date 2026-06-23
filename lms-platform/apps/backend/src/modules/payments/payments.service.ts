import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentType, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PromoCodesService } from "../promo-codes/promo-codes.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private promoCodes: PromoCodesService,
  ) {
    this.stripe = new Stripe(config.get<string>("stripe.secretKey") || "", {
      apiVersion: "2025-02-24.acacia",
    });
  }

  // ─── Existing certification checkout (via application) ──────────────────────

  async createCheckoutSession(userId: string, certificationSlug: string, applicationId?: string) {
    const cert = await this.prisma.certification.findUnique({ where: { slug: certificationSlug } });
    if (!cert) throw new NotFoundException("Certification not found");

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException("User not found");

    const successUrl = `${this.config.get("frontendUrl")}/apply/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.config.get("frontendUrl")}/certifications/${certificationSlug}`;

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      metadata: { user_id: userId, certification_id: cert.id, application_id: applicationId || "" },
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(cert.price) * 100),
          product_data: { name: `${cert.title} (${cert.acronym}) — PAI Certification`, description: cert.description },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { checkout_url: session.url, session_id: session.id };
  }

  // ─── Course checkout (direct enrollment) ────────────────────────────────────

  async createCourseCheckoutSession(userId: string, courseId: string, promoCode?: string) {
    const courses = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM lms.courses WHERE id = $1 AND status = 'active'`, courseId
    );
    const course = courses[0];
    if (!course) throw new NotFoundException("Course not found");

    // Check not already enrolled
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM lms.course_enrollments WHERE user_id = $1 AND course_id = $2`, userId, courseId
    );
    if (existing.length) throw new BadRequestException("You are already enrolled in this course");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    let price = Number(course.price);
    let promoId: string | undefined;
    let promoDiscount = 0;

    if (promoCode && price > 0) {
      const result = await this.promoCodes.validate(promoCode, price, { courseId });
      if (!result.valid) throw new BadRequestException(result.message);
      promoDiscount = result.discount_amount;
      promoId = result.promo_id;
      price = Math.max(0, price - promoDiscount);
    }

    const frontendUrl = this.config.get("frontendUrl");
    const successUrl = `${frontendUrl}/cart/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/tools`;

    // If price is 0 after discount, enroll directly without Stripe
    if (price <= 0) {
      await this.enrollInCourse(userId, courseId, null, Number(course.price) - promoDiscount);
      if (promoId) await this.promoCodes.incrementUsed(promoId);
      return { checkout_url: null, enrolled: true };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      metadata: {
        user_id: userId,
        checkout_type: "course",
        course_id: courseId,
        promo_id: promoId || "",
        original_price: String(course.price),
      },
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(price * 100),
          product_data: {
            name: course.title,
            description: course.subtitle || course.description || "",
          },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { checkout_url: session.url, session_id: session.id };
  }

  // ─── Certification direct-enrollment checkout ────────────────────────────────

  async createCertificationCheckoutSession(userId: string, certSlug: string, promoCode?: string) {
    const cert = await this.prisma.certification.findUnique({ where: { slug: certSlug } });
    if (!cert || cert.status !== "active") throw new NotFoundException("Certification not found");

    // Check not already enrolled
    const existing = await this.prisma.enrollment.findFirst({
      where: { user_id: userId, certification_id: cert.id, status: { in: ["active", "completed"] } },
    });
    if (existing) throw new BadRequestException("You are already enrolled in this certification");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    let price = Number(cert.price);
    let promoId: string | undefined;
    let promoDiscount = 0;

    if (promoCode && price > 0) {
      const result = await this.promoCodes.validate(promoCode, price, { certificationId: cert.id });
      if (!result.valid) throw new BadRequestException(result.message);
      promoDiscount = result.discount_amount;
      promoId = result.promo_id;
      price = Math.max(0, price - promoDiscount);
    }

    const frontendUrl = this.config.get("frontendUrl");
    const successUrl = `${frontendUrl}/cart/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/certifications`;

    // Free after promo — treat as payment_submitted so admin still reviews
    if (price <= 0) {
      // Search all in-progress statuses (same as webhook) to prevent double-invocation
      // from creating a spurious enrollment on the second call when the first already moved
      // the app out of pending_payment.
      const existingApp = await this.prisma.application.findFirst({
        where: {
          user_id: userId,
          certification_id: cert.id,
          status: { in: ["pending_payment", "payment_submitted", "pending_review"] },
        },
      });
      if (existingApp) {
        if (existingApp.status === "pending_payment") {
          await this.prisma.application.update({
            where: { id: existingApp.id },
            data: {
              status: "payment_submitted",
              amount_paid: 0,
              payment_status: "succeeded",
              paid_at: new Date(),
              promo_code: promoCode,
            },
          });
          if (promoId) await this.promoCodes.incrementUsed(promoId);
        }
        // Already moved (payment_submitted / pending_review) — idempotent, do nothing
        return { checkout_url: null, enrolled: false };
      }
      // No application at all — direct free enrollment (cart used without applying first)
      await this.enrollInCertification(userId, cert.id);
      if (promoId) await this.promoCodes.incrementUsed(promoId);
      return { checkout_url: null, enrolled: true };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      metadata: {
        user_id: userId,
        checkout_type: "certification",
        certification_id: cert.id,
        promo_id: promoId || "",
        promo_code: promoCode || "",
        original_price: String(cert.price),
      },
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: Math.round(price * 100),
          product_data: {
            name: `${cert.title} (${cert.acronym}) — PAI Certification`,
            description: cert.description,
          },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return { checkout_url: session.url, session_id: session.id };
  }

  // ─── Enrollment helpers ──────────────────────────────────────────────────────

  private async enrollInCourse(userId: string, courseId: string, paymentIntentId: string | null, amountPaid: number) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO lms.course_enrollments (id, user_id, course_id, progress_percentage, enrolled_at, stripe_payment_intent_id, amount_paid)
       VALUES (gen_random_uuid(), $1, $2, 0, now(), $3, $4::numeric)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      userId, courseId, paymentIntentId, amountPaid
    );
    this.logger.log(`Course enrollment created: user=${userId} course=${courseId}`);
  }

  private async enrollInCertification(userId: string, certificationId: string) {
    const enrollment = await this.prisma.enrollment.create({
      data: {
        user_id: userId,
        certification_id: certificationId,
        status: "active",
        enrolled_at: new Date(),
        expires_at: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
      },
    });
    this.logger.log(`Certification enrollment created: user=${userId} cert=${certificationId} enrollment=${enrollment.id}`);
    return enrollment;
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>("stripe.webhookSecret");
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret!);
    } catch {
      throw new BadRequestException("Webhook signature verification failed");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        this.logger.log(`Charge refunded: ${charge.id}`);
        break;
      }
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { user_id, checkout_type, certification_id, course_id, application_id, promo_id, promo_code } = session.metadata || {};
    if (!user_id) return;

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const paymentIntentId = session.payment_intent as string | undefined;

    // Retrieve Stripe receipt URL from the charge
    let receiptUrl: string | null = null;
    let chargeId: string | null = null;
    if (paymentIntentId) {
      try {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
        const charge = pi.latest_charge as Stripe.Charge | null;
        receiptUrl = charge?.receipt_url ?? null;
        chargeId = charge?.id ?? null;
      } catch (e) {
        this.logger.warn("Could not retrieve Stripe charge for receipt URL");
      }
    }

    let description = "PAI Enrollment";

    if (checkout_type === "course" && course_id) {
      await this.enrollInCourse(user_id, course_id, paymentIntentId!, amount);
      if (promo_id) await this.promoCodes.incrementUsed(promo_id);
      const rows = await this.prisma.$queryRawUnsafe<any[]>(`SELECT title FROM lms.courses WHERE id = $1`, course_id);
      description = rows[0] ? `Course: ${rows[0].title}` : "Course Enrollment";

    } else if (checkout_type === "certification" && certification_id) {
      // Look for any in-flight application — if one exists, NEVER auto-enroll;
      // admin must verify payment and approve separately.
      const existingApp = await this.prisma.application.findFirst({
        where: {
          user_id,
          certification_id,
          status: { in: ["pending_payment", "payment_submitted", "pending_review"] },
        },
      });

      if (existingApp) {
        if (existingApp.status === "pending_payment") {
          // Move to payment_submitted with Stripe details
          await this.prisma.application.update({
            where: { id: existingApp.id },
            data: {
              status: "payment_submitted",
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              amount_paid: amount || null,
              payment_status: "succeeded",
              paid_at: new Date(),
              promo_code: promo_code || null,
            },
          });
          this.logger.log(`Application ${existingApp.id} payment received, awaiting admin verification`);
        } else {
          // Already at payment_submitted or pending_review — just update Stripe details, don't change status
          await this.prisma.application.update({
            where: { id: existingApp.id },
            data: {
              stripe_checkout_session_id: session.id,
              stripe_payment_intent_id: paymentIntentId,
              amount_paid: amount || null,
              payment_status: "succeeded",
              paid_at: new Date(),
            },
          });
          this.logger.log(`Application ${existingApp.id} already at ${existingApp.status}, Stripe info updated`);
        }
      } else {
        // No application exists — direct cart purchase (no application flow), enroll directly
        await this.enrollInCertification(user_id, certification_id);
      }

      if (promo_id) await this.promoCodes.incrementUsed(promo_id);
      const cert = await this.prisma.certification.findUnique({ where: { id: certification_id } });
      description = cert ? `${cert.acronym} — ${cert.title}` : "Certification Enrollment";

    } else if (application_id) {
      await this.prisma.application.update({
        where: { id: application_id },
        data: {
          status: "payment_submitted",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          amount_paid: amount || null,
          payment_status: "succeeded",
          paid_at: new Date(),
        },
      });
      const app = await this.prisma.application.findUnique({
        where: { id: application_id },
        include: { certification: { select: { title: true, acronym: true } } },
      });
      description = app?.certification
        ? `${app.certification.acronym} — ${app.certification.title} Exam`
        : "Certification Exam";
      this.logger.log(`Application ${application_id} payment confirmed, now pending_review`);
    }

    // Record payment for history + receipts
    if (amount > 0 && paymentIntentId) {
      await this.prisma.payment.upsert({
        where: { stripe_payment_intent_id: paymentIntentId },
        create: {
          user_id,
          type: PaymentType.enrollment,
          status: PaymentStatus.succeeded,
          amount,
          currency: session.currency ?? "usd",
          stripe_payment_intent_id: paymentIntentId,
          stripe_checkout_session_id: session.id,
          stripe_charge_id: chargeId,
          stripe_receipt_url: receiptUrl,
          description,
          succeeded_at: new Date(),
        },
        update: {
          status: PaymentStatus.succeeded,
          stripe_charge_id: chargeId,
          stripe_receipt_url: receiptUrl,
          description,
          succeeded_at: new Date(),
        },
      });
      this.logger.log(`Payment record saved for user ${user_id}: ${description}`);
    }
  }

  async issueRefund(paymentIntentId: string) {
    return this.stripe.refunds.create({ payment_intent: paymentIntentId, reason: "requested_by_customer" });
  }

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({ where: { user_id: userId }, orderBy: { created_at: "desc" } });
  }
}
