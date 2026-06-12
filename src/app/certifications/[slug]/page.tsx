import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getCertificationBySlug, CERTIFICATIONS } from "@/lib/certifications-data";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2, Clock, FileText, Award, Star, ArrowRight,
  BookOpen, Shield, RefreshCw, Play, ChevronRight,
} from "lucide-react";

export async function generateStaticParams() {
  return CERTIFICATIONS.filter(c => c.status === "active").map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cert = getCertificationBySlug(slug);
  if (!cert) return { title: "Certification Not Found" };
  return {
    title: `${cert.title} (${cert.acronym}) — PAI Certification`,
    description: cert.description,
    openGraph: { title: `${cert.title} | Professional AI Institute`, description: cert.description },
  };
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  video: <Play size={12} />,
  reading: <BookOpen size={12} />,
  quiz: <FileText size={12} />,
  assignment: <CheckCircle2 size={12} />,
};

export default async function CertificationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cert = getCertificationBySlug(slug);
  if (!cert || cert.status !== "active") notFound();

  const totalHours = cert.curriculum.reduce((acc, m) => acc + m.duration_hours, 0);
  const totalLessons = cert.curriculum.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-32 bg-hero-pattern relative overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,168,76,0.8) 1px, transparent 0)", backgroundSize: "40px 40px" }}
          />
          <div className="container-lg relative">
            <div className="flex items-center gap-2 text-gold-300/80 text-xs font-semibold mb-6">
              <Link href="/" className="hover:text-gold-300">Home</Link>
              <ChevronRight size={12} />
              <Link href="/certifications" className="hover:text-gold-300">Certifications</Link>
              <ChevronRight size={12} />
              <span className="text-gold-300">{cert.acronym}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left: Info */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <span className="badge-gold">Professional Certification</span>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-gold-400 fill-gold-400" />)}
                    <span className="text-gold-300 text-xs ml-1">4.9 (1,200+ reviews)</span>
                  </div>
                </div>
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-gold">
                    {cert.badge_icon}
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white leading-tight">
                      {cert.title}
                    </h1>
                    <p className="text-white/70 text-xl mt-2">({cert.acronym})</p>
                  </div>
                </div>
                <p className="text-lg text-white/75 leading-relaxed max-w-2xl mb-6">
                  {cert.long_description}
                </p>
                <div className="flex flex-wrap gap-5 text-sm text-white/60">
                  <div className="flex items-center gap-1.5"><Clock size={14} className="text-gold-400" />{cert.duration_weeks} weeks</div>
                  <div className="flex items-center gap-1.5"><BookOpen size={14} className="text-gold-400" />{totalLessons} lessons</div>
                  <div className="flex items-center gap-1.5"><FileText size={14} className="text-gold-400" />{cert.exam_duration_minutes} min exam</div>
                  <div className="flex items-center gap-1.5"><Shield size={14} className="text-gold-400" />{cert.passing_score}% to pass</div>
                  <div className="flex items-center gap-1.5"><RefreshCw size={14} className="text-gold-400" />{cert.validity_years}-year validity</div>
                </div>
              </div>

              {/* Right: Enrollment card */}
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100">
                <div className="text-4xl font-display font-black text-navy-900 mb-1">
                  {formatCurrency(cert.price)}
                </div>
                <div className="text-slate-400 text-sm mb-5">One-time enrollment fee. Lifetime access.</div>

                <div className="space-y-2.5 mb-6">
                  {[
                    `${totalHours}+ hours of content`,
                    `${totalLessons} lessons across ${cert.curriculum.length} modules`,
                    "Practice exam & study guides",
                    `${cert.exam_duration_minutes}-minute online proctored exam`,
                    "Digital certificate & badge",
                    "LinkedIn integration",
                    `${cert.validity_years}-year credential validity`,
                    "30-day money-back guarantee",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <Link
                  href={`/apply/${cert.slug}`}
                  className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold py-4 rounded-xl text-base transition-all duration-200 shadow-gold hover:shadow-lg hover:-translate-y-0.5 mb-3"
                >
                  <Award size={18} />
                  Apply Now
                </Link>
                <Link
                  href="/corporate"
                  className="w-full flex items-center justify-center gap-2 border-2 border-navy-800 text-navy-800 font-semibold py-3 rounded-xl text-sm transition-all hover:bg-navy-800 hover:text-white"
                >
                  Corporate Group Pricing →
                </Link>

                <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                  🔒 Secure checkout · 30-day money-back guarantee
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none">
              <path d="M0 60L1440 60V30C1440 30 1080 0 720 0C360 0 0 30 0 30V60Z" fill="white" />
            </svg>
          </div>
        </section>

        {/* Tabs content */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-12">
                {/* Learning Outcomes */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">
                    What You Will Learn
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cert.learning_outcomes.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <CheckCircle2 size={16} className="text-gold-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 leading-relaxed">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curriculum */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-2">
                    Curriculum
                  </h2>
                  <p className="text-slate-500 text-sm mb-6">
                    {cert.curriculum.length} modules · {totalLessons} lessons · {totalHours}+ hours
                  </p>
                  <div className="space-y-3">
                    {cert.curriculum.map((module, i) => (
                      <div key={module.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-start justify-between p-5 bg-slate-50">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-navy-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <h3 className="font-display font-bold text-navy-900 text-base">{module.title}</h3>
                              <p className="text-slate-500 text-xs mt-1">{module.description}</p>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 flex-shrink-0 ml-4">
                            {module.duration_hours}h · {module.lessons.length} lessons
                          </div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {module.lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center justify-between px-5 py-3">
                              <div className="flex items-center gap-2.5 text-sm text-slate-600">
                                <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                                  {TYPE_ICONS[lesson.type]}
                                </span>
                                {lesson.title}
                              </div>
                              <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Certification Process */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">
                    Certification Process
                  </h2>
                  <div className="space-y-4">
                    {[
                      { step: "01", title: "Submit Your Application", desc: "Complete the application form with your professional background and motivation. Takes about 5 minutes." },
                      { step: "02", title: "Pay the Enrollment Fee", desc: `Secure payment of ${formatCurrency(cert.price)} via Stripe. Full refund if your application is not approved.` },
                      { step: "03", title: "Application Review", desc: "PAI reviews your application within 3–5 business days. You'll receive an email with the decision." },
                      { step: "04", title: "Complete the Program", desc: `Work through all ${cert.curriculum.length} modules at your own pace over ${cert.duration_weeks} weeks on our LMS.` },
                      { step: "05", title: "Take the Exam & Get Certified", desc: `Pass the ${cert.exam_duration_minutes}-minute online exam (${cert.passing_score}%+) to earn your digital certificate and badge.` },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-5">
                        <div className="w-10 h-10 rounded-xl bg-gold-500 text-white flex items-center justify-center font-display font-black text-sm flex-shrink-0">
                          {item.step}
                        </div>
                        <div className="pt-1">
                          <h3 className="font-display font-bold text-navy-900 text-base mb-1">{item.title}</h3>
                          <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <div>
                  <h2 className="text-2xl font-display font-bold text-navy-900 mb-6">
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-4">
                    {cert.faqs.map((faq, i) => (
                      <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <h3 className="font-display font-bold text-navy-900 text-base mb-2">{faq.question}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-5">
                {/* Exam Info */}
                <div className="card-base p-6 border border-slate-100">
                  <h3 className="font-display font-bold text-navy-900 text-base mb-4">Exam Information</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Format", value: "75 multiple-choice questions" },
                      { label: "Duration", value: `${cert.exam_duration_minutes} minutes` },
                      { label: "Delivery", value: "Online, proctored" },
                      { label: "Passing Score", value: `${cert.passing_score}%` },
                      { label: "Retakes", value: "2 included, then $99/attempt" },
                      { label: "Languages", value: "English" },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-slate-500">{item.label}</span>
                        <span className="font-semibold text-navy-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Who it's for */}
                <div className="card-base p-6 border border-slate-100">
                  <h3 className="font-display font-bold text-navy-900 text-base mb-4">Who This Is For</h3>
                  <div className="space-y-2">
                    {[
                      "Business professionals",
                      "Managers and team leads",
                      "Educators and trainers",
                      "Marketing and sales professionals",
                      "Operations managers",
                      "Small business owners",
                      "HR and talent professionals",
                      "Corporate trainers",
                    ].map((role) => (
                      <div key={role} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 size={13} className="text-gold-500" />
                        {role}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA repeat */}
                <div className="bg-navy-800 rounded-2xl p-6 text-white text-center">
                  <Award size={32} className="text-gold-400 mx-auto mb-3" />
                  <h3 className="font-display font-bold text-lg mb-2">Ready to Get Certified?</h3>
                  <p className="text-white/60 text-sm mb-4">Join 3,200+ certified professionals</p>
                  <Link
                    href={`/apply/${cert.slug}`}
                    className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Apply for {formatCurrency(cert.price)}
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
