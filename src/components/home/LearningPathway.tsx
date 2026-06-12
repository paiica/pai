"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";

const PATHWAY = [
  {
    level: "Level 1",
    title: "AI Foundations",
    description: "Build your AI literacy baseline. Understand core concepts, terminology, and the AI technology landscape.",
    duration: "2–3 weeks",
    format: "Self-paced modules",
    badge: "🌱",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    levelColor: "bg-emerald-500",
    href: "/certifications",
    cta: "Start Free",
    available: true,
  },
  {
    level: "Level 2",
    title: "Certified AI Professional (CAIP)",
    description: "The core professional credential. Master applied AI for business, strategy, ethics, and leadership.",
    duration: "6–8 weeks",
    format: "Structured program + exam",
    badge: "🏆",
    color: "bg-gold-50 border-gold-300 text-gold-800",
    levelColor: "bg-gold-500",
    href: "/certifications/certified-ai-professional",
    cta: "Enroll Now",
    available: true,
    featured: true,
  },
  {
    level: "Level 3",
    title: "Specialization Certifications",
    description: "Deepen expertise in your domain — AI Manager, AI Educator, or AI Data Analyst credentials.",
    duration: "8–10 weeks",
    format: "Specialized programs + exam",
    badge: "🎯",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    levelColor: "bg-blue-500",
    href: "/certifications",
    cta: "Coming Soon",
    available: false,
  },
  {
    level: "Level 4",
    title: "Executive AI Leadership",
    description: "Board-level AI strategy, governance, and enterprise transformation for C-suite and senior leaders.",
    duration: "10–12 weeks",
    format: "Executive program + practicum",
    badge: "👑",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    levelColor: "bg-purple-500",
    href: "/certifications",
    cta: "Coming Soon",
    available: false,
  },
];

export default function LearningPathway() {
  return (
    <section id="learning-path" className="section-padding bg-white">
      <div className="container-lg">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="section-label">Structured Progression</p>
          <h2 className="section-title mb-5">
            Your <span className="gold-text">AI Career Path</span>
          </h2>
          <p className="section-subtitle mx-auto">
            A clear, structured progression from AI fundamentals to executive leadership.
            Each level builds on the last.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {PATHWAY.map((step, i) => (
            <motion.div
              key={step.level}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div
                className={`relative border-2 rounded-2xl p-6 transition-all duration-300 ${step.color} ${
                  step.featured ? "ring-2 ring-gold-400 ring-offset-2 shadow-gold" : ""
                }`}
              >
                {step.featured && (
                  <div className="absolute -top-3 left-6 bg-gold-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </div>
                )}

                <div className="flex items-start gap-5">
                  {/* Level indicator */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl ${step.levelColor} text-white flex items-center justify-center text-xl shadow-md`}
                    >
                      {step.badge}
                    </div>
                    <span className="text-xs font-bold mt-2 opacity-70 uppercase tracking-wide">
                      {step.level}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-xl mb-2">{step.title}</h3>
                    <p className="text-sm leading-relaxed opacity-80 mb-4">{step.description}</p>

                    <div className="flex flex-wrap gap-3 mb-4">
                      <span className="text-xs font-semibold bg-white/60 px-3 py-1 rounded-full border border-current/20">
                        ⏱ {step.duration}
                      </span>
                      <span className="text-xs font-semibold bg-white/60 px-3 py-1 rounded-full border border-current/20">
                        📋 {step.format}
                      </span>
                    </div>

                    {step.available ? (
                      <Link
                        href={step.href}
                        className={`inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 ${
                          step.featured
                            ? "bg-gold-500 hover:bg-gold-400 text-white shadow-gold hover:-translate-y-0.5"
                            : "bg-white/70 hover:bg-white text-current"
                        }`}
                      >
                        {step.cta}
                        <ArrowRight size={14} />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl bg-white/40 text-current opacity-60 cursor-not-allowed">
                        {step.cta}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector */}
              {i < PATHWAY.length - 1 && (
                <div className="flex justify-center my-2">
                  <ArrowDown size={20} className="text-slate-300" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/learning-path"
            className="inline-flex items-center gap-2 text-navy-700 hover:text-navy-900 font-semibold text-sm group"
          >
            View Full Learning Path Details
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

