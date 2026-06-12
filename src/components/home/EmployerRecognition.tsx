"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle2 } from "lucide-react";

const EMPLOYER_LOGOS = [
  "Deloitte", "KPMG", "Accenture", "IBM", "Microsoft",
  "Salesforce", "Oracle", "SAP", "McKinsey", "PwC",
];

const ENDORSEMENTS = [
  {
    quote: "We require CAIP certification for all managers involved in AI procurement decisions.",
    author: "Chief Digital Officer",
    company: "Fortune 500 Financial Services",
  },
  {
    quote: "PAI credentials give us a standardized way to verify AI literacy across our global teams.",
    author: "VP of Talent",
    company: "Global Management Consulting Firm",
  },
  {
    quote: "CAIP-certified employees demonstrate significantly better AI project outcomes.",
    author: "Director of Innovation",
    company: "Healthcare Technology Company",
  },
];

export default function EmployerRecognition() {
  return (
    <section id="employer-recognition" className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="section-label">Employer Recognition</p>
          <h2 className="section-title mb-5">
            Recognized by <span className="gold-text">Top Employers</span>
          </h2>
          <p className="section-subtitle mx-auto">
            PAI credentials are actively sought by leading organizations worldwide as proof of
            professional AI competency.
          </p>
        </div>

        {/* Logo strip */}
        <div className="relative overflow-hidden mb-16">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex gap-12 items-center"
          >
            {[...EMPLOYER_LOGOS, ...EMPLOYER_LOGOS].map((logo, i) => (
              <div
                key={`${logo}-${i}`}
                className="flex-shrink-0 h-12 px-8 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center"
              >
                <span className="text-slate-400 font-display font-black text-lg tracking-wide">{logo}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Benefits for employers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-16">
          <div>
            <p className="section-label">For HR & Hiring Managers</p>
            <h3 className="text-2xl md:text-3xl font-display font-bold text-navy-900 mb-6">
              A Trusted Signal of AI Readiness
            </h3>
            <div className="space-y-4">
              {[
                "Standardized AI competency verification across candidates",
                "Reduces hiring risk for AI-adjacent roles",
                "Maps to real workplace AI skill requirements",
                "Instant certificate verification at our verify portal",
                "Supports workforce AI upskilling programs",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-gold-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600 text-sm leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-4">
              <a
                href="/corporate"
                className="btn-primary text-sm"
              >
                <Building2 size={16} />
                Corporate Training →
              </a>
              <a
                href="/verify"
                className="btn-outline text-sm"
              >
                Verify a Certificate →
              </a>
            </div>
          </div>

          {/* Endorsement cards */}
          <div className="space-y-4">
            {ENDORSEMENTS.map((endorsement, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card-base p-5 border-l-4 border-gold-400"
              >
                <p className="text-slate-700 text-sm leading-relaxed italic mb-3">
                  &ldquo;{endorsement.quote}&rdquo;
                </p>
                <div>
                  <div className="text-navy-900 font-semibold text-xs">{endorsement.author}</div>
                  <div className="text-slate-500 text-xs">{endorsement.company}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
