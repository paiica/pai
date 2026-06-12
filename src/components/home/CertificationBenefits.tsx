"use client";

import { motion } from "framer-motion";
import { TrendingUp, Linkedin, FileCheck, Users, BadgeCheck, RefreshCw } from "lucide-react";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Career Advancement",
    description: "PAI-certified professionals report faster promotions and expanded responsibilities in AI-related roles.",
    stat: "+42%",
    statLabel: "salary increase",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: BadgeCheck,
    title: "Verified Digital Badge",
    description: "Receive a shareable digital badge and certificate you can display on LinkedIn, resumes, and email signatures.",
    stat: "1M+",
    statLabel: "badge views",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: Linkedin,
    title: "LinkedIn Integration",
    description: "Add your PAI credential directly to your LinkedIn profile with one click. Verified by PAI instantly.",
    stat: "3x",
    statLabel: "more recruiter views",
    color: "text-[#0077B5]",
    bg: "bg-blue-50",
  },
  {
    icon: Users,
    title: "Professional Community",
    description: "Join a global community of PAI-certified professionals. Access networking events, forums, and peer groups.",
    stat: "3,200+",
    statLabel: "active members",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: FileCheck,
    title: "Verifiable Credential",
    description: "Every PAI certificate includes a unique ID that employers can verify instantly at verify.professionalaiinstitute.com",
    stat: "100%",
    statLabel: "fraud-proof",
    color: "text-gold-600",
    bg: "bg-gold-50",
  },
  {
    icon: RefreshCw,
    title: "Stay Current",
    description: "AI evolves fast. PAI credentials include continuing education requirements to keep your knowledge current.",
    stat: "3 yr",
    statLabel: "validity + renewal",
    color: "text-navy-600",
    bg: "bg-navy-50",
  },
];

export default function CertificationBenefits() {
  return (
    <section id="benefits" className="section-padding bg-navy-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-10">
        <div
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.5) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
          className="w-full h-full"
        />
      </div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-[100px]" />

      <div className="container-lg relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-gold-400 font-semibold text-sm uppercase tracking-widest mb-3">
            Certification Benefits
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-tight mb-5">
            What Your PAI Credential
            <span className="shimmer-text"> Unlocks</span>
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">
            A PAI certification is more than a course completion badge — it&apos;s a
            professionally validated credential that employers recognize and value.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-navy-900/50 backdrop-blur-sm border border-navy-800/50 rounded-2xl p-6 hover:border-gold-500/30 transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${benefit.bg}`}>
                <benefit.icon size={22} className={benefit.color} />
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-display font-black text-gold-400">{benefit.stat}</span>
                <span className="text-xs text-white/50 font-medium">{benefit.statLabel}</span>
              </div>

              <h3 className="text-white font-display font-bold text-lg mb-3 group-hover:text-gold-300 transition-colors">
                {benefit.title}
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
