import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentType, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PromoCodesService } from "../promo-codes/promo-codes.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private promoCodes: PromoCodesService,
    private mail: MailService,
  ) {
    const stripeKey = config.get<string>("stripe.secretKey");
    if (stripeKey && stripeKey.length > 10) {
      this.stripe = new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" });
    } else {
      this.logger.warn("STRIPE_SECRET_KEY not set or invalid — payments disabled");
    }
  }

  private ensureStripe() {
    if (!this.stripe) {
      throw new BadRequestException(
        "Payment processing is not configured. Please add your Stripe key in Settings → APIs."
      );
    }
  }

  private stripeError(err: any): never {
    const msg = err?.raw?.message || err?.message || "Payment processing failed. Please try again.";
    this.logger.error("Stripe error:", msg);
    throw new BadRequestException(msg);
  }

  // ─── Existing certification checkout (via application) ──────────────────────

  async createCheckoutSession(userId: string, certificationSlug: string, applicationId?: string) {
    this.ensureStripe();
    const cert = await this.prisma.certification.findUnique({ where: { slug: certificationSlug } });
    if (!cert) throw new NotFoundException("Certification not found");

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException("User not found");

    const successUrl = `${this.config.get("frontendUrl")}/apply/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.config.get("frontendUrl")}/certifications/${certificationSlug}`;

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        metadata: { user_id: userId, certification_id: cert.id, application_id: applicationId || "" },
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(cert.price) * 100),
            product_data: { name: `${cert.title} (${cert.acronym}) — PAII Certification`, description: cert.description },
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return { checkout_url: session.url, session_id: session.id };
    } catch (err) { this.stripeError(err); }
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

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException("User not found");

    let price = Number(course.price);
    let promoId: string | undefined;
    let promoDiscount = 0;

    if (promoCode && price > 0) {
      const result = await this.promoCodes.validate(promoCode, price, { courseId, userId });
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
      if (promoId) await this.promoCodes.incrementUsed(promoId, userId);
      await this.mail.sendFreeEnrollmentConfirmation({
        to: user.email,
        firstName: user.profile?.first_name ?? "there",
        itemName: course.title,
        type: "course",
      });
      return { checkout_url: null, enrolled: true };
    }

    this.ensureStripe();
    try {
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
    } catch (err) { this.stripeError(err); }
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

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException("User not found");

    let price = Number(cert.price);
    let promoId: string | undefined;
    let promoDiscount = 0;

    if (promoCode && price > 0) {
      const result = await this.promoCodes.validate(promoCode, price, { certificationId: cert.id, userId });
      if (!result.valid) throw new BadRequestException(result.message);
      promoDiscount = result.discount_amount;
      promoId = result.promo_id;
      price = Math.max(0, price - promoDiscount);
    }

    const frontendUrl = this.config.get("frontendUrl");
    const successUrl = `${frontendUrl}/cart/success?session_id={CHECKOUT_SESSION_ID}&type=certification`;
    const cancelUrl = `${frontendUrl}/certifications`;

    // Free after promo — treat as payment_submitted so admin still reviews
    if (price <= 0) {
      const existingApp = await this.prisma.application.findFirst({
        where: {
          user_id: userId,
          certification_id: cert.id,
          status: { in: ["pending_payment", "payment_submitted", "pending_review"] },
        },
      });

      let alreadyProcessed = false;
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
          if (promoId) await this.promoCodes.incrementUsed(promoId, userId);
        } else {
          // Already at payment_submitted or pending_review — idempotent, skip email
          alreadyProcessed = true;
        }
      } else {
        // No application — cart purchase without /apply form
        const fullName = user.profile
          ? `${user.profile.first_name ?? ""} ${user.profile.last_name ?? ""}`.trim()
          : user.email;
        await this.prisma.application.create({
          data: {
            user_id: userId,
            certification_id: cert.id,
            status: "payment_submitted",
            full_name: fullName || user.email,
            email: user.email,
            amount_paid: 0,
            payment_status: "succeeded",
            paid_at: new Date(),
            promo_code: promoCode || null,
          },
        });
        if (promoId) await this.promoCodes.incrementUsed(promoId, userId);
      }

      if (!alreadyProcessed) {
        await this.mail.sendFreeEnrollmentConfirmation({
          to: user.email,
          firstName: user.profile?.first_name ?? "there",
          itemName: `${cert.title} (${cert.acronym})`,
          type: "certification",
        });
      }

      return { checkout_url: null, enrolled: false };
    }

    this.ensureStripe();
    try {
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
              name: `${cert.title} (${cert.acronym}) — PAII Certification`,
              description: cert.description,
            },
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return { checkout_url: session.url, session_id: session.id };
    } catch (err) { this.stripeError(err); }
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
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        // Both mean the customer never completed payment — same "you weren't charged,
        // here's what to do" notification applies to a timed-out session and a
        // delayed payment method (e.g. bank debit) that came back declined.
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutExpired(session);
        break;
      }
      case "charge.failed":
      case "payment_intent.payment_failed": {
        const obj = event.data.object as Stripe.Charge | Stripe.PaymentIntent;
        this.logger.warn(`${event.type}: ${obj.id} — ${(obj as any).last_payment_error?.message ?? "no reason given"}`);
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    const { user_id } = session.metadata || {};
    if (!user_id) return;
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { email: true, profile: { select: { first_name: true } } },
    });
    if (!user) return;
    const itemName = session.line_items?.data?.[0]?.description ?? "your purchase";
    this.mail.sendPaymentFailed({
      to: user.email,
      firstName: user.profile?.first_name ?? "there",
      itemName,
    }).catch(() => {});
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { user_id, checkout_type, certification_id, course_id, application_id, promo_id, promo_code } = session.metadata || {};
    if (!user_id) return;

    // Idempotency guard — skip if this Stripe session was already processed
    const existing = await this.prisma.payment.findFirst({ where: { stripe_checkout_session_id: session.id } });
    if (existing) {
      this.logger.log(`Webhook idempotency: session ${session.id} already processed, skipping`);
      return;
    }

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

    let description = "PAII Enrollment";

    if (checkout_type === "course" && course_id) {
      await this.enrollInCourse(user_id, course_id, paymentIntentId!, amount);
      if (promo_id) await this.promoCodes.incrementUsed(promo_id, user_id);
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
        // No application on file — cart purchase without the /apply form.
        // Create a minimal application at payment_submitted so admin must review
        // before the student is enrolled, matching the standard application flow.
        const cartUser = await this.prisma.user.findUnique({
          where: { id: user_id },
          include: { profile: true },
        });
        const fullName = cartUser?.profile
          ? `${cartUser.profile.first_name ?? ""} ${cartUser.profile.last_name ?? ""}`.trim()
          : (cartUser?.email ?? "");
        await this.prisma.application.create({
          data: {
            user_id,
            certification_id,
            status: "payment_submitted",
            full_name: fullName || cartUser?.email || "",
            email: cartUser?.email ?? "",
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId ?? null,
            amount_paid: amount || null,
            payment_status: "succeeded",
            paid_at: new Date(),
            promo_code: promo_code || null,
          },
        });
        this.logger.log(`Cart certification purchase by ${user_id} for cert ${certification_id} — application created, awaiting admin review`);
      }

      if (promo_id) await this.promoCodes.incrementUsed(promo_id, user_id);
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

      // Send purchase confirmation email
      const user = await this.prisma.user.findUnique({ where: { id: user_id }, include: { profile: true } });
      if (user) {
        await this.mail.sendPurchaseConfirmation({
          to: user.email,
          firstName: user.profile?.first_name ?? "there",
          itemName: description,
          amount,
          currency: session.currency ?? "usd",
          receiptUrl,
        });

        // Wire up affiliate commission on the actual amount paid (after discount)
        await this._handleAffiliateCommission({
          userId: user_id,
          userEmail: user.email,
          certificationId: certification_id || undefined,
          courseId: course_id || undefined,
          promoId: promo_id || undefined,
          saleAmount: amount,
        });
      }
    }
  }

  private async _handleAffiliateCommission(opts: {
    userId: string;
    userEmail: string;
    certificationId?: string;
    courseId?: string;
    promoId?: string;
    saleAmount: number;
  }) {
    if (opts.saleAmount <= 0) return;

    let affiliateProfileId: string | null = null;
    let leadId: string | null = null;

    // Promo code takes priority — it directly influenced the purchase decision
    if (opts.promoId) {
      const promo = await this.prisma.affiliatePromoCode.findUnique({
        where: { id: opts.promoId },
        select: { affiliate_id: true },
      });
      if (promo?.affiliate_id) affiliateProfileId = promo.affiliate_id;
    }

    // Also check for a referral lead — use it regardless of promo (same or different affiliate)
    const lead = await this.prisma.affiliateLead.findFirst({
      where: { email: opts.userEmail, status: { in: ["registered" as any, "invited" as any] } },
      orderBy: { created_at: "desc" },
    });
    if (lead) {
      leadId = lead.id;
      // Only use lead's affiliate if no promo code affiliate was found
      if (!affiliateProfileId) affiliateProfileId = lead.affiliate_id;
    }

    if (!affiliateProfileId) return;

    // Get base commission rate from affiliate profile
    const affiliateProfile = await this.prisma.affiliateProfile.findUnique({
      where: { id: affiliateProfileId },
      select: { commission_rate: true },
    });
    if (!affiliateProfile) return;

    let commissionRate = Number(affiliateProfile.commission_rate);

    // Check for per-product commission override
    const assignment = await this.prisma.affiliateProductAssignment.findFirst({
      where: {
        affiliate_id: affiliateProfileId,
        ...(opts.certificationId ? { certification_id: opts.certificationId } : {}),
        ...(opts.courseId ? { course_id: opts.courseId } : {}),
      },
      select: { commission_override: true },
    });
    if (assignment?.commission_override != null) {
      commissionRate = Number(assignment.commission_override);
    }

    const commissionAmount = Math.round(opts.saleAmount * commissionRate) / 100;

    await this.prisma.affiliateCommission.create({
      data: {
        affiliate_id: affiliateProfileId,
        user_id: opts.userId,
        lead_id: leadId,
        certification_id: opts.certificationId ?? null,
        course_id: opts.courseId ?? null,
        sale_amount: opts.saleAmount,
        amount: commissionAmount,
        commission_rate: commissionRate,
        status: "pending" as any,
      },
    });

    // Advance lead status to purchased
    if (leadId) {
      await this.prisma.affiliateLead.update({
        where: { id: leadId },
        data: { status: "purchased" as any },
      });
    }

    // Advance the matching invite to converted
    if (lead) {
      await this.prisma.affiliateInvite.updateMany({
        where: { affiliate_id: affiliateProfileId, email: opts.userEmail, status: { in: ["pending" as any, "registered" as any] } },
        data: { status: "converted" as any },
      });
    }

    this.logger.log(
      `Affiliate commission: affiliate=${affiliateProfileId} sale=${opts.saleAmount} rate=${commissionRate}% commission=${commissionAmount}`,
    );
  }

  async issueRefund(paymentIntentId: string) {
    return this.stripe.refunds.create({ payment_intent: paymentIntentId, reason: "requested_by_customer" });
  }

  async getMyPayments(userId: string) {
    return this.prisma.payment.findMany({ where: { user_id: userId }, orderBy: { created_at: "desc" } });
  }

  async getMyOrders(userId: string) {
    const [payments, freeCourses, freeCerts] = await Promise.all([
      this.prisma.payment.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT ce.id, ce.enrolled_at AS date, c.title AS description, 'course' AS item_type
        FROM lms.course_enrollments ce
        JOIN lms.courses c ON c.id = ce.course_id
        WHERE ce.user_id = $1
          AND ce.stripe_payment_intent_id IS NULL
      `, userId),
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT e.id, e.enrolled_at AS date,
               c.title || ' (' || c.acronym || ')' AS description,
               'certification' AS item_type
        FROM lms.enrollments e
        JOIN lms.certifications c ON c.id = e.certification_id
        WHERE e.user_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM lms.payments p
            WHERE p.user_id = e.user_id
              AND p.created_at BETWEEN e.enrolled_at - INTERVAL '5 minutes'
                                   AND e.enrolled_at + INTERVAL '5 minutes'
          )
      `, userId),
    ]);

    const orders: any[] = [
      ...payments.map(p => ({
        id: p.id,
        description: p.description ?? "Payment",
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        date: p.succeeded_at ?? p.created_at,
        stripe_receipt_url: p.stripe_receipt_url,
        source: "payment",
      })),
      ...freeCourses.map((e: any) => ({
        id: e.id,
        description: String(e.description),
        amount: 0,
        currency: "usd",
        status: "succeeded",
        date: e.date,
        stripe_receipt_url: null,
        source: "free",
      })),
      ...freeCerts.map((e: any) => ({
        id: e.id,
        description: String(e.description),
        amount: 0,
        currency: "usd",
        status: "succeeded",
        date: e.date,
        stripe_receipt_url: null,
        source: "free",
      })),
    ];

    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createBillingPortalSession(userId: string) {
    this.ensureStripe();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const frontendUrl = this.config.get("frontendUrl");

    // Find or create Stripe customer by email
    const customers = await this.stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await this.stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${frontendUrl}/profile?tab=payment`,
      });
      return { portal_url: session.url };
    } catch (err) { this.stripeError(err); }
  }

  // ── Admin ────────────────────────────────────────────────────────────────────

  async adminList(query: { page?: string; limit?: string; status?: string; type?: string; search?: string }) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(100, Number(query.limit) || 20);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.type)   where.type   = query.type;
    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: "insensitive" } },
        { stripe_payment_intent_id: { contains: query.search } },
        { user: { email: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, profile: { select: { first_name: true, last_name: true } } } },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data: payments, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminStats() {
    const [totalRevenue, byStatus, byType, monthly] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.succeeded },
      }),
      this.prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ["type"],
        _count: { id: true },
        _sum: { amount: true },
        where: { status: PaymentStatus.succeeded },
      }),
      this.prisma.$queryRawUnsafe<{ month: string; count: string; revenue: string }[]>(`
        SELECT
          TO_CHAR(succeeded_at, 'YYYY-MM') AS month,
          COUNT(*)::text                   AS count,
          COALESCE(SUM(amount), 0)::text   AS revenue
        FROM lms.payments
        WHERE status = 'succeeded'
          AND succeeded_at >= NOW() - INTERVAL '12 months'
        GROUP BY month
        ORDER BY month
      `),
    ]);

    return {
      total_revenue: totalRevenue._sum.amount ?? 0,
      by_status: byStatus,
      by_type: byType,
      monthly: monthly.map((r) => ({ month: r.month, count: Number(r.count), revenue: Number(r.revenue) })),
    };
  }

  async adminRefund(paymentId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== PaymentStatus.succeeded)
      throw new BadRequestException("Only succeeded payments can be refunded");
    if (!payment.stripe_payment_intent_id)
      throw new BadRequestException("No Stripe payment intent linked to this payment");

    const refund = await this.stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: (reason as any) ?? "requested_by_customer",
    });

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.refunded,
        stripe_refund_id: refund.id,
        refund_amount: payment.amount,
        refunded_at: new Date(),
      },
    });
  }
}
