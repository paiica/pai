"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Certification } from "@/types";
import {
  CheckCircle2, ChevronRight, Eye, EyeOff, Award, Clock,
  BookOpen, Shield, AlertCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh",
  "Belgium","Brazil","Canada","Chile","China","Colombia","Czech Republic","Denmark",
  "Egypt","Finland","France","Germany","Ghana","Greece","Hungary","India","Indonesia",
  "Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan","Kenya","Malaysia",
  "Mexico","Morocco","Netherlands","New Zealand","Nigeria","Norway","Pakistan",
  "Philippines","Poland","Portugal","Romania","Russia","Saudi Arabia","Singapore",
  "South Africa","South Korea","Spain","Sweden","Switzerland","Taiwan","Thailand",
  "Turkey","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Vietnam","Other",
];

const HOW_HEARD = [
  "Google / Web Search",
  "LinkedIn",
  "Colleague or Friend",
  "Social Media (Instagram / X / Facebook)",
  "University or School",
  "Corporate Training Program",
  "Conference or Event",
  "Other",
];

interface FormData {
  full_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  gender: string;
  country: string;
  career_status: "professional" | "student" | "other";
  job_title: string;
  company: string;
  years_experience: string;
  linkedin_url: string;
  university: string;
  degree: string;
  graduation_year: string;
  other_background: string;
  motivation: string;
  how_heard: string;
}

const EMPTY: FormData = {
  full_name: "", email: "", password: "",
  date_of_birth: "", gender: "", country: "",
  career_status: "professional",
  job_title: "", company: "", years_experience: "", linkedin_url: "",
  university: "", degree: "", graduation_year: "", other_background: "",
  motivation: "", how_heard: "",
};

export default function ApplicationForm({
  cert,
  user,
}: {
  cert: Certification;
  user: User | null;
}) {
  const loggedIn = !!user;
  const totalSteps = loggedIn ? 4 : 5;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    ...EMPTY,
    full_name: (user?.user_metadata?.full_name as string) || "",
    email: user?.email || "",
  });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  // Step labels & numbers (adjusted for logged-in users skipping account step)
  const stepOffset = loggedIn ? 0 : 1;
  const STEP_LABELS = [
    ...(!loggedIn ? ["Account"] : []),
    "Personal",
    "Background",
    "Motivation",
    "Review & Pay",
  ];

  // Actual form step numbers:
  // Logged in:  1=Personal, 2=Background, 3=Motivation, 4=Review
  // Not logged: 1=Account, 2=Personal, 3=Background, 4=Motivation, 5=Review

  const accountStep = loggedIn ? null : 1;
  const personalStep = loggedIn ? 1 : 2;
  const backgroundStep = loggedIn ? 2 : 3;
  const motivationStep = loggedIn ? 3 : 4;
  const reviewStep = loggedIn ? 4 : 5;

  function validate(): boolean {
    const e: Partial<FormData> = {};

    if (step === accountStep) {
      if (!form.full_name.trim()) e.full_name = "Required";
      if (!form.email.trim()) e.email = "Required";
      if (!form.password || form.password.length < 8) e.password = "Min 8 characters";
    }

    if (step === personalStep) {
      if (!form.date_of_birth) e.date_of_birth = "Required";
      if (!form.gender) e.gender = "Required";
      if (!form.country) e.country = "Required";
    }

    if (step === backgroundStep) {
      if (form.career_status === "professional") {
        if (!form.job_title.trim()) e.job_title = "Required";
        if (!form.company.trim()) e.company = "Required";
        if (!form.years_experience) e.years_experience = "Required";
      }
      if (form.career_status === "student") {
        if (!form.university.trim()) e.university = "Required";
        if (!form.degree.trim()) e.degree = "Required";
      }
      if (form.career_status === "other") {
        if (!form.other_background.trim()) e.other_background = "Required";
      }
    }

    if (step === motivationStep) {
      if (!form.motivation.trim() || form.motivation.trim().length < 50)
        e.motivation = "Please write at least 50 characters";
      if (!form.how_heard) e.how_heard = "Required";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validate()) setStep(s => s + 1);
  }

  function back() {
    setStep(s => s - 1);
    setErrors({});
  }

  async function handleSubmit() {
    setLoading(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificationSlug: cert.slug, formData: form }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  const totalHours = cert.curriculum.reduce((s, m) => s + m.duration_hours, 0);
  const totalLessons = cert.curriculum.reduce((s, m) => s + m.lessons.length, 0);

  const inputCls = (field: keyof FormData) =>
    cn(
      "w-full px-4 py-3 rounded-xl border-2 text-sm outline-none transition-all text-slate-900",
      errors[field]
        ? "border-red-300 bg-red-50 focus:border-red-400"
        : "border-slate-200 bg-white focus:border-navy-400 focus:ring-4 focus:ring-navy-100"
    );

  const Field = ({
    label,
    field,
    type = "text",
    placeholder = "",
    required = true,
    children,
  }: {
    label: string;
    field: keyof FormData;
    type?: string;
    placeholder?: string;
    required?: boolean;
    children?: React.ReactNode;
  }) => (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children || (
        <input
          type={type}
          value={form[field]}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          className={inputCls(field)}
        />
      )}
      {errors[field] && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle size={11} /> {errors[field]}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="PAI" width={200} height={100} className="h-9 w-auto" priority />
          </Link>
          <div className="text-xs text-slate-400 font-medium">
            Applying for <span className="text-navy-800 font-bold">{cert.acronym}</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* ── Form Column ── */}
          <div className="lg:col-span-2">
            {/* Step Indicator */}
            <div className="flex items-center gap-0 mb-8">
              {STEP_LABELS.map((label, i) => {
                const sNum = i + 1;
                const done = step > sNum;
                const active = step === sNum;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                        done ? "bg-emerald-500 text-white" :
                        active ? "bg-navy-800 text-white" :
                        "bg-slate-200 text-slate-400"
                      )}>
                        {done ? <CheckCircle2 size={14} /> : sNum}
                      </div>
                      <span className={cn(
                        "text-[10px] mt-1 font-semibold hidden sm:block",
                        active ? "text-navy-800" : done ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={cn("flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all", done ? "bg-emerald-300" : "bg-slate-200")} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

              {/* ── Step 1: Account ── */}
              {step === accountStep && (
                <div>
                  <h2 className="text-xl font-display font-black text-navy-900 mb-1">Create Your Account</h2>
                  <p className="text-slate-400 text-sm mb-6">
                    Already have an account?{" "}
                    <Link href={`/login?redirect=/apply/${cert.slug}`} className="text-navy-700 font-semibold hover:text-navy-900">
                      Sign in →
                    </Link>
                  </p>
                  <div className="space-y-4">
                    <Field label="Full Name" field="full_name" placeholder="Your full name" />
                    <Field label="Email Address" field="email" type="email" placeholder="you@example.com" />
                    <Field label="Password" field="password">
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"}
                          value={form.password}
                          onChange={e => set("password", e.target.value)}
                          placeholder="Minimum 8 characters"
                          className={cn(inputCls("password"), "pr-12")}
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.password}</p>}
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Step: Personal ── */}
              {step === personalStep && (
                <div>
                  <h2 className="text-xl font-display font-black text-navy-900 mb-1">Personal Information</h2>
                  <p className="text-slate-400 text-sm mb-6">Basic information for your application record.</p>
                  <div className="space-y-4">
                    <Field label="Date of Birth" field="date_of_birth" type="date" />
                    <Field label="Gender" field="gender">
                      <select value={form.gender} onChange={e => set("gender", e.target.value)} className={inputCls("gender")}>
                        <option value="">Select gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-binary</option>
                        <option>Prefer not to say</option>
                      </select>
                      {errors.gender && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.gender}</p>}
                    </Field>
                    <Field label="Country" field="country">
                      <select value={form.country} onChange={e => set("country", e.target.value)} className={inputCls("country")}>
                        <option value="">Select your country</option>
                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      {errors.country && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.country}</p>}
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Step: Background ── */}
              {step === backgroundStep && (
                <div>
                  <h2 className="text-xl font-display font-black text-navy-900 mb-1">Your Background</h2>
                  <p className="text-slate-400 text-sm mb-6">Tell us about your professional or academic background.</p>
                  <div className="space-y-5">
                    {/* Career status */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">I am currently a <span className="text-red-400">*</span></label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { v: "professional", label: "Working Professional" },
                          { v: "student", label: "Student" },
                          { v: "other", label: "Other" },
                        ].map(({ v, label }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => set("career_status", v)}
                            className={cn(
                              "px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                              form.career_status === v
                                ? "border-navy-800 bg-navy-800 text-white"
                                : "border-slate-200 text-slate-600 hover:border-navy-300"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.career_status === "professional" && (
                      <>
                        <Field label="Job Title" field="job_title" placeholder="e.g. Marketing Manager" />
                        <Field label="Company / Organization" field="company" placeholder="Your employer" />
                        <Field label="Years of Professional Experience" field="years_experience">
                          <select value={form.years_experience} onChange={e => set("years_experience", e.target.value)} className={inputCls("years_experience")}>
                            <option value="">Select range</option>
                            <option value="0">Less than 1 year</option>
                            <option value="1">1–2 years</option>
                            <option value="3">3–5 years</option>
                            <option value="6">6–10 years</option>
                            <option value="11">More than 10 years</option>
                          </select>
                          {errors.years_experience && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.years_experience}</p>}
                        </Field>
                        <Field label="LinkedIn Profile URL" field="linkedin_url" placeholder="https://linkedin.com/in/..." required={false} />
                      </>
                    )}

                    {form.career_status === "student" && (
                      <>
                        <Field label="University / Institution" field="university" placeholder="e.g. University of Toronto" />
                        <Field label="Degree Program" field="degree" placeholder="e.g. BSc Computer Science" />
                        <Field label="Expected Graduation Year" field="graduation_year" type="number" placeholder="e.g. 2026" />
                        <Field label="LinkedIn Profile URL" field="linkedin_url" placeholder="https://linkedin.com/in/..." required={false} />
                      </>
                    )}

                    {form.career_status === "other" && (
                      <Field label="Please describe your background" field="other_background">
                        <textarea
                          value={form.other_background}
                          onChange={e => set("other_background", e.target.value)}
                          placeholder="Tell us about yourself..."
                          rows={3}
                          className={cn(inputCls("other_background"), "resize-none")}
                        />
                        {errors.other_background && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.other_background}</p>}
                      </Field>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step: Motivation ── */}
              {step === motivationStep && (
                <div>
                  <h2 className="text-xl font-display font-black text-navy-900 mb-1">About Your Application</h2>
                  <p className="text-slate-400 text-sm mb-6">Help us understand your goals and how you found us.</p>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Why do you want to earn the {cert.acronym}? <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={form.motivation}
                        onChange={e => set("motivation", e.target.value)}
                        placeholder="Describe your goals, how this certification will benefit your career, and what you hope to achieve..."
                        rows={5}
                        className={cn(inputCls("motivation"), "resize-none")}
                      />
                      <div className="flex items-center justify-between mt-1">
                        {errors.motivation
                          ? <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={11} />{errors.motivation}</p>
                          : <span />
                        }
                        <span className={cn("text-xs", form.motivation.length >= 50 ? "text-emerald-600" : "text-slate-400")}>
                          {form.motivation.length} / 50 min
                        </span>
                      </div>
                    </div>

                    <Field label="How did you hear about PAI?" field="how_heard">
                      <select value={form.how_heard} onChange={e => set("how_heard", e.target.value)} className={inputCls("how_heard")}>
                        <option value="">Select one</option>
                        {HOW_HEARD.map(h => <option key={h}>{h}</option>)}
                      </select>
                      {errors.how_heard && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors.how_heard}</p>}
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Step: Review ── */}
              {step === reviewStep && (
                <div>
                  <h2 className="text-xl font-display font-black text-navy-900 mb-1">Review Your Application</h2>
                  <p className="text-slate-400 text-sm mb-6">Please review the information below before proceeding to payment.</p>

                  <div className="space-y-4">
                    {[
                      {
                        title: "Account",
                        items: [
                          { label: "Name", value: form.full_name || user?.user_metadata?.full_name },
                          { label: "Email", value: form.email || user?.email },
                        ],
                      },
                      {
                        title: "Personal",
                        items: [
                          { label: "Date of Birth", value: form.date_of_birth },
                          { label: "Gender", value: form.gender },
                          { label: "Country", value: form.country },
                        ],
                      },
                      {
                        title: "Background",
                        items: [
                          { label: "Status", value: form.career_status === "professional" ? "Working Professional" : form.career_status === "student" ? "Student" : "Other" },
                          ...(form.career_status === "professional" ? [
                            { label: "Job Title", value: form.job_title },
                            { label: "Company", value: form.company },
                            { label: "Experience", value: form.years_experience ? `${form.years_experience}+ years` : "" },
                          ] : []),
                          ...(form.career_status === "student" ? [
                            { label: "University", value: form.university },
                            { label: "Degree", value: form.degree },
                          ] : []),
                          ...(form.linkedin_url ? [{ label: "LinkedIn", value: form.linkedin_url }] : []),
                        ],
                      },
                    ].map((section) => (
                      <div key={section.title} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{section.title}</h4>
                        <div className="space-y-1.5">
                          {section.items.filter(i => i.value).map(item => (
                            <div key={item.label} className="flex justify-between text-sm">
                              <span className="text-slate-500">{item.label}</span>
                              <span className="font-medium text-navy-900 text-right max-w-xs truncate">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Payment */}
                    <div className="bg-navy-900 rounded-xl p-4 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{cert.title} ({cert.acronym})</span>
                        <span className="text-2xl font-black text-gold-400">${cert.price}</span>
                      </div>
                      <div className="text-white/50 text-xs">
                        One-time application fee · Secure checkout via Stripe
                      </div>
                    </div>
                  </div>

                  {submitError && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-start gap-2">
                      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                      {submitError}
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                    By submitting, you agree to PAI&apos;s{" "}
                    <Link href="/terms" className="underline">Terms of Service</Link> and{" "}
                    <Link href="/privacy" className="underline">Privacy Policy</Link>.
                    Applications are reviewed within 3–5 business days.
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className={cn("flex mt-8 pt-6 border-t border-slate-100", step > 1 ? "justify-between" : "justify-end")}>
                {step > 1 && (
                  <button
                    onClick={back}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    ← Back
                  </button>
                )}

                {step < totalSteps ? (
                  <button
                    onClick={next}
                    className="flex items-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold px-7 py-2.5 rounded-xl transition-all text-sm"
                  >
                    Continue <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-white font-bold px-7 py-2.5 rounded-xl transition-all text-sm shadow-gold"
                  >
                    {loading ? (
                      <><Loader2 size={15} className="animate-spin" /> Processing...</>
                    ) : (
                      <>Submit & Pay ${cert.price} <Award size={15} /></>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gold-50 rounded-2xl flex items-center justify-center text-2xl">
                  {cert.badge_icon}
                </div>
                <div>
                  <div className="text-xs font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full inline-block mb-1">{cert.acronym}</div>
                  <h3 className="font-display font-bold text-navy-900 text-sm leading-tight">{cert.title}</h3>
                </div>
              </div>

              <div className="text-3xl font-display font-black text-navy-900 mb-1">${cert.price}</div>
              <div className="text-slate-400 text-xs mb-4">One-time enrollment fee</div>

              <div className="space-y-2">
                {[
                  { icon: Clock, text: `${cert.duration_weeks} weeks at your own pace` },
                  { icon: BookOpen, text: `${totalLessons} lessons across ${cert.curriculum.length} modules` },
                  { icon: Award, text: `${cert.exam_duration_minutes}-minute online exam` },
                  { icon: Shield, text: `${cert.validity_years}-year credential validity` },
                  { icon: CheckCircle2, text: "Digital certificate + badge" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-xs text-slate-600">
                    <Icon size={13} className="text-gold-500 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-navy-50 rounded-2xl border border-navy-100 p-5">
              <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2">
                <Shield size={14} className="text-gold-500" /> Application Process
              </h4>
              <ol className="space-y-2">
                {[
                  "Fill out this application",
                  "Complete payment",
                  "PAI reviews your application (3–5 days)",
                  "Receive approval email",
                  "Access the LMS and begin your course",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <span className="w-4 h-4 bg-navy-800 text-white rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-400">
                Questions?{" "}
                <a href="mailto:info@professionalaiinstitute.com" className="text-navy-600 font-semibold hover:text-navy-800">
                  Contact us
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
