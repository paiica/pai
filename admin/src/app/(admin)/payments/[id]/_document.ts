export type OrderDocumentData = {
  id: string;
  invoice_number: string;
  receipt_number: string;
  description: string;
  currency: string;
  status: string;
  date: string;
  subtotal: number;
  tax_label: string | null;
  tax_amount: number;
  amount: number;
  card_brand: string | null;
  card_last4: string | null;
  stripe_receipt_url: string | null;
  bill_to: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    } | null;
  };
  company: {
    name: string;
    support_email: string;
    address: string;
    tax_id: string;
    logo_url: string;
  };
};

function money(amount: number, currency: string) {
  return `$${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Logo must be an absolute URL — this markup also gets written into a blank
// popup window (about:blank) for printing, which has no base href to resolve
// a relative path against. Uses whatever logo is actually configured in
// Settings (site_logo_url, falling back to certificate_logo_url server-side)
// rather than a hardcoded static file — only falls back to the bundled
// asset if nothing has ever been uploaded.
function logoUrl(company: { logo_url: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (company.logo_url) {
    return /^https?:\/\//i.test(company.logo_url)
      ? company.logo_url
      : `${origin}${company.logo_url.startsWith("/") ? "" : "/"}${company.logo_url}`;
  }
  return `${origin}/paii.logo.png`;
}

// Shared by the on-screen preview (injected via dangerouslySetInnerHTML) and
// the print popup window, so the printed PDF always matches exactly what was
// on screen — mirrors the student-facing version in
// lms-platform/apps/frontend/src/app/(student)/orders/[id]/_document.ts
// (kept as a separate copy since admin and the student portal are
// independent Next.js apps with no shared component package).
export function buildDocumentBody(data: OrderDocumentData, kind: "receipt" | "invoice") {
  const title = kind === "receipt" ? "Receipt" : "Invoice";
  const addr = data.bill_to.address;
  const addressLines = addr
    ? [addr.line1, addr.line2, [addr.city, addr.state, addr.zip].filter(Boolean).join(", "), addr.country]
        .filter(Boolean)
        .map(esc)
    : [];

  const companyAddressLines = data.company.address
    ? data.company.address.split("\n").filter(Boolean).map(esc)
    : [];

  const dateBlock =
    kind === "receipt"
      ? `<div class="meta-item"><span class="meta-label">Date paid</span><span class="meta-value">${formatDate(data.date)}</span></div>`
      : `<div class="meta-item"><span class="meta-label">Date of issue</span><span class="meta-value">${formatDate(data.date)}</span></div><div class="meta-item"><span class="meta-label">Date due</span><span class="meta-value">${formatDate(data.date)}</span></div>`;

  const numberBlock =
    kind === "receipt"
      ? `<div class="meta-item"><span class="meta-label">Invoice number</span><span class="meta-value">${esc(data.invoice_number)}</span></div><div class="meta-item"><span class="meta-label">Receipt number</span><span class="meta-value">${esc(data.receipt_number)}</span></div>`
      : `<div class="meta-item"><span class="meta-label">Invoice number</span><span class="meta-value">${esc(data.invoice_number)}</span></div>`;

  const paymentHistory =
    kind === "receipt"
      ? `
    <div class="section-title">Payment history</div>
    <table class="items-table">
      <thead>
        <tr><th>Payment method</th><th>Date</th><th class="num">Amount paid</th><th>Receipt number</th></tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.card_brand ? `${esc(data.card_brand)}${data.card_last4 ? ` •••• ${esc(data.card_last4)}` : ""}` : "—"}</td>
          <td>${formatDate(data.date)}</td>
          <td class="num">${money(data.amount, data.currency)}</td>
          <td>${esc(data.receipt_number)}</td>
        </tr>
      </tbody>
    </table>`
      : "";

  return `
    <div class="doc">
      <div class="doc-header">
        <img src="${logoUrl(data.company)}" alt="${esc(data.company.name)}" class="logo" />
        <div class="doc-title-block">
          <div class="doc-title">${title}</div>
          <span class="status-pill">${kind === "receipt" ? "Paid" : "Paid in full"}</span>
        </div>
      </div>

      <div class="meta-row">
        ${numberBlock}
        ${dateBlock}
      </div>

      <div class="parties">
        <div class="party-card">
          <div class="party-label">From</div>
          <div class="party-name">${esc(data.company.name)}</div>
          ${companyAddressLines.map((l) => `<div class="party-line">${l}</div>`).join("")}
          ${data.company.tax_id ? `<div class="party-line">Tax ID: ${esc(data.company.tax_id)}</div>` : ""}
          <div class="party-line">${esc(data.company.support_email)}</div>
        </div>
        <div class="party-card">
          <div class="party-label">Bill to</div>
          <div class="party-name">${esc(data.bill_to.name)}</div>
          ${addressLines.map((l) => `<div class="party-line">${l}</div>`).join("")}
          <div class="party-line">${esc(data.bill_to.email)}</div>
        </div>
      </div>

      <div class="amount-banner">
        <div>
          <div class="amount-banner-label">${kind === "receipt" ? "Amount paid" : "Amount due"}</div>
          <div class="amount-banner-value">${money(data.amount, data.currency)}</div>
        </div>
        <div class="amount-banner-date">${kind === "receipt" ? "Paid" : "Issued"} ${formatDate(data.date)}</div>
      </div>

      <div class="section-title">Summary</div>
      <table class="items-table">
        <thead>
          <tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th>Tax</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${esc(data.description)}</td>
            <td class="num">1</td>
            <td class="num">${money(data.subtotal, data.currency)}</td>
            <td>${data.tax_label ? esc(data.tax_label) : "—"}</td>
            <td class="num">${money(data.subtotal, data.currency)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>${money(data.subtotal, data.currency)}</span></div>
        ${data.tax_amount > 0 ? `<div class="totals-row"><span>${esc(data.tax_label ?? "Tax")}</span><span>${money(data.tax_amount, data.currency)}</span></div>` : ""}
        <div class="totals-row bold"><span>Total</span><span>${money(data.amount, data.currency)}</span></div>
      </div>

      ${paymentHistory}

      <div class="footer">
        <span>Questions about this ${kind}? Contact ${esc(data.company.support_email)}</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  `;
}

export const DOCUMENT_STYLES = `
  .doc, .doc * { box-sizing: border-box; }
  .doc {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #171527;
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #eef1f5;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(23, 21, 39, 0.06);
    padding: 40px;
  }

  .doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #171527; padding-bottom: 24px; margin-bottom: 28px; }
  .logo { height: 34px; width: auto; object-fit: contain; }
  .doc-title-block { text-align: right; }
  .doc-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; color: #171527; }
  .status-pill { display: inline-block; margin-top: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #0d9488; background: #f0fdfa; border: 1px solid #99f6e4; padding: 3px 10px; border-radius: 999px; }

  .meta-row { display: flex; gap: 40px; margin-bottom: 28px; }
  .meta-item { display: flex; flex-direction: column; gap: 3px; }
  .meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; }
  .meta-value { font-size: 13px; font-weight: 600; color: #1e293b; }

  .parties { display: flex; gap: 16px; margin-bottom: 28px; }
  .party-card { flex: 1; background: #f8fafc; border: 1px solid #eef1f5; border-radius: 12px; padding: 16px 18px; font-size: 13px; }
  .party-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; margin-bottom: 6px; }
  .party-name { font-weight: 700; color: #171527; margin-bottom: 2px; }
  .party-line { color: #475569; line-height: 1.5; }

  .amount-banner { display: flex; align-items: center; justify-content: space-between; background: #171527; color: #fff; border-radius: 14px; padding: 20px 24px; margin-bottom: 28px; }
  .amount-banner-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: #a09dbe; margin-bottom: 4px; }
  .amount-banner-value { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
  .amount-banner-date { font-size: 12px; color: #c8c6de; }

  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; margin: 24px 0 10px; }

  .items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .items-table th { text-align: left; padding: 0 4px 8px; border-bottom: 1.5px solid #171527; color: #64748b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.02em; }
  .items-table td { padding: 12px 4px; border-bottom: 1px solid #eef1f5; color: #334155; }
  .num { text-align: right; }

  .totals { margin-left: auto; width: 260px; font-size: 13px; margin-top: 14px; }
  .totals-row { display: flex; justify-content: space-between; padding: 7px 0; color: #475569; }
  .totals-row.bold { font-weight: 800; color: #171527; font-size: 15px; border-top: 2px solid #171527; padding-top: 12px; margin-top: 4px; }

  .footer { display: flex; justify-content: space-between; color: #94a3b8; font-size: 11px; margin-top: 40px; padding-top: 16px; border-top: 1px solid #eef1f5; }

  @media print {
    .doc { max-width: none; border: none; border-radius: 0; box-shadow: none; padding: 0; }
    .amount-banner { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .status-pill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
