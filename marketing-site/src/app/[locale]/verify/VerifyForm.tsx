"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Shield, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyForm({ initialId }: { initialId: string }) {
  const t = useTranslations("VerifyPage");
  const [certId, setCertId] = useState(initialId);
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [result, setResult] = useState<null | {
    name: string;
    cert: string;
    issue_date: string;
    expiry_date: string | null;
    status: string;
  }>(null);

  async function verify(id: string) {
    if (!id.trim()) return;
    setStatus("loading");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pai-sav1.onrender.com/api/v1";
      const trimmed = id.trim();
      // Program completion certificates use a distinct PGM- number prefix
      // and live in a separate table from accredited Certificates — try
      // that endpoint first when the prefix matches, otherwise fall back
      // to it if the primary lookup comes back empty.
      const endpoints = trimmed.toUpperCase().startsWith("PGM-")
        ? [`${apiUrl}/programs/verify/${trimmed}`, `${apiUrl}/certificates/verify/${trimmed}`]
        : [`${apiUrl}/certificates/verify/${trimmed}`, `${apiUrl}/programs/verify/${trimmed}`];

      for (const url of endpoints) {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setResult(json.data ?? json);
          setStatus("found");
          return;
        }
      }
      setStatus("not_found");
      setResult(null);
    } catch {
      setStatus("not_found");
    }
  }

  useEffect(() => {
    if (initialId) verify(initialId);
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    await verify(certId);
  }

  return (
    <div className="card-base p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-sand-100 rounded-2xl flex items-center justify-center">
          <Shield size={24} className="text-ink-900" />
        </div>
        <div>
          <div className="font-display font-bold text-ink-900">{t("verifyCertificate")}</div>
          <div className="text-xs text-ink-900">{t("enterUniqueId")}</div>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          value={certId}
          onChange={(e) => setCertId(e.target.value)}
          placeholder="e.g. PAII-CAIP-2024-001234"
          aria-label={t("enterUniqueId")}
          className="input-base font-mono"
        />
        <button
          type="submit"
          disabled={!certId.trim()}
          className="w-full btn-dark !py-3 !text-sm justify-center disabled:opacity-50"
        >
          {status === "loading"
            ? <><Loader2 size={16} className="animate-spin" /> {t("verifying")}</>
            : <><Search size={16} /> {t("verifyCertificate")}</>
          }
        </button>
      </form>

      {status === "found" && result && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} className="text-ink-900" />
            <span className="font-display font-bold text-ink-900">{t("validCertificate")}</span>
          </div>
          <div className="space-y-2">
            {[
              { label: t("certificateHolder"), value: result.name },
              { label: t("certificationLabel"), value: result.cert },
              { label: t("issueDate"),         value: result.issue_date },
              ...(result.expiry_date ? [{ label: t("validUntil"), value: result.expiry_date }] : []),
              { label: t("statusLabel"),             value: result.status },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-ink-900 font-medium">{label}</span>
                <span className="font-semibold text-ink-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "not_found" && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <XCircle size={20} className="text-ink-900" />
            <div>
              <div className="font-display font-bold text-ink-900">{t("certificateNotFound")}</div>
              <div className="text-sm text-ink-900 mt-0.5">
                {t("notFoundBody")}{" "}
                {t("contactPrefix")} <a href="mailto:info@paii.ca" className="underline">info@paii.ca</a> {t("contactSuffix")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
