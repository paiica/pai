"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Building2, Users, BarChart3, Headphones, CheckCircle2, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Team Certifications", desc: "Volume licensing for 5–500+ employees" },
  { icon: BarChart3, title: "Progress Tracking", desc: "Admin dashboard for team analytics" },
  { icon: Building2, title: "Custom Branding", desc: "Co-branded certificates and portals" },
  { icon: Headphones, title: "Dedicated Support", desc: "Dedicated account manager included" },
];

export default function CorporateTrainingSection() {
  return (
    <section id="corporate" className="section-padding bg-white">
      <div className="container-lg">
        <div className="bg-hero-pattern rounded-3xl overflow-hidden shadow-navy">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left content */}
            <div className="p-10 lg:p-16">
              <p className="text-gold-400 font-semibold text-sm uppercase tracking-widest mb-4">
                For Organizations
              </p>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-5 leading-tight">
                Upskill Your Entire Team with AI Certifications
              </h2>
              <p className="text-white/70 leading-relaxed mb-8">
                PAI Corporate Training brings structured AI certification programs to your workforce.
                From frontline employees to senior executives, we help organizations build genuine
                AI competency at scale.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <feature.icon size={14} className="text-gold-400" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{feature.title}</div>
                      <div className="text-white/50 text-xs mt-0.5">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/corporate"
                  className="inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-gold hover:-translate-y-0.5"
                >
                  <Building2 size={16} />
                  Get Corporate Pricing
                </Link>
                <Link
                  href="/corporate#contact"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200"
                >
                  Contact Sales →
                </Link>
              </div>
            </div>

            {/* Right visual */}
            <div className="relative p-10 lg:p-16 flex items-center justify-center bg-navy-900/30">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 w-full max-w-sm"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gold-500 flex items-center justify-center">
                    <Building2 size={18} className="text-navy-900" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">Corporate Dashboard</div>
                    <div className="text-white/50 text-xs">Team Overview</div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    { name: "AI Foundations", progress: 100, enrolled: 45 },
                    { name: "CAIP Program", progress: 72, enrolled: 38 },
                    { name: "Ethics Module", progress: 91, enrolled: 45 },
                  ].map((item) => (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-white/70">{item.name}</span>
                        <span className="text-white/50">{item.enrolled} enrolled</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.progress}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-gold-400 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "45", label: "Enrolled" },
                    { value: "28", label: "Certified" },
                    { value: "89%", label: "Pass Rate" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-gold-400 font-display font-black text-xl">{stat.value}</div>
                      <div className="text-white/50 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

