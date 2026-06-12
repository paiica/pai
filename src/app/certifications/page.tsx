import { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CERTIFICATIONS } from "@/lib/certifications-data";
import { formatCurrency } from "@/lib/utils";
import { Award, Clock, CheckCircle2, Lock, ArrowRight, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Certification Catalog — All PAI Credentials",
  description:
    "Browse all Professional AI Institute certifications. Earn the CAIP, CAIM, CAIE, or CAIDA — industry-recognized AI credentials for professionals.",
};

const LEVEL_COLORS: Record<string, string> = {
  foundation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  professional: "bg-blue-50 text-blue-700 border-blue-200",
  specialist: "bg-purple-50 text-purple-700 border-purple-200",
  executive: "bg-gold-50 text-gold-700 border-gold-200",
};

export default function CertificationsPage() {
  return (
    <>
      <Header />
      <main>
        {/* Page Hero */}
        <section className="pt-28 pb-16 bg-slate-50 border-b border-slate-100">
          <div className="container-lg">
            <div className="max-w-3xl">
              <div className="badge-gold mb-6">
                <Award size={12} />
                PAI Certification Catalog
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-navy-900 mb-4">
                Professional AI Certifications
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed mb-6">
                Industry-recognized credentials for professionals who want to demonstrate AI
                competency, advance their careers, and lead AI initiatives with confidence.
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { icon: "✅", label: "Exam-based credentials" },
                  { icon: "🏢", label: "Employer-recognized" },
                  { icon: "🌍", label: "100% online" },
                  { icon: "📋", label: "No tech background required" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="space-y-6">
              {CERTIFICATIONS.map((cert) => (
                <div
                  key={cert.id}
                  className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                    cert.status === "active"
                      ? "border-slate-200 hover:border-gold-300 shadow-card hover:shadow-card-hover"
                      : "border-slate-100 bg-slate-50/50 opacity-80"
                  }`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
                    {/* Left: Badge & Level */}
                    <div className="lg:col-span-1 p-8 bg-slate-50 border-r border-slate-100 flex flex-col items-center justify-center text-center">
                      <div
                        className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 ${
                          cert.status === "active"
                            ? "bg-gradient-to-br from-gold-100 to-gold-200 shadow-gold/20 shadow-lg"
                            : "bg-slate-100"
                        }`}
                      >
                        {cert.badge_icon}
                      </div>
                      <div className="text-gold-600 font-display font-black text-3xl mb-1">
                        {cert.acronym}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${LEVEL_COLORS[cert.level]}`}>
                        {cert.level} Level
                      </span>
                      {cert.status === "coming_soon" && (
                        <div className="mt-3 flex items-center gap-1 text-slate-400 text-xs font-semibold">
                          <Lock size={10} />
                          Coming Soon
                        </div>
                      )}
                    </div>

                    {/* Middle: Details */}
                    <div className="lg:col-span-2 p-8">
                      <h2 className="text-2xl font-display font-bold text-navy-900 mb-3">
                        {cert.title}
                      </h2>
                      <p className="text-slate-600 leading-relaxed mb-5">{cert.description}</p>

                      {cert.status === "active" && cert.learning_outcomes.length > 0 && (
                        <div className="space-y-2">
                          {cert.learning_outcomes.slice(0, 4).map((outcome, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <CheckCircle2 size={15} className="text-gold-500 flex-shrink-0 mt-0.5" />
                              {outcome}
                            </div>
                          ))}
                          {cert.learning_outcomes.length > 4 && (
                            <div className="text-xs text-slate-400 pl-5">
                              +{cert.learning_outcomes.length - 4} more outcomes
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Pricing & CTA */}
                    <div className="lg:col-span-1 p-8 border-l border-slate-100 flex flex-col justify-between">
                      {cert.status === "active" ? (
                        <>
                          <div>
                            <div className="flex items-center gap-1 mb-3">
                              {[1,2,3,4,5].map(j => (
                                <Star key={j} size={12} className="text-gold-500 fill-gold-500" />
                              ))}
                              <span className="text-xs text-slate-500 ml-1">4.9</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-6">
                              {[
                                { label: "Duration", value: `${cert.duration_weeks} weeks` },
                                { label: "Exam", value: `${cert.exam_duration_minutes} min` },
                                { label: "Passing", value: `${cert.passing_score}%` },
                                { label: "Valid for", value: `${cert.validity_years} years` },
                              ].map((item) => (
                                <div key={item.label}>
                                  <div className="text-slate-400 text-xs">{item.label}</div>
                                  <div className="text-navy-900 font-semibold text-sm">{item.value}</div>
                                </div>
                              ))}
                            </div>
                            <div className="text-3xl font-display font-black text-navy-900 mb-1">
                              {formatCurrency(cert.price)}
                            </div>
                            <div className="text-xs text-slate-400 mb-5">One-time enrollment fee</div>
                          </div>
                          <Link
                            href={`/certifications/${cert.slug}`}
                            className="w-full flex items-center justify-center gap-2 bg-navy-800 hover:bg-gold-500 hover:text-white text-white font-bold py-3 rounded-xl transition-all duration-200 group"
                          >
                            View & Enroll
                            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        </>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="text-2xl font-display font-black text-slate-300">
                            {formatCurrency(cert.price)}
                          </div>
                          <div className="text-xs text-slate-400">Estimated price</div>
                          <button
                            disabled
                            className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                          >
                            Notify When Available
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

