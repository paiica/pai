export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Email skipped – no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Professional AI Institute <no-reply@professionalaiinstitute.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", await res.text());
  }
}

export function approvalEmailHtml({
  name,
  certTitle,
  certAcronym,
  certSlug,
  appUrl,
}: {
  name: string;
  certTitle: string;
  certAcronym: string;
  certSlug: string;
  appUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1e2d4a;padding:32px 40px;text-align:center;">
      <div style="font-size:24px;font-weight:900;color:#c9a84c;letter-spacing:-0.5px;">PAI</div>
      <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Professional AI Institute</div>
    </div>
    <div style="padding:40px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <h1 style="margin:0;font-size:24px;font-weight:900;color:#1e2d4a;">Application Approved!</h1>
        <p style="color:#64748b;margin-top:8px;">Congratulations, ${name}</p>
      </div>
      <p style="color:#475569;line-height:1.7;">
        We're pleased to inform you that your application for the <strong>${certTitle} (${certAcronym})</strong> program has been reviewed and approved.
      </p>
      <p style="color:#475569;line-height:1.7;">
        You now have full access to the course materials, learning modules, and all resources needed to earn your certification.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${appUrl}/lms" style="display:inline-block;background:#c9a84c;color:#fff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
          Start Learning Now →
        </a>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1e2d4a;">Next Steps</p>
        <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:2;">
          <li>Log in to your account at <a href="${appUrl}/login" style="color:#c9a84c;">${appUrl}/login</a></li>
          <li>Access your course at <a href="${appUrl}/lms" style="color:#c9a84c;">${appUrl}/lms</a></li>
          <li>Complete all ${certAcronym} modules at your own pace</li>
          <li>Schedule and pass the certification exam</li>
        </ul>
      </div>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      © ${new Date().getFullYear()} Professional AI Institute · <a href="${appUrl}" style="color:#94a3b8;">professionalaiinstitute.com</a>
    </div>
  </div>
</body>
</html>`;
}

export function rejectionEmailHtml({
  name,
  certTitle,
  certAcronym,
  reason,
  appUrl,
}: {
  name: string;
  certTitle: string;
  certAcronym: string;
  reason?: string;
  appUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
    <div style="background:#1e2d4a;padding:32px 40px;text-align:center;">
      <div style="font-size:24px;font-weight:900;color:#c9a84c;letter-spacing:-0.5px;">PAI</div>
      <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Professional AI Institute</div>
    </div>
    <div style="padding:40px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#1e2d4a;">Application Status Update</h1>
      <p style="color:#64748b;margin-top:0;">Dear ${name},</p>
      <p style="color:#475569;line-height:1.7;">
        Thank you for applying to the <strong>${certTitle} (${certAcronym})</strong> program. After carefully reviewing your application, we are unable to approve your enrollment at this time.
      </p>
      ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin:20px 0;color:#991b1b;font-size:14px;"><strong>Reason:</strong> ${reason}</div>` : ""}
      <p style="color:#475569;line-height:1.7;">
        A <strong>full refund</strong> has been issued to your original payment method. Please allow 5–10 business days for the refund to appear.
      </p>
      <p style="color:#475569;line-height:1.7;">
        If you believe this decision was made in error or have questions, please contact us at <a href="mailto:info@professionalaiinstitute.com" style="color:#c9a84c;">info@professionalaiinstitute.com</a>.
      </p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px;">
      © ${new Date().getFullYear()} Professional AI Institute · <a href="${appUrl}" style="color:#94a3b8;">professionalaiinstitute.com</a>
    </div>
  </div>
</body>
</html>`;
}
