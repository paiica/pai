import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StickyEnrollBar from "./StickyEnrollBar";
import CertTabs from "./CertTabs";
import type { PageTabsData } from "./cert-types";
import {
  CheckCircle2, Clock, BookOpen, Award, ArrowRight, ChevronRight,
  Shield, Star, FileText, RefreshCw, Quote, Tag, Users2,
} from "lucide-react";
import CertCTAButton from "@/components/CertCTAButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CurriculumItem  = { title: string; description: string; lessons: number };
type FaqItem         = { question: string; answer: string };
type Testimonial     = { name: string; role: string; company: string; quote: string; avatar_initials: string };
type MarketingMeta   = {
  reviews_rating: string; reviews_count: string; social_proof: string;
  hero_badge_label: string; prerequisites: string; enrollment_includes: string[];
  page_tabs?: PageTabsData;
};

type Cert = {
  id: string; slug: string; acronym: string; title: string;
  level: string; status: string; badge_icon: string;
  price: number; description: string; long_description: string;
  learning_outcomes: string[]; target_audience: string[];
  curriculum_overview: CurriculumItem[];
  faqs_json: FaqItem[];
  marketing_meta?: MarketingMeta;
  testimonials?: Testimonial[];
  skills?: string[];
  related_slugs?: string[];
  certificate_preview_url?: string;
  duration_weeks: number; total_lessons: number; total_hours: number;
  passing_score: number; exam_duration_minutes: number;
  exam_questions_count: number; validity_years: number;
  max_retakes_included: number; retake_fee: number;
  modules?: { title: string; description?: string; _count?: { lessons: number } }[];
  instructors?: { is_lead: boolean; user: { profile?: { first_name?: string; last_name?: string; avatar_url?: string; bio?: string } } }[];
};

async function getCert(slug: string): Promise<Cert | null> {
  try {
    const res = await fetch(`${API}/courses/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch { return null; }
}

async function getRelatedCerts(slugs: string[]): Promise<Cert[]> {
  if (!slugs.length) return [];
  const results = await Promise.all(
    slugs.map((s) =>
      fetch(`${API}/courses/${s}`, { next: { revalidate: 300 } })
        .then((r) => r.ok ? r.json() : null)
        .then((j) => j?.data ?? j ?? null)
        .catch(() => null)
    )
  );
  return results.filter(Boolean) as Cert[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cert = await getCert(slug);
  if (!cert) return { title: "Not Found" };
  return {
    title: `${cert.title} (${cert.acronym})`,
    description: cert.description,
    openGraph: { title: `${cert.title} | Professional Artificial Intelligence Institute`, description: cert.description },
  };
}

function safeArray<T>(val: unknown, fallback: T[] = []): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

export default async function CertificationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cert = await getCert(slug);
  if (!cert || cert.status === "archived") notFound();

  const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";
  const applyUrl = `${lmsUrl}/apply/${cert.slug}`;

  const learningOutcomes   = safeArray<string>(cert.learning_outcomes);
  const targetAudience     = safeArray<string>(cert.target_audience);
  const faqs               = safeArray<FaqItem>(cert.faqs_json);
  const testimonials       = safeArray<Testimonial>(cert.testimonials);
  const skills             = safeArray<string>(cert.skills);
  const relatedSlugsRaw    = safeArray<string>(cert.related_slugs);
  const instructors        = safeArray(cert.instructors);

  const curriculumRaw = safeArray<CurriculumItem>(cert.curriculum_overview);
  const modulesRaw    = safeArray(cert.modules);
  const curriculum: CurriculumItem[] = curriculumRaw.length > 0
    ? curriculumRaw
    : modulesRaw.map((m: any) => ({ title: m.title, description: m.description ?? "", lessons: m._count?.lessons ?? 0 }));

  const meta               = cert.marketing_meta;
  const reviewsRating      = meta?.reviews_rating    || "4.9";
  const reviewsCount       = meta?.reviews_count      || "1,200+";
  const socialProof        = meta?.social_proof        || "Join 3,200+ certified professionals";
  const heroBadgeLabel     = meta?.hero_badge_label    || "Professional Certification";
  const prerequisites      = meta?.prerequisites        || "";
  const enrollmentIncludes = safeArray<string>(meta?.enrollment_includes, [
    "Practice exam & study guides",
    "Digital certificate + Open Badge",
    "LinkedIn credential integration",
    "30-day money-back guarantee",
  ]);

  const certPreviewUrl = cert.certificate_preview_url || "";
  const relatedCerts   = await getRelatedCerts(relatedSlugsRaw);
  const isComingSoon   = cert.status === "coming_soon";

  return (
    <>
      <Navbar />
      {!isComingSoon && <StickyEnrollBar title={cert.title} acronym={cert.acronym} price={Number(cert.price)} applyUrl={applyUrl} />}

      <main>
        {/* ── HERO ── */}
        <section className="pt-[148px] pb-32 bg-hero-dark relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,145,58,0.9) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
          <div className="container-lg relative">
            <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight size={12} />
              <Link href="/certifications" className="hover:text-white">Certifications</Link>
              <ChevronRight size={12} />
              <span className="text-white">{cert.acronym}</span>
            </div>
            {prerequisites && <p className="text-xs text-white/60 mb-4 font-medium">{prerequisites}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <span className="badge-dark">{heroBadgeLabel}</span>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((i) => <Star key={i} size={12} className="text-white fill-white" />)}
                    <span className="text-white text-xs ml-1">{reviewsRating} ({reviewsCount} reviews)</span>
                  </div>
                </div>
                <div className="flex items-start gap-5 mb-5">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-teal">
                    {cert.badge_icon || "🎓"}
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white leading-tight">{cert.title}</h1>
                    <p className="text-white text-xl mt-2">({cert.acronym})</p>
                  </div>
                </div>
                <p className="text-lg text-white leading-relaxed max-w-2xl mb-5">{cert.long_description || cert.description}</p>

                {/* Skills tags */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 bg-white/10 border border-white/20 px-3 py-1 rounded-full">
                        <Tag size={10} /> {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-5 text-sm text-white">
                  {cert.duration_weeks > 0 && <div className="flex items-center gap-1.5"><Clock size={14} />{cert.duration_weeks} weeks</div>}
                  {cert.total_lessons > 0 && <div className="flex items-center gap-1.5"><BookOpen size={14} />{cert.total_lessons} lessons</div>}
                  {cert.exam_duration_minutes > 0 && <div className="flex items-center gap-1.5"><FileText size={14} />{cert.exam_duration_minutes}min exam</div>}
                  {cert.passing_score > 0 && <div className="flex items-center gap-1.5"><Shield size={14} />{cert.passing_score}% to pass</div>}
                  {cert.validity_years > 0 && <div className="flex items-center gap-1.5"><RefreshCw size={14} />{cert.validity_years}-year validity</div>}
                </div>
              </div>

              {/* Enrollment card */}
              {isComingSoon ? (
                <div className="bg-white rounded-2xl p-7 shadow-xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🕐</span>
                    <span className="text-lg font-display font-black text-amber-700">Coming Soon</span>
                  </div>
                  <p className="text-sm text-ink-900 leading-relaxed mb-6">
                    This certification is currently in development. Registration will open soon — check back or follow us to be notified when enrollment launches.
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {[
                      cert.total_hours > 0 ? `${cert.total_hours}+ hours of content` : null,
                      cert.exam_duration_minutes > 0 ? `${cert.exam_duration_minutes}-min online exam` : null,
                      cert.validity_years > 0 ? `${cert.validity_years}-year credential validity` : null,
                    ].filter(Boolean).map((item) => (
                      <div key={item!} className="flex items-center gap-2.5 text-sm text-ink-900">
                        <CheckCircle2 size={15} className="text-amber-500 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="w-full flex items-center justify-center gap-2 bg-amber-50 border-2 border-amber-200 text-amber-800 font-bold py-3 rounded-xl text-sm cursor-default">
                    🕐 Enrollment Opening Soon
                  </div>
                  <div className="mt-5 pt-4 border-t border-sand-200 text-center text-xs text-ink-900">
                    Price and availability subject to change
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-7 shadow-xl border border-sand-200">
                  <div className="text-4xl font-display font-black text-ink-900 mb-0.5">${Number(cert.price).toLocaleString()}</div>
                  <div className="text-ink-900 text-sm mb-5">One-time fee · Lifetime access</div>
                  <div className="space-y-2.5 mb-6">
                    {[
                      cert.total_hours > 0 ? `${cert.total_hours}+ hours of content` : null,
                      cert.total_lessons > 0 && curriculum.length > 0 ? `${cert.total_lessons} lessons across ${curriculum.length} modules` : cert.total_lessons > 0 ? `${cert.total_lessons} lessons` : null,
                      cert.exam_duration_minutes > 0 ? `${cert.exam_duration_minutes}-min online proctored exam` : null,
                      cert.validity_years > 0 ? `${cert.validity_years}-year credential validity` : null,
                      ...enrollmentIncludes,
                    ].filter(Boolean).map((item) => (
                      <div key={item!} className="flex items-center gap-2.5 text-sm text-ink-900">
                        <CheckCircle2 size={15} className="text-ink-900 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <CertCTAButton
                    certId={cert.id}
                    certSlug={cert.slug}
                    title={cert.title}
                    price={Number(cert.price)}
                  />
                  <Link href="/corporate" className="w-full flex items-center justify-center gap-2 border-2 border-ink-800 text-ink-900 font-semibold py-3 rounded-xl text-sm transition-all hover:bg-ink-800 hover:text-white">
                    Corporate Group Pricing →
                  </Link>
                  <div className="mt-5 pt-4 border-t border-sand-200 text-center text-xs text-ink-900">
                    🔒 Secure checkout · 30-day money-back guarantee
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── TABBED CONTENT ── */}
        <CertTabs
          acronym={cert.acronym}
          applyUrl={applyUrl}
          learningOutcomes={learningOutcomes}
          targetAudience={targetAudience}
          curriculum={curriculum}
          faqs={faqs}
          totalLessons={cert.total_lessons}
          totalHours={Number(cert.total_hours)}
          pageTabs={meta?.page_tabs}
        />

        {/* ── EXAM INFO STRIP ── */}
        <section className="py-10 bg-sand-50 border-t border-sand-200 border-b">
          <div className="container-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 text-center">
              {[
                { label: "Format", value: `${cert.exam_questions_count > 0 ? cert.exam_questions_count : 75}-question MC` },
                { label: "Duration", value: cert.exam_duration_minutes > 0 ? `${cert.exam_duration_minutes} min` : "90 min" },
                { label: "Delivery", value: "Online, proctored" },
                { label: "Passing Score", value: `${cert.passing_score}%` },
                { label: "Validity", value: cert.validity_years > 0 ? `${cert.validity_years} years` : "2 years" },
                { label: "Retakes", value: cert.max_retakes_included > 0 ? `${cert.max_retakes_included} included` : "Contact us" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="font-display font-bold text-ink-900 text-sm">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        {testimonials.length > 0 && (
          <section className="section-padding bg-sand-50 border-t border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-2 text-center">What Certified Professionals Say</h2>
              <p className="text-slate-500 text-sm text-center mb-10">Real feedback from {cert.acronym} graduates</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-sand-200 shadow-card flex flex-col">
                    <Quote size={20} className="text-sand-300 mb-4 flex-shrink-0" />
                    <p className="text-ink-900 text-sm leading-relaxed flex-1 mb-5">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-ink-800 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {t.avatar_initials || t.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-ink-900 text-sm">{t.name}</div>
                        <div className="text-xs text-slate-500">{t.role}{t.company ? ` · ${t.company}` : ""}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── INSTRUCTORS ── */}
        {instructors.length > 0 && (
          <section className="section-padding bg-white border-t border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-8">Your Instructors</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {instructors.map((ins: any, i: number) => {
                  const p = ins.user?.profile;
                  const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
                  if (!name) return null;
                  const initials = [p?.first_name?.[0], p?.last_name?.[0]].filter(Boolean).join("").toUpperCase();
                  return (
                    <div key={i} className="flex items-start gap-4 bg-sand-50 rounded-2xl p-5 border border-sand-200">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt={name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-ink-800 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="font-display font-bold text-ink-900 text-base">{name}</div>
                        {ins.is_lead && <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">Lead Instructor</span>}
                        {p?.bio && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{p.bio}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── CERTIFICATE PREVIEW ── */}
        {certPreviewUrl && (
          <section className="section-padding bg-ink-900">
            <div className="container-lg text-center">
              <h2 className="text-2xl font-display font-bold text-white mb-2">Your Certificate</h2>
              <p className="text-white/60 text-sm mb-8">Issued upon passing the {cert.acronym} exam — verifiable globally</p>
              <div className="max-w-2xl mx-auto">
                <img src={certPreviewUrl} alt={`${cert.acronym} certificate preview`}
                  className="w-full rounded-2xl shadow-2xl border border-white/10" />
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-white/60">
                {["Globally Verifiable", "LinkedIn Integration", "Open Badge Standard", "QR Code Verification"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Shield size={13} className="text-teal-400" /> {f}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── RELATED CERTIFICATIONS ── */}
        {relatedCerts.length > 0 && (
          <section className="section-padding bg-white border-t border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">What's Next?</h2>
              <p className="text-slate-500 text-sm mb-8">Continue your AI credentialing journey after {cert.acronym}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedCerts.map((r) => (
                  <div key={r.slug} className="bg-white rounded-2xl border border-sand-200 shadow-card hover:shadow-card-hover transition-all p-5 flex flex-col">
                    <div className="w-12 h-12 bg-gradient-to-br from-sand-100 to-sand-200 rounded-2xl flex items-center justify-center text-2xl mb-4">
                      {r.badge_icon || "🎓"}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{r.acronym}</div>
                    <h3 className="font-display font-bold text-ink-900 text-base mb-2 leading-snug">{r.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-4">{r.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-display font-black text-ink-900">${Number(r.price).toLocaleString()}</span>
                      <Link href={`/certifications/${r.slug}`} className="btn-dark !py-2 !px-4 !text-xs">
                        Learn More <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ── */}
        <section className="section-padding bg-ink-900">
          <div className="container-lg text-center">
            <div className="max-w-2xl mx-auto">
              <div className="text-5xl mb-4">{cert.badge_icon || "🎓"}</div>
              <h2 className="text-3xl font-display font-black text-white mb-3">
                {isComingSoon ? `${cert.acronym} — Coming Soon` : `Ready to Earn Your ${cert.acronym}?`}
              </h2>
              <p className="text-white/70 text-base mb-8">{isComingSoon ? "This certification is in development. Registration will open soon — stay tuned." : socialProof}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isComingSoon ? (
                  <span className="btn-primary !py-4 !px-8 !text-base justify-center opacity-60 cursor-default">
                    🕐 Enrollment Opening Soon
                  </span>
                ) : (
                  <a href={applyUrl} className="btn-primary !py-4 !px-8 !text-base justify-center">
                    <Award size={18} /> Apply Now — ${Number(cert.price).toLocaleString()}
                  </a>
                )}
                <Link href="/certifications" className="btn-outline-light !py-4 !px-8 !text-base justify-center">
                  View All Certifications
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
