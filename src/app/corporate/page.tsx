"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Building2, Users, BarChart3, Headphones, CheckCircle2, ArrowRight,
  Award, Shield, Zap, Mail, Phone, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  {
    icon: Users,
    title: "Team Certifications",
    description: "Enroll 5 to 500+ employees in CAIP and other PAI programs with volume pricing.",
    detail: "Save up to 40% with group enrollment",
  },
  {
    icon: BarChart3,
    title: "Admin Analytics Dashboard",
    description: "Track team progress, completion rates, and exam results in real-time.",
    detail: "Full visibility across your organization",
  },
  {
    icon: Building2,
    title: "Custom Branding",
    description: "Co-branded certificate portal and certificates with your organization's name.",
    detail: "Available for 25+ seat accounts",
  },
  {
    icon: Headphones,
    title: "Dedicated Account Manager",
    description: "A named contact who manages your program, answers questions, and ensures success.",
    detail: "Included with all corporate accounts",
  },
  {
    icon: Shield,
    title: "Compliance Reporting",
    description: "Generate reports for HR records, compliance requirements, and audit trails.",
    detail: "CSV export and scheduled reports",
  },
  {
    icon: Zap,
    title: "Priority Exam Scheduling",
    description: "Corporate accounts get priority access to exam time slots and virtual proctoring.",
    detail: "No wait times for your team",
  },
];

const PRICING = [
  {
    name: "Team",
    seats: "5–24 seats",
    discount: "15% off",
    price: "$421",
    priceSuffix: "per seat",
    originalPrice: "$495",
    features: ["All CAIP program features", "Team admin dashboard", "Volume invoice", "Dedicated onboarding call"],
    cta: "Get Team Quote",
    featured: false,
  },
  {
    name: "Business",
    seats: "25–99 seats",
    discount: "25% off",
    price: "$371",
    priceSuffix: "per seat",
    originalPrice: "$495",
    features: [
      "Everything in Team",
      "Custom branding on certificates",
      "Priority exam scheduling",
      "Compliance reporting",
      "Dedicated account manager",
    ],
    cta: "Get Business Quote",
    featured: true,
  },
  {
    name: "Enterprise",
    seats: "100+ seats",
    discount: "Custom pricing",
    price: "Custom",
    priceSuffix: "tailored to your needs",
    originalPrice: null,
    features: [
      "Everything in Business",
      "Custom certification tracks",
      "LMS integration (SCORM/xAPI)",
      "Executive analytics reporting",
      "SLA agreement",
      "On-site training available",
    ],
    cta: "Contact Sales",
    featured: false,
  },
];

function ContactForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    toast.success("Message received! Our team will contact you within 1 business day.");
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { id: "firstName", label: "First Name", type: "text", required: true },
          { id: "lastName", label: "Last Name", type: "text", required: true },
          { id: "email", label: "Work Email", type: "email", required: true },
          { id: "phone", label: "Phone Number", type: "tel", required: false },
          { id: "company", label: "Company Name", type: "text", required: true },
          { id: "jobTitle", label: "Job Title", type: "text", required: true },
        ].map(field => (
          <div key={field.id}>
            <label htmlFor={field.id} className="block text-sm font-semibold text-slate-700 mb-1.5">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              required={field.required}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-colors"
              placeholder={`Your ${field.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      <div>
        <label htmlFor="seats" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Estimated Team Size <span className="text-red-500">*</span>
        </label>
        <select
          id="seats"
          name="seats"
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-colors bg-white"
        >
          <option value="">Select team size</option>
          <option>5–10 employees</option>
          <option>11–24 employees</option>
          <option>25–49 employees</option>
          <option>50–99 employees</option>
          <option>100–249 employees</option>
          <option>250+ employees</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
          Tell Us About Your Goals
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none text-slate-900 text-sm transition-colors resize-none"
          placeholder="What are your organization's AI upskilling goals? Any specific timeline or requirements?"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-gold hover:shadow-lg hover:-translate-y-0.5 disabled:translate-y-0 text-base"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <MessageSquare size={18} />
            Send Inquiry
          </>
        )}
      </button>
      <p className="text-center text-xs text-slate-400">
        We respond to all corporate inquiries within 1 business day.
      </p>
    </form>
  );
}

export default function CorporatePage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-32 bg-hero-pattern relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.8) 1px, transparent 0)", backgroundSize: "40px 40px" }}
          />
          <div className="container-lg relative text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gold-500/15 border border-gold-500/30 text-gold-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-6">
              <Building2 size={12} />
              Corporate Training
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-white mb-5">
              AI Certification for Your Entire Team
            </h1>
            <p className="text-xl text-white/70 leading-relaxed">
              Upskill your workforce with industry-recognized AI credentials. PAI Corporate
              Training delivers structured certification programs for teams of 5 to 500+.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none">
              <path d="M0 60L1440 60V30C1440 30 1080 0 720 0C360 0 0 30 0 30V60Z" fill="white" />
            </svg>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="text-center mb-14">
              <p className="section-label">What's Included</p>
              <h2 className="section-title mb-4">
                Everything Your Team <span className="gold-text">Needs</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((feature, i) => (
                <div key={feature.title} className="card-base p-6 border border-slate-100">
                  <div className="w-11 h-11 bg-navy-50 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon size={20} className="text-navy-700" />
                  </div>
                  <h3 className="font-display font-bold text-navy-900 text-base mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-3">{feature.description}</p>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gold-600">
                    <CheckCircle2 size={12} />
                    {feature.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="section-padding bg-slate-50">
          <div className="container-lg">
            <div className="text-center mb-14">
              <p className="section-label">Corporate Pricing</p>
              <h2 className="section-title mb-4">
                Volume <span className="gold-text">Pricing</span>
              </h2>
              <p className="section-subtitle mx-auto">
                All plans include the full CAIP program. Add-on programs available.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PRICING.map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white rounded-2xl p-7 transition-all duration-300 ${
                    plan.featured
                      ? "border-2 border-gold-400 shadow-gold ring-2 ring-gold-400/20"
                      : "border border-slate-200 shadow-card hover:shadow-card-hover"
                  }`}
                >
                  {plan.featured && (
                    <div className="bg-gold-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide w-fit mb-4">
                      Most Popular
                    </div>
                  )}
                  <div className="font-display font-black text-navy-900 text-2xl mb-1">{plan.name}</div>
                  <div className="text-slate-500 text-sm mb-4">{plan.seats}</div>
                  <div className="mb-5">
                    <div className="text-3xl font-display font-black text-navy-900">{plan.price}</div>
                    <div className="text-slate-500 text-sm">{plan.priceSuffix}</div>
                    {plan.originalPrice && (
                      <div className="text-xs text-emerald-600 font-semibold mt-1">
                        {plan.discount} — was {plan.originalPrice}/seat
                      </div>
                    )}
                    {!plan.originalPrice && (
                      <div className="text-xs text-gold-600 font-semibold mt-1">{plan.discount}</div>
                    )}
                  </div>
                  <div className="space-y-2.5 mb-7">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}
                  </div>
                  <a
                    href="#contact"
                    className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all text-sm ${
                      plan.featured
                        ? "bg-gold-500 hover:bg-gold-400 text-white shadow-gold"
                        : "bg-navy-800 hover:bg-navy-700 text-white"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="section-padding bg-white">
          <div className="container-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div>
                <p className="section-label">Get In Touch</p>
                <h2 className="section-title mb-4">
                  Request a <span className="gold-text">Corporate Quote</span>
                </h2>
                <p className="text-slate-600 leading-relaxed mb-8">
                  Fill out the form and our team will contact you within 1 business day with
                  a custom quote and a complimentary program overview.
                </p>
                <div className="space-y-5">
                  {[
                    { Icon: Mail, label: "Email", value: "corporate@professionalaiinstitute.com", href: "mailto:corporate@professionalaiinstitute.com" },
                    { Icon: Phone, label: "Sales Line", value: "+1 (800) PAI-CERT", href: "tel:+18007242378" },
                    { Icon: MessageSquare, label: "Response Time", value: "Within 1 business day", href: null },
                  ].map(({ Icon, label, value, href }) => (
                    <div key={label} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gold-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-gold-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{label}</div>
                        {href ? (
                          <a href={href} className="text-navy-900 font-semibold text-sm hover:text-gold-600 transition-colors">
                            {value}
                          </a>
                        ) : (
                          <div className="text-navy-900 font-semibold text-sm">{value}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

