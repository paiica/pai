import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PaymentType, PaymentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PromoCodesService } from "../promo-codes/promo-codes.service";
import { MailService } from "../mail/mail.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { CertificatesService } from "../certificates/certificates.service";
import { PrepCoursesService } from "../prep-courses/prep-courses.service";
import { EventCheckoutDto } from "./dto/checkout.dto";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly envStripe: Stripe | null;
  private readonly envWebhookSecret: string;
  private readonly envPublishableKey: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private promoCodes: PromoCodesService,
    private mail: MailService,
    private settings: SiteSettingsService,
    private certificatesService: CertificatesService,
    private prepCourses: PrepCoursesService,
  ) {
    const stripeKey = config.get<string>("stripe.secretKey");
    this.envStripe = stripeKey && stripeKey.length > 10
      ? new Stripe(stripeKey, { apiVersion: "2025-02-24.acacia" })
      : null;
    this.envWebhookSecret = config.get<string>("stripe.webhookSecret") ?? "";
    this.envPublishableKey = config.get<string>("stripe.publishableKey") ?? "";
    if (!this.envStripe) {
      this.logger.warn("STRIPE_SECRET_KEY not set or invalid — falling back to Settings → APIs at request time");
    }
  }

  // Resolve Stripe client, webhook secret, and publishable key — Settings →
  // APIs takes priority (it's the live, admin-editable source of truth and
  // takes effect immediately without a restart), falling back to the env var
  // only if nothing has been configured there yet. Unlike MailService's
  // env-first pattern, env can't win by default here: a placeholder
  // .env value (e.g. "sk_test_xxxxxxxxxxxx") still passes a basic
  // presence check, so it would otherwise permanently shadow a real key
  // saved via the admin UI.
  private async resolveStripe(): Promise<{ stripe: Stripe; webhookSecret: string; publishableKey: string } | null> {
    const all = await this.settings.getAll();
    const settingsKey = all["stripe_secret_key"];
    if (settingsKey) {
      return {
        stripe: new Stripe(settingsKey, { apiVersion: "2025-02-24.acacia" }),
        webhookSecret: all["stripe_webhook_secret"] || this.envWebhookSecret,
        publishableKey: all["stripe_publishable_key"] || this.envPublishableKey,
      };
    }
    if (this.envStripe) return { stripe: this.envStripe, webhookSecret: this.envWebhookSecret, publishableKey: this.envPublishableKey };
    return null;
  }

  private stripeError(err: any): never {
    const msg = err?.raw?.message || err?.message || "Payment processing failed. Please try again.";
    this.logger.error("Stripe error:", msg);
    throw new BadRequestException(msg);
  }

  // ─── Existing certification checkout (via application) ──────────────────────

  async createCheckoutSession(userId: string, certificationSlug: string, applicationId?: string) {
    const stripeClient = await this.resolveStripe();
    if (!stripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    const { stripe } = stripeClient;
    const cert = await this.prisma.certification.findUnique({ where: { slug: certificationSlug } });
    if (!cert) throw new NotFoundException("Certification not found");

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new NotFoundException("User not found");

    const successUrl = `${this.config.get("frontendUrl")}/apply/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${this.config.get("frontendUrl")}/certifications/${certificationSlug}`;

    try {
      const session = await stripe.checkout.sessions.create({
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

    await this.prepCourses.assertPrerequisitesMet(userId, courseId);

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

    const courseStripeClient = await this.resolveStripe();
    if (!courseStripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    try {
      const session = await courseStripeClient.stripe.checkout.sessions.create({
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

    const certStripeClient = await this.resolveStripe();
    if (!certStripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    try {
      const session = await certStripeClient.stripe.checkout.sessions.create({
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

  // ─── Certificate renewal checkout ────────────────────────────────────────

  async createRenewalCheckoutSession(userId: string, certificateId: string) {
    const progress = await this.certificatesService.getRenewalProgress(certificateId, userId);
    if (!progress.eligible) {
      throw new BadRequestException(
        progress.pdu_earned < progress.pdu_required
          ? `You need ${progress.pdu_required - progress.pdu_earned} more PDU(s) to renew this certificate.`
          : "This certificate is not currently eligible for renewal.",
      );
    }

    const cert = await this.prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!cert) throw new NotFoundException("Certificate not found");

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const price = Number(progress.fee);
    const frontendUrl = this.config.get("frontendUrl");
    // The detail page's [certId] route param is actually the certification_id
    // (it looks up the issued certificate within that program), not the
    // Certificate row's own id — route accordingly.
    const successUrl = `${frontendUrl}/certificates/${cert.certification_id}?renewed=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/certificates/${cert.certification_id}`;

    const renewalStripeClient = await this.resolveStripe();
    if (!renewalStripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    try {
      const session = await renewalStripeClient.stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        metadata: {
          user_id: userId,
          checkout_type: "renewal",
          certificate_id: cert.id,
          original_price: String(price),
        },
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Math.round(price * 100),
            product_data: {
              name: `${cert.certification_acronym} — Certificate Renewal`,
              description: `Renews ${cert.certification_title} (${cert.certificate_number})`,
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

  async createRetakeCheckoutSession(userId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, user_id: userId },
      include: { certification: true },
    });
    if (!enrollment) throw new NotFoundException("Enrollment not found");

    const attemptCount = await this.prisma.examAttempt.count({ where: { enrollment_id: enrollmentId } });
    const maxAttempts = enrollment.certification.max_retakes_included + 1;
    if (attemptCount >= maxAttempts) {
      throw new BadRequestException("This certification's retakes are exhausted — you'll need to register again to continue.");
    }
    if (enrollment.paid_retakes >= attemptCount) {
      throw new BadRequestException("You already have a paid retake available — no need to purchase another.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const price = Number(enrollment.certification.retake_fee);
    const frontendUrl = this.config.get("frontendUrl");
    const successUrl = `${frontendUrl}/certificates/${enrollment.certification_id}?retake_purchased=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/certificates/${enrollment.certification_id}`;

    const retakeStripeClient = await this.resolveStripe();
    if (!retakeStripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    try {
      const session = await retakeStripeClient.stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        metadata: {
          user_id: userId,
          checkout_type: "retake",
          enrollment_id: enrollment.id,
          original_price: String(price),
        },
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: Math.round(price * 100),
            product_data: {
              name: `${enrollment.certification.acronym} — Exam Retake`,
              description: `Retake fee for ${enrollment.certification.title}`,
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

  // ─── Event checkout (guest — no account required) ────────────────────────────

  async createEventCheckoutSession(dto: EventCheckoutDto) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.event_id } });
    if (!event || event.status !== "published") throw new NotFoundException("Event not found");

    let price = Number(event.price);
    if (price <= 0) throw new BadRequestException("This event is free — register directly instead of checking out");

    const existing = await this.prisma.eventRegistration.findUnique({
      where: { event_id_email: { event_id: event.id, email: dto.email } },
    });
    if (existing && existing.status === "registered") {
      throw new BadRequestException("This email is already registered for this event");
    }

    let promoId: string | undefined;
    if (dto.promo_code) {
      // Promo codes aren't scoped to events (no event_id column on promo_codes)
      // — a general/unscoped code applies fine, one scoped to a course or
      // certification correctly fails validation here.
      const result = await this.promoCodes.validate(dto.promo_code, price);
      if (!result.valid) throw new BadRequestException(result.message);
      price = Math.max(0, price - result.discount_amount);
      promoId = result.promo_id;
    }

    const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";
    const returnUrl = `${marketingUrl}/events/${event.slug}?registered=1&session_id={CHECKOUT_SESSION_ID}`;

    const eventStripeClient = await this.resolveStripe();
    if (!eventStripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    try {
      // Embedded Checkout — renders inline on the event page via an iframe
      // instead of redirecting to a Stripe-hosted page. Fulfillment is
      // unchanged: this is still a Checkout Session under the hood, so the
      // existing checkout.session.completed webhook handling applies as-is.
      const session = await eventStripeClient.stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded",
        customer_email: dto.email,
        metadata: {
          checkout_type: "event",
          event_id: event.id,
          guest_name: dto.name,
          guest_email: dto.email,
          guest_phone: dto.phone || "",
          guest_address_line1: dto.address_line1,
          guest_city: dto.city,
          guest_state_province: dto.state_province,
          guest_postal_code: dto.postal_code,
          guest_country: dto.country,
          guest_profession: dto.profession,
          guest_job_title: dto.job_title,
          guest_education: dto.education,
          guest_years_experience: String(dto.years_experience),
          promo_id: promoId || "",
          promo_code: dto.promo_code || "",
          original_price: String(event.price),
        },
        line_items: [{
          price_data: {
            currency: event.currency,
            unit_amount: Math.round(price * 100),
            product_data: { name: event.title, description: event.summary || event.subtitle || "" },
          },
          quantity: 1,
        }],
        return_url: returnUrl,
      });
      return {
        client_secret: session.client_secret,
        publishable_key: eventStripeClient.publishableKey,
        session_id: session.id,
      };
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
    const certification = await this.prisma.certification.findUniqueOrThrow({
      where: { id: certificationId },
      select: { registration_validity_days: true },
    });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + certification.registration_validity_days * 24 * 60 * 60 * 1000);

    // upsert (not create) — a student whose prior enrollment lapsed into
    // registration_expired or retake_expired pays and registers again on the
    // SAME row (the [user_id, certification_id] unique constraint means
    // there's only ever one enrollment per student per certification).
    const enrollment = await this.prisma.enrollment.upsert({
      where: { user_id_certification_id: { user_id: userId, certification_id: certificationId } },
      create: {
        user_id: userId,
        certification_id: certificationId,
        status: "active",
        enrolled_at: now,
        expires_at: expiresAt,
      },
      update: {
        status: "active",
        enrolled_at: now,
        expires_at: expiresAt,
        completed_at: null,
      },
    });
    this.logger.log(`Certification enrollment created: user=${userId} cert=${certificationId} enrollment=${enrollment.id}`);
    return enrollment;
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    const stripeClient = await this.resolveStripe();
    if (!stripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    let event: Stripe.Event;

    try {
      event = stripeClient.stripe.webhooks.constructEvent(rawBody, signature, stripeClient.webhookSecret);
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

  private async handleEventCheckoutCompleted(session: Stripe.Checkout.Session) {
    const {
      event_id, guest_name, guest_email, guest_phone, promo_id,
      guest_address_line1, guest_city, guest_state_province, guest_postal_code, guest_country,
      guest_profession, guest_job_title, guest_education, guest_years_experience,
    } = session.metadata || {};
    if (!event_id || !guest_email) return;

    const existing = await this.prisma.eventRegistration.findUnique({
      where: { event_id_email: { event_id, email: guest_email } },
    });
    if (existing?.stripe_checkout_session_id === session.id) {
      this.logger.log(`Webhook idempotency: event session ${session.id} already processed, skipping`);
      return;
    }

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const paymentIntentId = session.payment_intent as string | undefined;

    // Retrieve Stripe's own hosted receipt URL from the charge, same as the
    // account-based checkout flows, so guests get a real receipt too.
    let receiptUrl: string | null = null;
    const eventWebhookStripeClient = await this.resolveStripe();
    if (paymentIntentId && eventWebhookStripeClient) {
      try {
        const pi = await eventWebhookStripeClient.stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
        const charge = pi.latest_charge as Stripe.Charge | null;
        receiptUrl = charge?.receipt_url ?? null;
      } catch {
        this.logger.warn("Could not retrieve Stripe charge for event registration receipt URL");
      }
    }

    const event = await this.prisma.event.findUnique({ where: { id: event_id } });
    if (!event) return;

    const yearsExperience = guest_years_experience ? parseInt(guest_years_experience, 10) : null;

    await this.prisma.eventRegistration.upsert({
      where: { event_id_email: { event_id, email: guest_email } },
      create: {
        event_id,
        name: guest_name || guest_email,
        email: guest_email,
        phone: guest_phone || null,
        address_line1: guest_address_line1 || null,
        city: guest_city || null,
        state_province: guest_state_province || null,
        postal_code: guest_postal_code || null,
        country: guest_country || null,
        profession: guest_profession || null,
        job_title: guest_job_title || null,
        education: guest_education || null,
        years_experience: yearsExperience,
        status: "registered",
        amount_paid: amount,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        stripe_receipt_url: receiptUrl,
      },
      update: {
        name: guest_name || guest_email,
        phone: guest_phone || null,
        address_line1: guest_address_line1 || null,
        city: guest_city || null,
        state_province: guest_state_province || null,
        postal_code: guest_postal_code || null,
        country: guest_country || null,
        profession: guest_profession || null,
        job_title: guest_job_title || null,
        education: guest_education || null,
        years_experience: yearsExperience,
        status: "registered",
        amount_paid: amount,
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        stripe_receipt_url: receiptUrl,
      },
    });

    if (promo_id) await this.promoCodes.incrementUsed(promo_id);

    const opts: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" };
    const eventDate = `${event.start_at.toLocaleString("en-CA", opts)} – ${event.end_at.toLocaleString("en-CA", { timeStyle: "short" })} (${event.timezone})`;

    await this.mail.sendEventRegistrationConfirmed({
      to: guest_email,
      name: guest_name || guest_email,
      eventTitle: event.title,
      eventDate,
      location: event.event_type === "in_person" ? (event.location_address ?? "In person") : "Online",
      meetingLink: event.event_type !== "in_person" ? event.meeting_link ?? undefined : undefined,
      amountPaid: amount,
      currency: event.currency,
      receiptUrl,
    });

    this.logger.log(`Event registration paid & confirmed for ${guest_email} — event ${event_id}`);
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { user_id, checkout_type, certification_id, course_id, certificate_id, application_id, enrollment_id, promo_id, promo_code } = session.metadata || {};

    // Guest event registration — no user_id, handled entirely separately from
    // the account-based flows below (no Payment record, no affiliate
    // commission; the EventRegistration row itself carries the Stripe IDs).
    if (checkout_type === "event") {
      await this.handleEventCheckoutCompleted(session);
      return;
    }

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
    const webhookStripeClient = await this.resolveStripe();
    if (paymentIntentId && webhookStripeClient) {
      try {
        const pi = await webhookStripeClient.stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
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

    } else if (checkout_type === "renewal" && certificate_id) {
      const renewed = await this.certificatesService.renew(certificate_id, user_id, paymentIntentId!, amount);
      description = `Certificate Renewal: ${renewed.certification_acronym} — ${renewed.certification_title}`;

    } else if (checkout_type === "retake" && enrollment_id) {
      const enrollment = await this.prisma.enrollment.update({
        where: { id: enrollment_id },
        data: { paid_retakes: { increment: 1 } },
        include: { certification: { select: { title: true, acronym: true } } },
      });
      description = `Exam Retake: ${enrollment.certification.acronym} — ${enrollment.certification.title}`;
      this.logger.log(`Retake paid for enrollment ${enrollment_id}, paid_retakes now ${enrollment.paid_retakes}`);

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
          type: checkout_type === "renewal" ? PaymentType.renewal_fee
            : checkout_type === "retake" ? PaymentType.retake_fee
            : PaymentType.enrollment,
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
          promoCode: promo_code || undefined,
          saleAmount: amount,
          paymentIntentId: paymentIntentId || undefined,
        });
      }
    }
  }

  // Normalizes an email for same-person detection (lowercase, strip a
  // plus-addressed suffix from the local part) — used only to block a rep
  // from earning commission on their own purchases via an alt address, not
  // as a general identity match.
  private normalizeEmailForSelfCheck(email: string): string {
    const [local, domain] = email.toLowerCase().trim().split("@");
    if (!domain) return email.toLowerCase().trim();
    return `${local.split("+")[0]}@${domain}`;
  }

  private async _handleAffiliateCommission(opts: {
    userId: string;
    userEmail: string;
    certificationId?: string;
    courseId?: string;
    promoId?: string;
    promoCode?: string;
    saleAmount: number;
    paymentIntentId?: string;
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

    // Also check for a referral lead — use it regardless of promo (same or
    // different affiliate). Matched by user_id first (the permanent link set
    // at email verification) falling back to email, with NO status filter —
    // a lead that already converted once must still match on every future
    // purchase, otherwise the referring rep only ever gets paid on the
    // customer's first sale.
    const lead = await this.prisma.affiliateLead.findFirst({
      where: { OR: [{ user_id: opts.userId }, { email: opts.userEmail }] },
      orderBy: { created_at: "desc" },
    });
    if (lead) {
      leadId = lead.id;
      // Only use lead's affiliate if no promo code affiliate was found
      if (!affiliateProfileId) affiliateProfileId = lead.affiliate_id;
    }

    if (!affiliateProfileId) return;

    // Get base commission rate + status + owner email from affiliate profile
    const affiliateProfile = await this.prisma.affiliateProfile.findUnique({
      where: { id: affiliateProfileId },
      select: { commission_rate: true, status: true, user: { select: { email: true } } },
    });
    if (!affiliateProfile) return;

    // A suspended/pending rep's old links or promo codes shouldn't keep
    // generating payable commissions.
    if (affiliateProfile.status !== "approved") {
      this.logger.warn(`Skipped commission for affiliate=${affiliateProfileId}: profile status is ${affiliateProfile.status}, not approved`);
      return;
    }

    // Self-referral guard — a rep buying under their own (possibly
    // plus-addressed) alt account shouldn't earn commission on themselves.
    if (this.normalizeEmailForSelfCheck(affiliateProfile.user.email) === this.normalizeEmailForSelfCheck(opts.userEmail)) {
      this.logger.warn(`Skipped commission for affiliate=${affiliateProfileId}: purchaser email matches the affiliate's own account (self-referral)`);
      return;
    }

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
        promo_code: opts.promoCode ?? null,
        stripe_payment_intent_id: opts.paymentIntentId ?? null,
        status: "pending" as any,
      },
    });

    // Advance lead status to purchased (informational — no longer gates
    // future commission lookups, see the query above)
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
    const stripeClient = await this.resolveStripe();
    if (!stripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    return stripeClient.stripe.refunds.create({ payment_intent: paymentIntentId, reason: "requested_by_customer" });
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
    const stripeClient = await this.resolveStripe();
    if (!stripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    const { stripe } = stripeClient;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const frontendUrl = this.config.get("frontendUrl");

    // Find or create Stripe customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
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

    const stripeClient = await this.resolveStripe();
    if (!stripeClient) throw new BadRequestException("Payment processing is not configured. Please add your Stripe key in Settings → APIs.");
    const refund = await stripeClient.stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      reason: (reason as any) ?? "requested_by_customer",
    });

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.refunded,
        stripe_refund_id: refund.id,
        refund_amount: payment.amount,
        refunded_at: new Date(),
      },
    });

    // Void any commission this payment generated — a refunded sale
    // shouldn't leave the referring rep with a payable/paid commission.
    const commission = await this.prisma.affiliateCommission.findUnique({
      where: { stripe_payment_intent_id: payment.stripe_payment_intent_id },
    });
    if (commission && commission.status !== "voided") {
      await this.prisma.affiliateCommission.update({
        where: { id: commission.id },
        data: {
          status: "voided",
          voided_at: new Date(),
          void_reason: reason ? `Payment refunded: ${reason}` : "Payment refunded",
        },
      });
      this.logger.log(`Voided commission ${commission.id} — underlying payment ${paymentId} was refunded`);
    }

    return updated;
  }
}
