"use client";

import { useEffect, useState } from "react";
import { Mail, X, Check } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SEEN_KEY = "pai-lead-popup-seen";

const COPY: Record<string, { title: string; subtitle: string }> = {
  blog: {
    title: "Enjoying this post?",
    subtitle: "Subscribe to get new AI certification articles and insights sent straight to your inbox.",
  },
  homepage: {
    title: "Stay ahead in AI",
    subtitle: "Subscribe for new certification programs, articles, and AI career insights — straight to your inbox.",
  },
};

export default function LeadCapturePopup({ source }: { source: "blog" | "homepage" }) {
  const [visible, setVisible]   = useState(false);
  const [email, setEmail]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

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
        body: JSON.stringify({ email: email.trim(), source, page_url: window.location.href }),
      });
      localStorage.setItem(SEEN_KEY, "1");
      setSubmitted(true);
      setTimeout(() => setVisible(false), 1800);
    } catch {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  const copy = COPY[source];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/40 p-4">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-ink-900 transition-colors"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
              <Check size={20} />
            </div>
            <p className="font-display font-black text-ink-900 text-lg">You're subscribed</p>
            <p className="text-sm text-slate-500 mt-1">New posts will land in your inbox.</p>
          </div>
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
              <Mail size={20} />
            </div>
            <p className="font-display font-black text-ink-900 text-lg leading-snug">
              {copy.title}
            </p>
            <p className="text-sm text-slate-500 mt-1.5 mb-4">
              {copy.subtitle}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base text-sm"
              />
              <button type="submit" disabled={submitting} className="btn-primary justify-center disabled:opacity-60">
                {submitting ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
