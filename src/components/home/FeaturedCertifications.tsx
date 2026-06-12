"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock, Award, Lock } from "lucide-react";
import { CERTIFICATIONS } from "@/lib/certifications-data";
import { formatCurrency } from "@/lib/utils";

const LEVEL_COLORS: Record<string, string> = {
  foundation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  professional: "bg-blue-50 text-blue-700 border-blue-200",
  specialist: "bg-purple-50 text-purple-700 border-purple-200",
  executive: "bg-gold-50 text-gold-700 border-gold-200",
};

export default function FeaturedCertifications() {
  return (
    <section id="certifications" className="section-padding bg-slate-50">
      <div className="container-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="section-label">Certification Catalog</p>
            <h2 className="section-title">
              Our <span className="gold-text">Credentials</span>
            </h2>
          </div>
          <Link
            href="/certifications"
            className="inline-flex items-center gap-2 text-navy-700 hover:text-navy-900 font-semibold text-sm group"
          >
            View All Certifications
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {CERTIFICATIONS.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative bg-white rounded-2xl border border-slate-100 overflow-hidden group transition-all duration-300 ${
                cert.status === "active"
                  ? "shadow-card hover:shadow-card-hover hover:-translate-y-1 cursor-pointer"
                  : "opacity-80"
              }`}
            >
              {/* Top accent bar */}
              <div
                className={`h-1.5 ${
                  cert.status === "active"
                    ? "bg-gradient-to-r from-gold-400 to-gold-600"
                    : "bg-slate-200"
                }`}
              />

              {cert.status === "coming_soon" && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full">
                  <Lock size={10} />
                  Coming Soon
                </div>
              )}

              <div className="p-6">
                {/* Badge icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 ${
                    cert.status === "active"
                      ? "bg-gradient-to-br from-gold-100 to-gold-200 shadow-gold/30 shadow-md"
                      : "bg-slate-100"
                  }`}
                >
                  {cert.badge_icon}
                </div>

                {/* Level badge */}
                <span
                  className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border capitalize mb-4 ${
                    LEVEL_COLORS[cert.level]
                  }`}
                >
                  {cert.level} Level
                </span>

                {/* Acronym + Title */}
                <div className="mb-3">
                  <div className="text-gold-600 font-display font-black text-2xl leading-none mb-1">
                    {cert.acronym}
                  </div>
                  <h3 className="text-navy-900 font-display font-bold text-base leading-snug">
                    {cert.title}
                  </h3>
                </div>

                <p className="text-slate-500 text-xs leading-relaxed mb-5 line-clamp-3">
                  {cert.description}
                </p>

                {/* Meta */}
                {cert.status === "active" && (
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gold-500" />
                      {cert.duration_weeks} weeks
                    </div>
                    <div className="font-bold text-navy-900 text-sm">
                      {formatCurrency(cert.price)}
                    </div>
                  </div>
                )}

                {/* CTA */}
                {cert.status === "active" ? (
                  <Link
                    href={`/certifications/${cert.slug}`}
                    className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all group-hover:bg-gold-500 group-hover:text-white"
                  >
                    View Details
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-semibold text-sm py-2.5 rounded-xl cursor-not-allowed"
                  >
                    Notify Me
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

