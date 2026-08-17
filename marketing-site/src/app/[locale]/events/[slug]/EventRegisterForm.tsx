"use client";

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// Cache the loaded Stripe.js instance per publishable key so re-renders
// don't re-fetch/re-init the SDK.
const stripePromises = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string) {
  if (!stripePromises.has(publishableKey)) {
    stripePromises.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromises.get(publishableKey)!;
}

const PROFESSIONS = [
  "Technology / Software",
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Marketing & Sales",
  "Human Resources",
  "Operations & Management",
  "Consulting",
  "Manufacturing",
  "Legal",
  "Government / Public Sector",
  "Nonprofit",
  "Retail",
  "Other",
];

const JOB_LEVELS = [
  "Student",
  "Individual Contributor",
  "Team Lead / Supervisor",
  "Manager",
  "Senior Manager / Director",
  "VP / Senior Executive",
  "C-Level (CEO, CTO, etc.)",
  "Founder / Owner",
  "Other",
];

const EDUCATION_LEVELS = [
  "High School",
  "Some College",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate (PhD)",
  "Professional Degree (MD, JD, MBA, etc.)",
  "Other",
];

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "New Zealand", "Ireland",
  "Germany", "France", "Spain", "Italy", "Portugal", "Netherlands", "Belgium",
  "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Iceland",
  "Poland", "Czech Republic", "Slovakia", "Hungary", "Romania", "Bulgaria", "Greece",
  "Ukraine", "Croatia", "Serbia", "Slovenia",
  "India", "China", "Japan", "South Korea", "Singapore", "Malaysia", "Indonesia",
  "Philippines", "Thailand", "Vietnam", "Pakistan", "Bangladesh", "Sri Lanka",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
  "Lebanon", "Iraq", "Jordan", "Israel", "Turkey", "Egypt",
  "South Africa", "Nigeria", "Kenya", "Ghana", "Morocco",
  "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Ecuador",
  "Costa Rica", "Panama", "Jamaica", "Trinidad and Tobago",
  "Russia", "Kazakhstan",
  "Other",
];

type FormState = {
  name: string; email: string; phone: string;
  address_line1: string; city: string; state_province: string; postal_code: string; country: string;
  profession: string; job_title: string; education: string; years_experience: string;
};

const EMPTY: FormState = {
  name: "", email: "", phone: "",
  address_line1: "", city: "", state_province: "", postal_code: "", country: "",
  profession: "", job_title: "", education: "", years_experience: "",
};

function Field({
  label, ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-700 mb-1">{label}</span>
      <input className="input-base" {...props} />
    </label>
  );
}

function Select({
  label, options, placeholder, ...props
}: { label: string; options: string[]; placeholder: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-700 mb-1">{label}</span>
      <select className="input-base" {...props}>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function SectionToggle({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between text-[11px] font-bold text-sand-500 uppercase tracking-wider py-1"
    >
      {label}
      <ChevronDown size={14} className={`text-sand-400 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

export default function EventRegisterForm({
  eventId, price, alreadyRegistered,
}: { eventId: string; price: number; alreadyRegistered: boolean }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(alreadyRegistered);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addressMissing = !form.address_line1.trim() || !form.city.trim()
      || !form.state_province.trim() || !form.postal_code.trim() || !form.country.trim();
    const proMissing = !form.profession.trim() || !form.job_title.trim()
      || !form.education.trim() || form.years_experience === "";
    const contactMissing = !form.name.trim() || !form.email.trim();

    if (contactMissing || addressMissing || proMissing) {
      if (addressMissing) setAddressOpen(true);
      if (proMissing) setProOpen(true);
      setError("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        address_line1: form.address_line1,
        city: form.city,
        state_province: form.state_province,
        postal_code: form.postal_code,
        country: form.country,
        profession: form.profession,
        job_title: form.job_title,
        education: form.education,
        years_experience: Number(form.years_experience),
      };
      if (price > 0) {
        const res = await fetch(`${API}/payments/event-checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: eventId, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to start checkout");
        const data = json?.data ?? json;
        if (data?.client_secret && data?.publishable_key) {
          setCheckout({ clientSecret: data.client_secret, publishableKey: data.publishable_key });
          return;
        }
        throw new Error("Failed to start checkout");
      } else {
        const res = await fetch(`${API}/events/${eventId}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
        <p className="text-sm text-ink-500 mt-1">Check your email for confirmation and details.</p>
      </div>
    );
  }

  if (checkout) {
    return (
      <div className="rounded-2xl border border-sand-300 bg-white overflow-hidden">
        <EmbeddedCheckoutProvider
          stripe={getStripe(checkout.publishableKey)}
          options={{ clientSecret: checkout.clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-sand-300 bg-white p-6 space-y-4">
      <p className="font-display font-bold text-ink-900">
        {price > 0 ? `Register — $${price.toLocaleString()}` : "Register — Free"}
      </p>

      <div className="space-y-3">
        <Field label="Full name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        <Field label="Email address" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        <Field label="Phone (optional)" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>

      <div className="pt-3 border-t border-sand-200">
        <SectionToggle label="Address" open={addressOpen} onClick={() => setAddressOpen((o) => !o)} />
        {addressOpen && (
          <div className="space-y-3 mt-3">
            <Field label="Street address" value={form.address_line1} onChange={(e) => set("address_line1", e.target.value)} required />
            <Field label="City" value={form.city} onChange={(e) => set("city", e.target.value)} required />
            <Field label="State / Province" value={form.state_province} onChange={(e) => set("state_province", e.target.value)} required />
            <Field label="Postal code" value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} required />
            <Select label="Country" placeholder="Select country" options={COUNTRIES} value={form.country} onChange={(e) => set("country", e.target.value)} required />
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-sand-200">
        <SectionToggle label="Professional background" open={proOpen} onClick={() => setProOpen((o) => !o)} />
        {proOpen && (
          <div className="space-y-3 mt-3">
            <Select label="Profession" placeholder="Select profession" options={PROFESSIONS} value={form.profession} onChange={(e) => set("profession", e.target.value)} required />
            <Select label="Job title" placeholder="Select level" options={JOB_LEVELS} value={form.job_title} onChange={(e) => set("job_title", e.target.value)} required />
            <Select label="Education" placeholder="Select education" options={EDUCATION_LEVELS} value={form.education} onChange={(e) => set("education", e.target.value)} required />
            <Field label="Years of experience" type="number" min={0} value={form.years_experience}
              onChange={(e) => set("years_experience", e.target.value)} required />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="btn-primary w-full justify-center !py-3 disabled:opacity-60">
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
        {price > 0 ? "Continue to Payment" : "Register Now"}
      </button>
      <p className="text-[11px] text-sand-500 text-center">No account needed — just the details above.</p>
    </form>
  );
}
