"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import Link from "next/link";

const FAQS = [
  {
    q: "What is the Professional AI Institute (PAI)?",
    a: "PAI is an independent, professional certification body dedicated to establishing and maintaining industry standards for AI competency verification. We are not a course marketplace — we are a credentialing organization similar to PMI (for project management) or SHRM (for HR professionals), but focused on AI skills for business professionals.",
  },
  {
    q: "Who is the CAIP designed for?",
    a: "The Certified AI Professional (CAIP) is designed for business professionals, managers, educators, analysts, small business owners, and corporate teams who want to demonstrate AI competency without a technical background. It focuses on applied AI literacy, strategy, ethics, and tools — not coding or data science.",
  },
  {
    q: "Is there a prerequisite to enroll in the CAIP program?",
    a: "No prerequisites are required. The CAIP is intentionally designed for professionals without a technical or data science background. Basic computer literacy and professional work experience are sufficient.",
  },
  {
    q: "How is PAI different from online courses on Udemy, Coursera, or LinkedIn Learning?",
    a: "PAI is a professional certification body, not a learning platform. The key difference: our credentials are standardized, examination-based, and have a defined industry standard behind them. Employers can verify our certificates independently. We set competency standards and validate that candidates meet those standards — similar to how CPA or PMP certifications work.",
  },
  {
    q: "How long does it take to prepare for and pass the CAIP exam?",
    a: "Most learners complete the CAIP program in 6–8 weeks studying 3–5 hours per week. You have 12 months from enrollment to complete the program and take the exam. The exam itself is 90 minutes with 75 questions.",
  },
  {
    q: "How can employers verify a PAI certificate?",
    a: "Every PAI certificate includes a unique Certificate ID (e.g., CAIP-2026-00001). Employers can verify any certificate instantly at our public verification portal at /verify. No login required.",
  },
  {
    q: "What happens after I earn my CAIP?",
    a: "You receive a digital certificate, a shareable digital badge for LinkedIn and your resume, and your credential is added to the PAI public registry. Your certificate is valid for 3 years. To maintain it, you earn 30 Professional Development Units (PDUs) through continuing education.",
  },
  {
    q: "Does PAI offer group or corporate pricing?",
    a: "Yes. We offer volume pricing for organizations enrolling 5 or more employees. Corporate customers also get access to a team dashboard, progress tracking, and a dedicated account manager. Contact us at our Corporate Training page for a custom quote.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="section-padding bg-slate-50">
      <div className="container-lg">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="section-label">Common Questions</p>
          <h2 className="section-title mb-5">
            Frequently Asked <span className="gold-text">Questions</span>
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                openIndex === i
                  ? "border-gold-300 shadow-card"
                  : "border-slate-100 shadow-sm hover:border-slate-200"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                aria-expanded={openIndex === i}
              >
                <span
                  className={`font-display font-bold text-base transition-colors ${
                    openIndex === i ? "text-navy-900" : "text-slate-800"
                  }`}
                >
                  {faq.q}
                </span>
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    openIndex === i ? "bg-gold-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {openIndex === i ? <Minus size={14} /> : <Plus size={14} />}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-5 pb-5">
                      <div className="h-px bg-slate-100 mb-4" />
                      <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm mb-3">Still have questions?</p>
          <Link
            href="/corporate#contact"
            className="inline-flex items-center gap-2 text-navy-700 hover:text-navy-900 font-semibold text-sm underline underline-offset-4"
          >
            Contact our team →
          </Link>
        </div>
      </div>
    </section>
  );
}

