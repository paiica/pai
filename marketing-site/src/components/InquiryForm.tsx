"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Inline (not a popup) lead-capture form, reusing the same POST /leads
// endpoint and admin review flow as LeadCapturePopup — just with two extra
// fields (organization, message) that endpoint now also accepts.
export default function InquiryForm({
  source, interestOptions, heading, subheading,
}: {
  source: string;
  interestOptions: string[];
  heading: string;
  subheading: string;
}) {
  const t = useTranslations("InquiryForm");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState(interestOptions[0] ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          organization: organization.trim(),
          interest,
          message: message.trim(),
          source,
          page_url: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-sand-200 p-8 text-center max-w-lg mx-auto">
        <div className="w-14 h-14 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4">
          <Check size={24} />
        </div>
        <p className="font-display font-black text-ink-900 text-xl mb-2">{t("thanksHeadline")}</p>
        <p className="text-sm text-slate-500 leading-relaxed">{t("thanksBody")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-sand-200 p-7 sm:p-9 max-w-lg mx-auto">
      <h3 className="font-display font-black text-ink-900 text-xl mb-1.5">{heading}</h3>
      <p className="text-sm text-slate-500 leading-relaxed mb-6">{subheading}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="inquiry-name" className="block text-xs font-bold text-ink-900 mb-1.5">{t("contactName")}</label>
            <input id="inquiry-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-base text-sm" placeholder={t("contactNamePlaceholder")} />
          </div>
          <div>
            <label htmlFor="inquiry-org" className="block text-xs font-bold text-ink-900 mb-1.5">{t("organization")}</label>
            <input id="inquiry-org" type="text" required value={organization} onChange={(e) => setOrganization(e.target.value)} className="input-base text-sm" placeholder={t("organizationPlaceholder")} />
          </div>
        </div>
        <div>
          <label htmlFor="inquiry-email" className="block text-xs font-bold text-ink-900 mb-1.5">{t("email")}</label>
          <input id="inquiry-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-base text-sm" placeholder={t("emailPlaceholder")} />
        </div>
        <div>
          <label htmlFor="inquiry-interest" className="block text-xs font-bold text-ink-900 mb-1.5">{t("interestedIn")}</label>
          <select id="inquiry-interest" required value={interest} onChange={(e) => setInterest(e.target.value)} className="input-base text-sm">
            {interestOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inquiry-message" className="block text-xs font-bold text-ink-900 mb-1.5">{t("messageLabel")} <span className="text-slate-400 font-normal">{t("optional")}</span></label>
          <textarea id="inquiry-message" value={message} onChange={(e) => setMessage(e.target.value)} className="input-base text-sm resize-none h-24" placeholder={t("messagePlaceholder")} />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60">
          {submitting ? <Loader2 size={15} className="animate-spin" /> : t("sendInquiry")}
        </button>
      </form>
    </div>
  );
}
