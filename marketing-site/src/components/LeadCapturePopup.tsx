"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Check } from "lucide-react";
import { usePathname } from "@/i18n/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SEEN_KEY = "pai-lead-popup-seen";

const INTEREST_KEYS = [
  "interestFundamentals",
  "interestGenerativeAi",
  "interestDataAnalytics",
  "interestAiForBusiness",
  "interestCertificates",
  "interestNotSure",
];

const BENEFIT_KEYS = ["benefitDiscoverSkills", "benefitExplorePrograms", "benefitReceiveOpportunities"];

// Mounted once, globally, in [locale]/layout.tsx — decides for itself
// whether to show based on the current page and the admin-configured page
// list (Settings → Lead Capture), rather than being conditionally rendered
// per-page like the old homepage/blog-only toggles required. `source` (sent
// with the captured lead) is derived from the pathname instead of being
// passed in, since any page can now enable this.
export default function LeadCapturePopup() {
  const t = useTranslations("LeadPopup");
  const pathname = usePathname();
  const [enabledPages, setEnabledPages] = useState<string[] | null>(null);
  const [visible, setVisible]   = useState(false);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [interest, setInterest] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    fetch(`${API}/site-settings/public`)
      .then((r) => r.json())
      .then((json) => {
        const raw = (json?.data ?? json)?.lead_popup_pages;
        try { setEnabledPages(raw ? JSON.parse(raw) : []); }
        catch { setEnabledPages([]); }
      })
      .catch(() => setEnabledPages([]));
  }, []);

  useEffect(() => {
    if (!enabledPages || !enabledPages.includes(pathname)) return;
    if (localStorage.getItem(SEEN_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [enabledPages, pathname]);

  const source = pathname === "/" ? "homepage" : pathname.replace(/^\//, "") || "homepage";

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setVisible(false);
  }

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
          interest,
          source,
          page_url: window.location.href,
        }),
      });
      localStorage.setItem(SEEN_KEY, "1");
      setSubmitted(true);
    } catch {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative w-full max-w-[920px] max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl grid md:grid-cols-[42%_58%]">
        <button
          onClick={dismiss}
          aria-label={t("close")}
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/90 shadow flex items-center justify-center text-ink-900 hover:bg-white transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* Visual panel */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#075e5c] to-[#0b8d88] text-white p-9 sm:p-12 flex flex-col">
          <div className="absolute w-64 h-64 rounded-full border border-white/15 -right-28 -top-16" />
          <div className="absolute w-48 h-48 rounded-full border border-white/15 -left-24 -bottom-20" />

          <img
            src="/paii.logo.white.png"
            alt="Professional Artificial Intelligence Institute"
            className="relative h-7 w-auto object-contain mb-10 sm:mb-16"
          />

          <h2 className="relative font-display font-black text-3xl sm:text-[34px] leading-[1.12] mb-4">
            {t("headline")}
          </h2>
          <p className="relative text-white/85 text-sm leading-relaxed">
            {t("subheadline")}
          </p>

          <div className="relative mt-7 space-y-3 hidden sm:block">
            {BENEFIT_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-2.5 text-sm">
                <span className="w-[22px] h-[22px] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={12} />
                </span>
                {t(k)}
              </div>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-5">
                <Check size={28} />
              </div>
              <p className="font-display font-black text-ink-900 text-2xl mb-2">{t("allSet")}</p>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t("thankYouBody")}
              </p>
            </div>
          ) : (
            <>
              <p className="font-display font-black text-ink-900 text-2xl mb-2">{t("startYourJourney")}</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                {t("tellUsAboutYourself")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="lead-first-name" className="block text-xs font-bold text-ink-900 mb-1.5">{t("firstNameLabel")}</label>
                  <input
                    id="lead-first-name"
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={t("firstNamePlaceholder")} className="input-base text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="lead-email" className="block text-xs font-bold text-ink-900 mb-1.5">{t("emailLabel")}</label>
                  <input
                    id="lead-email"
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input-base text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="lead-interest" className="block text-xs font-bold text-ink-900 mb-1.5">{t("interestLabel")}</label>
                  <select
                    id="lead-interest"
                    required value={interest} onChange={(e) => setInterest(e.target.value)}
                    className="input-base text-sm"
                  >
                    <option value="">{t("selectAnArea")}</option>
                    {INTEREST_KEYS.map((k) => <option key={k} value={t(k)}>{t(k)}</option>)}
                  </select>
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60 !mt-6">
                  {submitting ? t("submitting") : t("getMyRoadmap")}
                </button>

                <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                  {t("consentText")}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
