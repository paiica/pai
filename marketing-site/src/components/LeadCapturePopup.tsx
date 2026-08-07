"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SEEN_KEY = "pai-lead-popup-seen";

const INTERESTS = [
  "AI Fundamentals",
  "Generative AI",
  "Data & Analytics",
  "AI for Business",
  "Professional Certificates",
  "I'm not sure yet",
];

const BENEFITS = [
  "Discover the right AI skills",
  "Explore PAII programs & certificates",
  "Receive upcoming opportunities",
];

export default function LeadCapturePopup({ source }: { source: "blog" | "homepage" }) {
  const [visible, setVisible]   = useState(false);
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [interest, setInterest] = useState("");
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
          aria-label="Close"
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
            Build Your Future in AI.
          </h2>
          <p className="relative text-white/85 text-sm leading-relaxed">
            Get a personalized AI learning roadmap based on your interests,
            career goals, and current experience.
          </p>

          <div className="relative mt-7 space-y-3 hidden sm:block">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2.5 text-sm">
                <span className="w-[22px] h-[22px] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={12} />
                </span>
                {b}
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
              <p className="font-display font-black text-ink-900 text-2xl mb-2">You&apos;re All Set!</p>
              <p className="text-slate-500 text-sm leading-relaxed">
                Thank you for your interest in PAII. We&apos;ll be in touch with
                information about your AI learning opportunities.
              </p>
            </div>
          ) : (
            <>
              <p className="font-display font-black text-ink-900 text-2xl mb-2">Start Your AI Journey</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Tell us a little about yourself and we&apos;ll help you find the right learning path.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-900 mb-1.5">First Name</label>
                  <input
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name" className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-900 mb-1.5">Email Address</label>
                  <input
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-900 mb-1.5">What are you interested in?</label>
                  <select
                    required value={interest} onChange={(e) => setInterest(e.target.value)}
                    className="input-base text-sm"
                  >
                    <option value="">Select an area</option>
                    {INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center disabled:opacity-60 !mt-6">
                  {submitting ? "Submitting…" : "Get My AI Roadmap →"}
                </button>

                <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                  By submitting this form, you agree to receive updates from PAII.
                  You can unsubscribe at any time.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
