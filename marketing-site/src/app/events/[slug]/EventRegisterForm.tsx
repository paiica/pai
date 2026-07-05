"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export default function EventRegisterForm({
  eventId, price, alreadyRegistered,
}: { eventId: string; price: number; alreadyRegistered: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadyRegistered);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (price > 0) {
        const res = await fetch(`${API}/payments/event-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, name, email, phone: phone || undefined }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to start checkout");
        const checkoutUrl = json?.data?.checkout_url ?? json?.checkout_url;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        throw new Error("No checkout URL returned");
      } else {
        const res = await fetch(`${API}/events/${eventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, phone: phone || undefined }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to register");
        setDone(true);
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
        <CheckCircle2 size={28} className="text-teal-600 mx-auto mb-2" />
        <p className="font-display font-bold text-ink-900">You're registered!</p>
        <p className="text-sm text-slate-500 mt-1">Check your email for confirmation and details.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
      <p className="font-display font-bold text-ink-900 mb-1">
        {price > 0 ? `Register — $${price.toLocaleString()}` : "Register — Free"}
      </p>
      <input
        className="input-base"
        placeholder="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="input-base"
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="input-base"
        placeholder="Phone (optional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-3 disabled:opacity-60">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
        {price > 0 ? "Continue to Payment" : "Register Now"}
      </button>
      <p className="text-[11px] text-slate-400 text-center">No account needed — just your name and email.</p>
    </form>
  );
}
