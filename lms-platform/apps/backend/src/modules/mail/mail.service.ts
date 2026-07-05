import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { SiteSettingsService } from "../site-settings/site-settings.service";

export interface TemplateDefault {
  key: string;
  name: string;
  defaultSubject: string;
  variables: string[];
  defaultBody: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly envResend: Resend | null;
  private readonly envFrom: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService, private settings: SiteSettingsService) {
    const apiKey = config.get<string>("RESEND_API_KEY");
    this.envResend = apiKey ? new Resend(apiKey) : null;
    const fromName = config.get<string>("EMAIL_FROM_NAME", "Professional Artificial Intelligence Institute");
    const fromAddr = config.get<string>("EMAIL_FROM", "noreply@paii.ca");
    this.envFrom = `${fromName} <${fromAddr}>`;
    this.frontendUrl = config.get<string>("FRONTEND_URL", "http://localhost:3001");
  }

  // Resolve Resend client and from address — env takes priority, then site settings
  private async resolveClient(): Promise<{ resend: Resend; from: string } | null> {
    if (this.envResend) return { resend: this.envResend, from: this.envFrom };
    const all = await this.settings.getAll();
    const key = all["resend_api_key"];
    if (!key) return null;
    const fromName = all["email_from_name"] || "Professional Artificial Intelligence Institute";
    const fromAddr = all["email_from"]      || "noreply@paii.ca";
    return { resend: new Resend(key), from: `${fromName} <${fromAddr}>` };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async tpl(key: string): Promise<{ subject: string | null; enabled: boolean; html: string | null }> {
    const all = await this.settings.getAll();
    return {
      subject: all[`email_tpl_${key}_subject`] || null,
      enabled: all[`email_tpl_${key}_enabled`] !== "false",
      html: all[`email_tpl_${key}_html`] || null,
    };
  }

  private applyVars(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (html, [k, v]) => html.replace(new RegExp(`{{${k}}}`, "g"), v),
      template,
    );
  }

  private async send(opts: { to: string; subject: string; html: string }): Promise<{ sent: boolean; reason?: string }> {
    const client = await this.resolveClient();
    if (!client) {
      this.logger.warn(`[Mail skipped — no RESEND_API_KEY] To: ${opts.to} | ${opts.subject}`);
      return { sent: false, reason: "No Resend API key configured (env or site settings)" };
    }
    try {
      await client.resend.emails.send({ from: client.from, ...opts });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err?.message}`);
      return { sent: false, reason: err?.message ?? "Unknown error" };
    }
  }

  // ─── Send methods ─────────────────────────────────────────────────────────────

  async sendVerificationEmail(to: string, firstName: string, token: string, baseUrl?: string) {
    const { subject, enabled, html: customHtml } = await this.tpl("verification");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const link = `${baseUrl ?? this.frontendUrl}/verify-email?token=${token}`;
    const html = customHtml
      ? this.applyVars(customHtml, { firstName, link })
      : this.wrapper(this.verificationBody(firstName, link));
    return this.send({ to, subject: subject ?? "Verify your PAII email address", html });
  }

  async sendPasswordResetEmail(to: string, firstName: string, token: string, baseUrl?: string) {
    const { subject, enabled, html: customHtml } = await this.tpl("reset");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const link = `${baseUrl ?? this.frontendUrl}/reset-password?token=${token}`;
    const html = customHtml
      ? this.applyVars(customHtml, { firstName, link })
      : this.wrapper(this.resetBody(firstName, link));
    return this.send({ to, subject: subject ?? "Reset your PAII password", html });
  }

  async sendPurchaseConfirmation(opts: {
    to: string; firstName: string; itemName: string;
    amount: number; currency: string; receiptUrl: string | null;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("purchase");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Payment confirmed — {item}").replace("{item}", opts.itemName);
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: opts.currency.toUpperCase() }).format(opts.amount);
    const html = customHtml
      ? this.applyVars(customHtml, { firstName: opts.firstName, itemName: opts.itemName, amount: formatted, receiptLink: opts.receiptUrl ?? "#" })
      : this.wrapper(this.purchaseBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendFreeEnrollmentConfirmation(opts: {
    to: string; firstName: string; itemName: string; type: "course" | "certification";
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("free_enrollment");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "You're enrolled — {item}").replace("{item}", opts.itemName);
    const html = customHtml
      ? this.applyVars(customHtml, { firstName: opts.firstName, itemName: opts.itemName })
      : this.wrapper(this.freeEnrollmentBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendCertificateIssued(opts: {
    to: string; firstName: string; certTitle: string; certAcronym: string;
    certNumber: string; expiresAt: Date; verificationUrl: string;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("certificate");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Congratulations — You've earned your {acronym} certificate!").replace("{acronym}", opts.certAcronym);
    const expiresAtStr = opts.expiresAt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
    const html = customHtml
      ? this.applyVars(customHtml, {
          firstName: opts.firstName, certTitle: opts.certTitle, certAcronym: opts.certAcronym,
          certNumber: opts.certNumber, expiresAt: expiresAtStr, verificationUrl: opts.verificationUrl,
        })
      : this.wrapper(this.certificateBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendExamBooked(opts: {
    to: string; firstName: string; certTitle: string;
    sessionTitle: string; examDate: string; meetingLink: string | null;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("exam_booked");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Exam booked — {certTitle}").replace("{certTitle}", opts.certTitle);
    const html = customHtml
      ? this.applyVars(customHtml, {
          firstName: opts.firstName, certTitle: opts.certTitle, sessionTitle: opts.sessionTitle,
          examDate: opts.examDate, meetingLink: opts.meetingLink ?? "See your portal for details",
        })
      : this.wrapper(this.examBookedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendExamReminder(opts: {
    to: string; firstName: string; certTitle: string;
    sessionTitle: string; examDate: string; meetingLink: string | null;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("exam_reminder");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Reminder: Your {certTitle} exam is tomorrow").replace("{certTitle}", opts.certTitle);
    const html = customHtml
      ? this.applyVars(customHtml, {
          firstName: opts.firstName, certTitle: opts.certTitle, sessionTitle: opts.sessionTitle,
          examDate: opts.examDate, meetingLink: opts.meetingLink ?? "See your portal for details",
        })
      : this.wrapper(this.examReminderBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendExamPassed(opts: {
    to: string; firstName: string; certTitle: string; score: number;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("exam_passed");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "You passed your {certTitle} exam!").replace("{certTitle}", opts.certTitle);
    const html = customHtml
      ? this.applyVars(customHtml, { firstName: opts.firstName, certTitle: opts.certTitle, score: `${opts.score}%` })
      : this.wrapper(this.examPassedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendExamFailed(opts: {
    to: string; firstName: string; certTitle: string; score: number; attemptsLeft: number;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("exam_failed");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Exam result — {certTitle}").replace("{certTitle}", opts.certTitle);
    const html = customHtml
      ? this.applyVars(customHtml, {
          firstName: opts.firstName, certTitle: opts.certTitle,
          score: `${opts.score}%`, attemptsLeft: `${opts.attemptsLeft}`,
        })
      : this.wrapper(this.examFailedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendPaymentFailed(opts: {
    to: string; firstName: string; itemName: string;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("payment_failed");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Payment failed — {item}").replace("{item}", opts.itemName);
    const html = customHtml
      ? this.applyVars(customHtml, { firstName: opts.firstName, itemName: opts.itemName })
      : this.wrapper(this.paymentFailedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendCertificateRevoked(opts: {
    to: string; firstName: string; certTitle: string; certAcronym: string; certNumber: string;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("certificate_revoked");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Important: Your {acronym} certificate has been revoked").replace("{acronym}", opts.certAcronym);
    const html = customHtml
      ? this.applyVars(customHtml, {
          firstName: opts.firstName, certTitle: opts.certTitle,
          certAcronym: opts.certAcronym, certNumber: opts.certNumber,
        })
      : this.wrapper(this.certificateRevokedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendApplicationApproved(opts: {
    to: string; firstName: string; certTitle: string; certAcronym: string;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("application_approved");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Your {acronym} application has been approved!").replace("{acronym}", opts.certAcronym);
    const html = customHtml
      ? this.applyVars(customHtml, { firstName: opts.firstName, certTitle: opts.certTitle, certAcronym: opts.certAcronym })
      : this.wrapper(this.applicationApprovedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  async sendTestEmail(to: string) {
    const client = await this.resolveClient();
    if (!client) return { sent: false, reason: "No Resend API key configured (env or site settings)" };
    try {
      await client.resend.emails.send({
        from: client.from,
        to,
        subject: "PAII — Test Email",
        html: this.wrapper(`
          <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Test Email</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your Resend integration is working correctly. Emails will be delivered from <strong>${client.from}</strong>.</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px">
            <p style="margin:0;font-size:13px;color:#15803d;font-weight:600">✓ Resend API key is valid and email delivery is active.</p>
          </div>
        `),
      });
      this.logger.log(`Test email sent to ${to}`);
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`Test email failed: ${err?.message}`);
      return { sent: false, reason: err?.message ?? "Unknown error" };
    }
  }

  async sendAffiliateInvite(opts: {
    to: string; recipientName: string | undefined;
    senderName: string; inviteLink: string;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("affiliate_invite");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const firstName = opts.recipientName || "there";
    const html = customHtml
      ? this.applyVars(customHtml, { firstName, senderName: opts.senderName, inviteLink: opts.inviteLink })
      : this.wrapper(this.affiliateInviteBody(opts.senderName, firstName, opts.inviteLink));
    return this.send({ to: opts.to, subject: subject ?? `${opts.senderName} invited you to join PAII`, html });
  }

  async sendApplicationRejected(opts: {
    to: string; firstName: string; certTitle: string; certAcronym: string; reason: string | null;
  }) {
    const { subject, enabled, html: customHtml } = await this.tpl("application_rejected");
    if (!enabled) return { sent: false, reason: "This template is disabled" };
    const resolvedSubject = (subject ?? "Update on your {acronym} application").replace("{acronym}", opts.certAcronym);
    const html = customHtml
      ? this.applyVars(customHtml, {
          firstName: opts.firstName, certTitle: opts.certTitle, certAcronym: opts.certAcronym,
          reason: opts.reason ?? "No reason provided.",
        })
      : this.wrapper(this.applicationRejectedBody(opts));
    return this.send({ to: opts.to, subject: resolvedSubject, html });
  }

  // ─── Per-template test send (admin) ───────────────────────────────────────────

  async sendTemplateTest(key: string, to: string): Promise<{ sent: boolean; reason?: string }> {
    const sampleDate = "Monday, Jan 27 2026 at 10:00 AM EST";
    const sampleCert = { certTitle: "Certified AI Professional", certAcronym: "CAIP", certNumber: "PAII-CAIP-2026-ABCD12" };
    const sampleExpiry = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

    switch (key) {
      case "verification":
        return this.sendVerificationEmail(to, "John", "sample-test-token");
      case "reset":
        return this.sendPasswordResetEmail(to, "John", "sample-test-token");
      case "purchase":
        return this.sendPurchaseConfirmation({ to, firstName: "John", itemName: sampleCert.certTitle, amount: 299, currency: "usd", receiptUrl: "https://stripe.com/receipt" });
      case "free_enrollment":
        return this.sendFreeEnrollmentConfirmation({ to, firstName: "John", itemName: sampleCert.certTitle, type: "certification" });
      case "certificate":
        return this.sendCertificateIssued({ to, firstName: "John", ...sampleCert, expiresAt: sampleExpiry, verificationUrl: `https://paii.ca/verify?id=${sampleCert.certNumber}` });
      case "exam_booked":
        return this.sendExamBooked({ to, firstName: "John", certTitle: sampleCert.certTitle, sessionTitle: "CAIP — Session A", examDate: sampleDate, meetingLink: "https://meet.example.com/exam" });
      case "exam_reminder":
        return this.sendExamReminder({ to, firstName: "John", certTitle: sampleCert.certTitle, sessionTitle: "CAIP — Session A", examDate: sampleDate, meetingLink: "https://meet.example.com/exam" });
      case "exam_passed":
        return this.sendExamPassed({ to, firstName: "John", certTitle: sampleCert.certTitle, score: 85 });
      case "exam_failed":
        return this.sendExamFailed({ to, firstName: "John", certTitle: sampleCert.certTitle, score: 58, attemptsLeft: 1 });
      case "payment_failed":
        return this.sendPaymentFailed({ to, firstName: "John", itemName: sampleCert.certTitle });
      case "certificate_revoked":
        return this.sendCertificateRevoked({ to, firstName: "John", ...sampleCert });
      case "application_approved":
        return this.sendApplicationApproved({ to, firstName: "John", certTitle: sampleCert.certTitle, certAcronym: sampleCert.certAcronym });
      case "application_rejected":
        return this.sendApplicationRejected({ to, firstName: "John", certTitle: sampleCert.certTitle, certAcronym: sampleCert.certAcronym, reason: "Sample reason for testing." });
      case "affiliate_invite":
        return this.sendAffiliateInvite({ to, recipientName: "John", senderName: "Jane Rep", inviteLink: `${this.frontendUrl}/register?ref=SAMPLE` });
      default:
        return { sent: false, reason: `Unknown template: ${key}` };
    }
  }

  // ─── Admin: default template bodies ──────────────────────────────────────────

  getDefaultTemplates(): TemplateDefault[] {
    const sampleDate = "Monday, Jan 27 2026 at 10:00 AM EST";
    const sampleCert = { certTitle: "Certified AI Professional", certAcronym: "CAIP", certNumber: "PAII-CAIP-2026-ABCD12" };
    const sampleExpiry = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
    return [
      {
        key: "verification", name: "Email Verification",
        defaultSubject: "Verify your PAII email address",
        variables: ["{{firstName}}", "{{link}}"],
        defaultBody: this.verificationBody("John", `${this.frontendUrl}/verify-email?token=sample`),
      },
      {
        key: "reset", name: "Password Reset",
        defaultSubject: "Reset your PAII password",
        variables: ["{{firstName}}", "{{link}}"],
        defaultBody: this.resetBody("John", `${this.frontendUrl}/reset-password?token=sample`),
      },
      {
        key: "purchase", name: "Purchase Confirmation",
        defaultSubject: "Payment confirmed — {item}",
        variables: ["{{firstName}}", "{{itemName}}", "{{amount}}", "{{receiptLink}}"],
        defaultBody: this.purchaseBody({ firstName: "John", itemName: sampleCert.certTitle, amount: 299, currency: "usd", receiptUrl: "https://stripe.com/receipt" }),
      },
      {
        key: "free_enrollment", name: "Free Enrollment",
        defaultSubject: "You're enrolled — {item}",
        variables: ["{{firstName}}", "{{itemName}}"],
        defaultBody: this.freeEnrollmentBody({ firstName: "John", itemName: sampleCert.certTitle, type: "certification" }),
      },
      {
        key: "certificate", name: "Certificate Issued",
        defaultSubject: "Congratulations — You've earned your {acronym} certificate!",
        variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}", "{{certNumber}}", "{{expiresAt}}", "{{verificationUrl}}"],
        defaultBody: this.certificateBody({ firstName: "John", ...sampleCert, expiresAt: sampleExpiry, verificationUrl: `https://paii.ca/verify?id=${sampleCert.certNumber}` }),
      },
      {
        key: "exam_booked", name: "Exam Booked",
        defaultSubject: "Exam booked — {certTitle}",
        variables: ["{{firstName}}", "{{certTitle}}", "{{sessionTitle}}", "{{examDate}}", "{{meetingLink}}"],
        defaultBody: this.examBookedBody({ firstName: "John", ...sampleCert, sessionTitle: "CAIP — Session A", examDate: sampleDate, meetingLink: "https://meet.example.com/exam" }),
      },
      {
        key: "exam_reminder", name: "Exam Reminder (24h Before)",
        defaultSubject: "Reminder: Your {certTitle} exam is tomorrow",
        variables: ["{{firstName}}", "{{certTitle}}", "{{sessionTitle}}", "{{examDate}}", "{{meetingLink}}"],
        defaultBody: this.examReminderBody({ firstName: "John", ...sampleCert, sessionTitle: "CAIP — Session A", examDate: sampleDate, meetingLink: "https://meet.example.com/exam" }),
      },
      {
        key: "exam_passed", name: "Exam Passed",
        defaultSubject: "You passed your {certTitle} exam!",
        variables: ["{{firstName}}", "{{certTitle}}", "{{score}}"],
        defaultBody: this.examPassedBody({ firstName: "John", certTitle: sampleCert.certTitle, score: 85 }),
      },
      {
        key: "exam_failed", name: "Exam Failed",
        defaultSubject: "Exam result — {certTitle}",
        variables: ["{{firstName}}", "{{certTitle}}", "{{score}}", "{{attemptsLeft}}"],
        defaultBody: this.examFailedBody({ firstName: "John", certTitle: sampleCert.certTitle, score: 58, attemptsLeft: 1 }),
      },
      {
        key: "payment_failed", name: "Payment Failed",
        defaultSubject: "Payment failed — {item}",
        variables: ["{{firstName}}", "{{itemName}}"],
        defaultBody: this.paymentFailedBody({ firstName: "John", itemName: sampleCert.certTitle }),
      },
      {
        key: "certificate_revoked", name: "Certificate Revoked",
        defaultSubject: "Important: Your {acronym} certificate has been revoked",
        variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}", "{{certNumber}}"],
        defaultBody: this.certificateRevokedBody({ firstName: "John", ...sampleCert }),
      },
      {
        key: "application_approved", name: "Application Approved",
        defaultSubject: "Your {acronym} application has been approved!",
        variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}"],
        defaultBody: this.applicationApprovedBody({ firstName: "John", certTitle: sampleCert.certTitle, certAcronym: sampleCert.certAcronym }),
      },
      {
        key: "application_rejected", name: "Application Rejected",
        defaultSubject: "Update on your {acronym} application",
        variables: ["{{firstName}}", "{{certTitle}}", "{{certAcronym}}", "{{reason}}"],
        defaultBody: this.applicationRejectedBody({ firstName: "John", certTitle: sampleCert.certTitle, certAcronym: sampleCert.certAcronym, reason: "You do not meet the minimum years of experience requirement." }),
      },
    ];
  }

  // ─── Body templates ───────────────────────────────────────────────────────────

  private verificationBody(firstName: string, link: string): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Thanks for creating your PAII account. Please verify your email address to activate your learning portal.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">Verify Email Address</a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6">Or copy this link into your browser:</p>
      <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;word-break:break-all">${link}</p>
      <p style="margin:0;font-size:13px;color:#94a3b8">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
    `;
  }

  private resetBody(firstName: string, link: string): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">We received a request to reset your PAII account password. Click the button below to choose a new password.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">Reset Password</a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;line-height:1.6">Or copy this link into your browser:</p>
      <p style="margin:0 0 24px;font-size:12px;color:#94a3b8;word-break:break-all">${link}</p>
      <p style="margin:0;font-size:13px;color:#94a3b8">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will not be changed.</p>
    `;
  }

  private purchaseBody(opts: { firstName: string; itemName: string; amount: number; currency: string; receiptUrl: string | null }): string {
    const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency: opts.currency.toUpperCase() }).format(opts.amount);
    const receiptRow = opts.receiptUrl
      ? `<p style="margin:24px 0;text-align:center"><a href="${opts.receiptUrl}" style="display:inline-block;background:#f8fafc;color:#0f172a;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;border:1px solid #e2e8f0">View Receipt →</a></p>`
      : "";
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi ${opts.firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your payment was successful. Here's a summary of your order.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:0 0 24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#64748b;padding:6px 0;border-bottom:1px solid #e2e8f0">Item</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:6px 0;border-bottom:1px solid #e2e8f0">${opts.itemName}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:6px 0">Amount Paid</td><td style="font-size:18px;color:#0f172a;font-weight:900;text-align:right;padding:6px 0">${formatted}</td></tr>
        </table>
      </div>
      ${receiptRow}
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">You can view your enrollment and start learning from your <a href="${this.frontendUrl}/learn" style="color:#3b82f6">learning portal</a>.</p>
    `;
  }

  private freeEnrollmentBody(opts: { firstName: string; itemName: string; type: "course" | "certification" }): string {
    const label = opts.type === "certification" ? "certification program" : "course";
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi ${opts.firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">You've been enrolled in the following ${label}:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center">
        <p style="margin:0;font-size:18px;font-weight:900;color:#15803d">${opts.itemName}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#16a34a">Free Enrollment</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${this.frontendUrl}/learn" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Start Learning →</a>
      </div>
    `;
  }

  private certificateBody(opts: { firstName: string; certTitle: string; certAcronym: string; certNumber: string; expiresAt: Date; verificationUrl: string }): string {
    const expiryStr = opts.expiresAt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Congratulations, ${opts.firstName}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">You've successfully earned your PAII certificate. This is a significant professional achievement.</p>
      <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center">
        <p style="margin:0 0 4px;font-size:28px;font-weight:900;color:#92400e;letter-spacing:2px">${opts.certAcronym}</p>
        <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#78350f">${opts.certTitle}</p>
        <p style="margin:0;font-size:12px;color:#92400e;letter-spacing:1px">CERTIFICATE NO. ${opts.certNumber}</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin:0 0 24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Valid Until</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:4px 0">${expiryStr}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Verify At</td><td style="font-size:13px;text-align:right;padding:4px 0"><a href="${opts.verificationUrl}" style="color:#3b82f6">paii.ca/verify</a></td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${this.frontendUrl}/certificates" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">View My Certificate →</a>
      </div>
    `;
  }

  private examBookedBody(opts: { firstName: string; certTitle: string; sessionTitle: string; examDate: string; meetingLink: string | null }): string {
    const linkRow = opts.meetingLink
      ? `<tr><td style="font-size:13px;color:#64748b;padding:5px 0">Meeting Link</td><td style="font-size:13px;text-align:right;padding:5px 0"><a href="${opts.meetingLink}" style="color:#3b82f6">Join Session</a></td></tr>`
      : "";
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Exam Confirmed, ${opts.firstName}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your exam session for <strong>${opts.certTitle}</strong> has been booked successfully.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:0 0 24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#64748b;padding:5px 0">Session</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:5px 0">${opts.sessionTitle}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:5px 0">Date &amp; Time</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:5px 0">${opts.examDate}</td></tr>
          ${linkRow}
        </table>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">The exam link will become available in your portal 3 minutes before the session starts.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${this.frontendUrl}/learn" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8">Good luck on your exam!</p>
    `;
  }

  private examReminderBody(opts: { firstName: string; certTitle: string; sessionTitle: string; examDate: string; meetingLink: string | null }): string {
    const linkRow = opts.meetingLink
      ? `<tr><td style="font-size:13px;color:#1e40af;padding:5px 0">Meeting Link</td><td style="font-size:13px;text-align:right;padding:5px 0"><a href="${opts.meetingLink}" style="color:#3b82f6">Join Session</a></td></tr>`
      : "";
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Exam Tomorrow — ${opts.firstName}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">This is a friendly reminder that your <strong>${opts.certTitle}</strong> exam is scheduled for <strong>tomorrow</strong>.</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin:0 0 24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#1e40af;padding:5px 0">Session</td><td style="font-size:13px;color:#1e3a8a;font-weight:600;text-align:right;padding:5px 0">${opts.sessionTitle}</td></tr>
          <tr><td style="font-size:13px;color:#1e40af;padding:5px 0">Date &amp; Time</td><td style="font-size:13px;color:#1e3a8a;font-weight:600;text-align:right;padding:5px 0">${opts.examDate}</td></tr>
          ${linkRow}
        </table>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">Make sure you're in a quiet space with a stable internet connection. Review your study materials tonight and get a good night's sleep.</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${this.frontendUrl}/learn" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
      </div>
    `;
  }

  private examPassedBody(opts: { firstName: string; certTitle: string; score: number }): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">You Passed, ${opts.firstName}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Excellent work — you've passed your <strong>${opts.certTitle}</strong> exam.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center">
        <p style="margin:0 0 4px;font-size:48px;font-weight:900;color:#15803d">${opts.score}%</p>
        <p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:1px">Passing Score</p>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">Your certificate will be reviewed and issued by the PAII team. You'll receive a separate email once it's ready. Congratulations on this achievement!</p>
    `;
  }

  private examFailedBody(opts: { firstName: string; certTitle: string; score: number; attemptsLeft: number }): string {
    const attemptsMsg = opts.attemptsLeft > 0
      ? `You have <strong>${opts.attemptsLeft}</strong> retake attempt${opts.attemptsLeft !== 1 ? "s" : ""} remaining. You can book a new exam session from your portal.`
      : "You have no retake attempts remaining. Please contact <a href=\"mailto:support@paii.ca\" style=\"color:#3b82f6\">support@paii.ca</a> if you believe this is an error.";
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Exam Result — ${opts.firstName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Unfortunately, you did not pass your <strong>${opts.certTitle}</strong> exam this time.</p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center">
        <p style="margin:0 0 4px;font-size:48px;font-weight:900;color:#c2410c">${opts.score}%</p>
        <p style="margin:0;font-size:14px;color:#ea580c;font-weight:600;text-transform:uppercase;letter-spacing:1px">Score — Did Not Pass</p>
      </div>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6">${attemptsMsg}</p>
      <div style="text-align:center;margin:24px 0">
        <a href="${this.frontendUrl}/learn" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
      </div>
    `;
  }

  private paymentFailedBody(opts: { firstName: string; itemName: string }): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Payment Failed — ${opts.firstName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">We were unable to process your payment for <strong>${opts.itemName}</strong>.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px">
        <p style="margin:0;font-size:13px;color:#dc2626;line-height:1.6">Common reasons: insufficient funds, an expired card, or the transaction was declined by your card issuer. Please verify your payment details and try again.</p>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="${this.frontendUrl}/cart" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Try Again →</a>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8">If this issue persists, please contact your bank or reach out to us at <a href="mailto:support@paii.ca" style="color:#3b82f6">support@paii.ca</a>.</p>
    `;
  }

  private certificateRevokedBody(opts: { firstName: string; certTitle: string; certAcronym: string; certNumber: string }): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Certificate Update — ${opts.firstName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Your PAII certificate has been revoked. Please review the details below.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px 24px;margin:0 0 24px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Certification</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:4px 0">${opts.certAcronym} — ${opts.certTitle}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Certificate No.</td><td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding:4px 0">${opts.certNumber}</td></tr>
          <tr><td style="font-size:13px;color:#64748b;padding:4px 0">Status</td><td style="font-size:13px;color:#dc2626;font-weight:700;text-align:right;padding:4px 0">Revoked</td></tr>
        </table>
      </div>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">If you believe this is an error or would like to appeal this decision, please contact us at <a href="mailto:support@paii.ca" style="color:#3b82f6">support@paii.ca</a>.</p>
    `;
  }

  private applicationApprovedBody(opts: { firstName: string; certTitle: string; certAcronym: string }): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Application Approved, ${opts.firstName}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">Great news — your application for the <strong>${opts.certAcronym}</strong> certification program has been reviewed and approved.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:900;color:#15803d">${opts.certAcronym}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#16a34a">${opts.certTitle}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#22c55e;font-weight:700;text-transform:uppercase;letter-spacing:1px">Approved</p>
      </div>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">You are now officially enrolled. Log in to your portal to access your study materials and schedule your exam session.</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${this.frontendUrl}/learn" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px">Go to My Portal →</a>
      </div>
    `;
  }

  private applicationRejectedBody(opts: { firstName: string; certTitle: string; certAcronym: string; reason: string | null }): string {
    const reasonSection = opts.reason
      ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin:0 0 24px"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px">Reason for Decision</p><p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6">${opts.reason}</p></div>`
      : "";
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Application Update — ${opts.firstName}</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6">After careful review, we are unable to approve your application for the <strong>${opts.certAcronym} — ${opts.certTitle}</strong> certification at this time.</p>
      ${reasonSection}
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">If you have questions about this decision or believe you meet the eligibility requirements, please contact us at <a href="mailto:support@paii.ca" style="color:#3b82f6">support@paii.ca</a>. You may reapply once the noted requirements are met.</p>
    `;
  }

  private affiliateInviteBody(senderName: string, recipientName: string, inviteLink: string): string {
    return `
      <p style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Hi ${recipientName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.6"><strong>${senderName}</strong> has personally invited you to join the Professional Artificial Intelligence Institute (PAII) — where professionals earn industry-recognized AI certifications that set them apart.</p>
      <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #fcd34d;border-radius:12px;padding:20px 24px;margin:0 0 24px;text-align:center">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:1px">You're Invited</p>
        <p style="margin:0;font-size:15px;color:#78350f;line-height:1.5">Create your free account and start your AI certification journey today.</p>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${inviteLink}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">Create My Account →</a>
      </div>
      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6">This invitation was sent by ${senderName}. If you didn't expect this email, you can safely ignore it.</p>
    `;
  }

  // ─── Shell wrapper ────────────────────────────────────────────────────────────

  private wrapper(body: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:36px 40px;text-align:center">
          <p style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px">Professional Artificial Intelligence Institute</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px">paii.ca</p>
        </td></tr>
        <tr><td style="padding:40px">${body}</td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
          <p style="margin:0;font-size:12px;color:#cbd5e1">© ${new Date().getFullYear()} Professional Artificial Intelligence Institute. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
