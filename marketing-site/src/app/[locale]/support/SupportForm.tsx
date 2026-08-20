"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type Status = "idle" | "submitting" | "sent" | "error";

export default function SupportForm() {
  const t = useTranslations("SupportPage");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus]   = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(`${API}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={22} />
        </div>
        <p className="font-display font-black text-ink-900 text-xl mb-2">{t("messageSent")}</p>
        <p className="text-slate-500 text-sm">
          {t("teamWillRespond")}
        </p>
        <button onClick={() => setStatus("idle")} className="btn-outline mt-6 !py-2.5 !px-6 !text-sm">
          {t("sendAnotherMessage")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="support-name" className="block text-xs font-semibold text-ink-900 mb-1.5">{t("nameLabel")}</label>
          <input
            id="support-name"
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith" className="input-base text-sm"
          />
        </div>
        <div>
          <label htmlFor="support-email" className="block text-xs font-semibold text-ink-900 mb-1.5">{t("emailLabel")}</label>
          <input
            id="support-email"
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="input-base text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="support-subject" className="block text-xs font-semibold text-ink-900 mb-1.5">{t("subjectLabel")}</label>
        <input
          id="support-subject"
          type="text" required value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder={t("subjectPlaceholder")} className="input-base text-sm"
        />
      </div>
      <div>
        <label htmlFor="support-message" className="block text-xs font-semibold text-ink-900 mb-1.5">{t("messageLabel")}</label>
        <textarea
          id="support-message"
          required rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")} className="input-base text-sm resize-none"
        />
      </div>

      {status === "error" && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0" />
          {t("submitError")}
        </div>
      )}

      <button type="submit" disabled={status === "submitting"} className="btn-primary w-full justify-center disabled:opacity-60">
        {status === "submitting" ? t("sending") : <>{t("sendMessage")} <Send size={14} /></>}
      </button>
    </form>
  );
}
