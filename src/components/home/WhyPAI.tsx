"use client";

import { motion } from "framer-motion";
import { Shield, Briefcase, GraduationCap, Globe2, Zap, Award } from "lucide-react";

const REASONS = [
  {
    icon: Briefcase,
    title: "Built around what employers actually ask for",
    description:
      "Every competency in the CAIP maps to a real job requirement. We built the curriculum by interviewing hiring managers, not by browsing LinkedIn job posts.",
    color: "bg-navy-50 text-navy-700",
    border: "border-navy-200",
  },
  {
    icon: Shield,
    title: "Exam-based, not course-completion based",
    description:
      "You don't earn a PAI credential by finishing videos. You pass a proctored exam. That's the distinction employers care about and why the credential holds value.",
    color: "bg-gold-50 text-gold-700",
    border: "border-gold-200",
  },
  {
    icon: GraduationCap,
    title: "No coding, no math — just applied AI",
    description:
      "The CAIP is for the person running the team, not building the model. If you can run a meeting and read a spreadsheet, you have the background you need.",
    color: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-200",
  },
  {
    icon: Zap,
    title: "Self-paced with a real deadline",
    description:
      "You get 12 months from enrollment to complete the program and sit the exam. Enough flexibility to fit a full-time job. Enough structure to actually finish.",
    color: "bg-blue-50 text-blue-700",
    border: "border-blue-200",
  },
  {
    icon: Globe2,
    title: "Your credential works wherever you do",
    description:
      "We're a global body. Whether you're in Toronto, London, or Singapore — the CAIP is verifiable, stackable on LinkedIn, and understood across industries.",
    color: "bg-purple-50 text-purple-700",
    border: "border-purple-200",
  },
  {
    icon: Award,
    title: "Designed to stay relevant, not just current",
    description:
      "AI moves fast. Your credential renews every 3 years with continuing education — so what's on your resume reflects where the field actually is, not where it was.",
    color: "bg-rose-50 text-rose-700",
    border: "border-rose-200",
  },
];

export default function WhyPAI() {
  return (
    <section id="why-pai" className="section-padding bg-white">
      <div className="container-lg">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <p className="section-label">Why PAI</p>
          <h2 className="section-title mb-4">
            Not another online course.<br />
            <span className="gold-text">A professional credential.</span>
          </h2>
          <p className="text-slate-500 text-base leading-relaxed">
            There are hundreds of AI courses. PAI exists because finishing a course
            and being professionally certified are two different things — and employers
            have started telling us they can't tell the difference anymore.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {REASONS.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className={`card-base p-7 border ${reason.border} group`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${reason.color}`}>
                <reason.icon size={20} />
              </div>
              <h3 className="text-navy-900 font-display font-bold text-base mb-3 leading-snug group-hover:text-navy-700 transition-colors">
                {reason.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{reason.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
