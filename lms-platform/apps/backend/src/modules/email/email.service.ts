import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private from: string;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>("email.apiKey");
    const fromName = config.get<string>("email.fromName", "Professional AI Institute");
    const fromEmail = config.get<string>("email.from", "noreply@paii.ca");
    this.from = `${fromName} <${fromEmail}>`;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn("RESEND_API_KEY not set — emails logged to console");
    }
  }

  async sendEmailChangeVerification(newEmail: string, verifyUrl: string, firstName: string) {
    const subject = "Verify your new email address — PAI";
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#1a2a5e">Hi ${firstName},</h2>
        <p>You requested to change your PAI account email to <strong>${newEmail}</strong>.</p>
        <p>Click the button below to confirm this change. The link expires in <strong>24 hours</strong>.</p>
        <p style="margin:28px 0">
          <a href="${verifyUrl}"
             style="background:#1a2a5e;color:#fff;padding:13px 26px;border-radius:8px;
                    text-decoration:none;font-weight:600;display:inline-block">
            Verify New Email
          </a>
        </p>
        <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email — your current email address will remain unchanged.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#999;font-size:12px">Professional AI Institute · <a href="https://paii.ca" style="color:#999">paii.ca</a></p>
      </div>
    `;

    if (this.resend) {
      await this.resend.emails.send({ from: this.from, to: newEmail, subject, html });
      this.logger.log(`Email change verification sent to ${newEmail}`);
    } else {
      this.logger.log(`[DEV] Email change verification for ${newEmail}:\n${verifyUrl}`);
    }
  }
}
