import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ProgramCTAButton from "@/components/ProgramCTAButton";
import InstructorCard from "@/components/InstructorCard";
import StickyEnrollBar from "./StickyEnrollBar";
import ProgramSectionNav from "./ProgramSectionNav";
import FaqAccordion from "./FaqAccordion";
import {
  CheckCircle2, GraduationCap, ChevronRight, Star,
  Award, Quote, Clock, Layers, Briefcase,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type SpecialType = "capstone" | "internship" | null;
type SpecialMetadata = {
  // capstone
  deliverables?: string[]; learning_objectives?: string[]; rubric_criteria?: string[]; submission_requirements?: string;
  // internship
  host_organization?: string; supervisor_name?: string; supervisor_email?: string; hours_required?: number | null;
  evaluation_criteria?: string[]; report_requirements?: string;
  // shared
  passing_score?: number | null;
};
type CourseRef = {
  id: string; sort_order: number; is_required: boolean;
  special_type?: SpecialType; special_metadata?: SpecialMetadata;
  course: { id: string; title: string; subtitle?: string; description?: string; level: string; duration_hours: number; total_lessons?: number };
};
type FaqItem = { question: string; answer: string };
type Testimonial = { name: string; role: string; company: string; quote: string; avatar_initials: string };
type MarketingMeta = {
  reviews_rating: string; reviews_count: string; social_proof: string;
  hero_badge_label: string; enrollment_includes: string[]; certificate_template_html: string;
};

type Program = {
  id: string; slug: string; title: string; code?: string;
  short_description?: string; description?: string; overview?: string;
  learning_outcomes: string[]; target_audience: string[]; prerequisites: string[];
  duration_weeks?: number | null; estimated_hours?: number | null; level: string; thumbnail_url?: string;
  status: string; price: number; currency: string;
  faqs_json: FaqItem[]; testimonials: Testimonial[]; marketing_meta?: MarketingMeta;
  certificate_title?: string; certificate_description?: string;
  courses: CourseRef[];
  related_slugs?: string[];
  instructors?: { is_lead: boolean; user: { profile?: { first_name?: string; last_name?: string; avatar_url?: string; bio?: string; job_title?: string; company?: string; years_experience?: number; education_entries?: any[]; experience_entries?: any[] } } }[];
};

const LEVEL_LABEL: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

async function getProgram(slug: string): Promise<Program | null> {
  try {
    const res = await fetch(`${API}/programs/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch { return null; }
}

async function getRelatedPrograms(slugs: string[]): Promise<Program[]> {
  if (!slugs.length) return [];
  const results = await Promise.all(
    slugs.map((s) =>
      fetch(`${API}/programs/${s}`, { next: { revalidate: 300 } })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j?.data ?? j ?? null)
        .catch(() => null)
    )
  );
  return results.filter(Boolean) as Program[];
}

function safeArray<T>(val: unknown, fallback: T[] = []): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return { title: "Not Found" };
  return {
    title: program.title,
    description: program.short_description || program.description,
    openGraph: {
      title: `${program.title} | Professional Artificial Intelligence Institute`,
      description: program.short_description || program.description,
      images: program.thumbnail_url ? [program.thumbnail_url] : undefined,
    },
  };
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program || program.status !== "published") notFound();

  const learningOutcomes = safeArray<string>(program.learning_outcomes);
  const targetAudience   = safeArray<string>(program.target_audience);
  const prerequisites    = safeArray<string>(program.prerequisites);
  const faqs             = safeArray<FaqItem>(program.faqs_json);
  const testimonials     = safeArray<Testimonial>(program.testimonials);
  const instructors      = safeArray(program.instructors);
  const courses          = safeArray<CourseRef>(program.courses).slice().sort((a, b) => a.sort_order - b.sort_order);
  const specialCourse    = courses.find((c) => c.special_type);
  const specialLabel     = specialCourse?.special_type === "internship" ? "Internship" : "Capstone";

  const meta            = program.marketing_meta;
  const heroBadgeLabel  = meta?.hero_badge_label || "Professional Program";
  const reviewsRating   = meta?.reviews_rating || "";
  const reviewsCount    = meta?.reviews_count || "";
  const socialProof     = meta?.social_proof || "";
  const enrollmentIncludes = safeArray<string>(meta?.enrollment_includes);

  const requiredCount = courses.filter((c) => c.is_required).length;
  const electiveCount = courses.length - requiredCount;

  const relatedPrograms = await getRelatedPrograms(safeArray<string>(program.related_slugs));

  // Only jump to sections that actually have content, per the program's real data.
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "curriculum", label: "Curriculum" },
    ...(specialCourse ? [{ id: "capstone", label: specialLabel }] : []),
    ...(instructors.length ? [{ id: "instructors", label: "Instructors" }] : []),
    ...(prerequisites.length ? [{ id: "admissions", label: "Admissions" }] : []),
    ...(faqs.length ? [{ id: "faqs", label: "FAQs" }] : []),
  ];

  return (
    <>
      <Navbar />
      <StickyEnrollBar title={program.title} price={Number(program.price)} programId={program.id} />

      <main>
        {/* ── HERO ── */}
        <section className="pb-20 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <div className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,145,58,0.9) 1px, transparent 0)", backgroundSize: "48px 48px" }} />
          <div className="container-lg relative">
            <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-5">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight size={12} />
              <Link href="/programs" className="hover:text-white">Programs</Link>
              <ChevronRight size={12} />
              <span className="text-white">{program.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              <div className="lg:col-span-2">
                <span className="badge-dark inline-block mb-6">{heroBadgeLabel}</span>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white leading-tight mb-5">
                  {program.title}
                </h1>
                <p className="text-lg text-white/90 leading-relaxed max-w-2xl mb-6">
                  {program.short_description || program.description}
                </p>

                {reviewsRating && (
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className="text-white fill-white" />)}
                    </div>
                    <span className="text-white text-sm">{reviewsRating} {reviewsCount && `(${reviewsCount})`}</span>
                  </div>
                )}

                {/* Quick facts */}
                <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6 mt-2">
                  <div>
                    <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Level</div>
                    <div className="font-display font-bold text-white text-sm">{LEVEL_LABEL[program.level] || program.level}</div>
                  </div>
                  {!!program.duration_weeks && (
                    <div>
                      <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Duration</div>
                      <div className="font-display font-bold text-white text-sm">{program.duration_weeks} weeks</div>
                    </div>
                  )}
                  {!!program.estimated_hours && (
                    <div>
                      <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Est. Hours</div>
                      <div className="font-display font-bold text-white text-sm">{Number(program.estimated_hours)}h</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">Courses</div>
                    <div className="font-display font-bold text-white text-sm">
                      {courses.length}{electiveCount > 0 ? ` (${requiredCount} required)` : ""}
                    </div>
                  </div>
                  {specialCourse && (
                    <div>
                      <div className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">{specialLabel}</div>
                      <div className="font-display font-bold text-white text-sm">Required</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrollment card */}
              <div id="enroll" className="bg-white rounded-2xl p-7 shadow-xl border border-sand-200">
                <div className="text-4xl font-display font-black text-ink-900 mb-0.5">
                  {Number(program.price) === 0 ? "Free" : `$${Number(program.price).toLocaleString()}`}
                </div>
                <div className="text-ink-900 text-sm mb-5">One-time fee · Full program access</div>
                <div className="space-y-2.5 mb-6">
                  {[
                    program.duration_weeks ? `${program.duration_weeks}-week program` : null,
                    courses.length > 0 ? `${courses.length} bundled course${courses.length !== 1 ? "s" : ""}` : null,
                    specialCourse ? (specialLabel === "Internship" ? "Real-world internship placement" : "Hands-on capstone project") : null,
                    program.certificate_title ? "Certificate of completion" : null,
                    ...enrollmentIncludes,
                  ].filter(Boolean).map((item) => (
                    <div key={item as string} className="flex items-center gap-2.5 text-sm text-ink-900">
                      <CheckCircle2 size={15} className="text-ink-900 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
                <ProgramCTAButton programId={program.id} title={program.title} price={Number(program.price)} />
                <div className="mt-5 pt-4 border-t border-sand-200 text-center text-xs text-ink-900">
                  🔒 Secure checkout
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION NAV ── */}
        {sections.length > 1 && <ProgramSectionNav sections={sections} />}

        {/* ── OVERVIEW ── */}
        <section id="program-section-overview" className="section-padding bg-white border-b border-sand-100">
          <div className="container-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl font-display font-black text-ink-900 mb-4 leading-tight">Program Overview</h2>
                {program.overview && <p className="text-ink-900 leading-relaxed mb-6 whitespace-pre-wrap">{program.overview}</p>}
                {!program.overview && program.description && <p className="text-ink-900 leading-relaxed mb-6 whitespace-pre-wrap">{program.description}</p>}

                {learningOutcomes.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-base font-display font-bold text-ink-900 mb-4">What You'll Learn</h3>
                    <ul className="space-y-3">
                      {learningOutcomes.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
                          <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-sand-50 rounded-2xl border border-sand-200 p-8">
                <h3 className="text-lg font-display font-bold text-ink-900 mb-4">Who This Program Is For</h3>
                {targetAudience.length > 0 ? (
                  <ul className="space-y-3">
                    {targetAudience.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
                        <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" /> {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Details coming soon.</p>
                )}
                {program.certificate_title && (
                  <div className="mt-8 pt-6 border-t border-sand-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={16} className="text-teal-600" />
                      <h4 className="text-sm font-display font-bold text-ink-900">What You'll Earn</h4>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{program.certificate_title}</p>
                    {program.certificate_description && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{program.certificate_description}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── CURRICULUM ── */}
        <section id="program-section-curriculum" className="section-padding bg-sand-50 border-b border-sand-100">
          <div className="container-lg">
            <h2 className="text-3xl font-display font-black text-ink-900 mb-1.5 leading-tight">Curriculum</h2>
            <p className="text-slate-500 text-sm mb-8">
              {courses.length} course{courses.length !== 1 ? "s" : ""}
              {requiredCount > 0 && electiveCount > 0 ? ` · ${requiredCount} required, ${electiveCount} elective` : ""}
              {specialCourse ? ` · plus a${specialLabel === "Internship" ? "n" : ""} ${specialLabel.toLowerCase()}` : ""}
            </p>
            <div className="max-w-3xl space-y-2">
              {courses.map((pc, i) => (
                <div key={pc.id} className={`border rounded-xl overflow-hidden bg-white ${pc.special_type ? "border-2 border-ink-900" : "border-sand-200"}`}>
                  <div className="flex items-center gap-4 p-4">
                    <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center text-xs font-bold flex-shrink-0 ${pc.special_type ? "bg-teal-600" : "bg-ink-800"}`}>
                      {pc.special_type ? (pc.special_type === "internship" ? <Briefcase size={14} /> : <Layers size={14} />) : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-ink-900 text-sm">{pc.course.title}</div>
                      {pc.special_type ? (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {pc.special_type === "internship" ? "Internship Placement" : "Capstone Project"} — required to complete the program
                        </div>
                      ) : pc.course.subtitle && <div className="text-xs text-slate-500 mt-0.5 truncate">{pc.course.subtitle}</div>}
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${pc.is_required ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                      {pc.is_required ? "Required" : "Elective"}
                    </span>
                    {Number(pc.course.duration_hours) > 0 && (
                      <div className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Clock size={11} /> {Number(pc.course.duration_hours)}h
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CAPSTONE / INTERNSHIP ── */}
        {specialCourse && (
          <section id="program-section-capstone" className="section-padding bg-white border-b border-sand-100">
            <div className="container-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div>
                  <h2 className="text-3xl font-display font-black text-ink-900 mb-4 leading-tight">{specialLabel}</h2>
                  <h3 className="text-lg font-display font-bold text-ink-900 mb-3">{specialCourse.course.title}</h3>
                  {specialCourse.course.description && <p className="text-ink-900 leading-relaxed mb-6 whitespace-pre-wrap">{specialCourse.course.description}</p>}

                  {specialCourse.special_type === "capstone" && safeArray<string>(specialCourse.special_metadata?.deliverables).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-display font-bold text-ink-900 mb-3">Deliverables</h4>
                      <ul className="space-y-2.5">
                        {safeArray<string>(specialCourse.special_metadata?.deliverables).map((d, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
                            <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" /> {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {specialCourse.special_type === "internship" && specialCourse.special_metadata?.host_organization && (
                    <div className="mb-6 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Host Organization</div>
                        <div className="font-display font-bold text-ink-900 text-sm">{specialCourse.special_metadata.host_organization}</div>
                      </div>
                      {!!specialCourse.special_metadata.hours_required && (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Hours Required</div>
                          <div className="font-display font-bold text-ink-900 text-sm">{specialCourse.special_metadata.hours_required}h</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-sand-50 rounded-2xl border border-sand-200 p-8">
                  {specialCourse.special_type === "capstone" && safeArray<string>(specialCourse.special_metadata?.learning_objectives).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-display font-bold text-ink-900 mb-3">Learning Objectives</h4>
                      <ul className="space-y-2.5">
                        {safeArray<string>(specialCourse.special_metadata?.learning_objectives).map((o, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
                            <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" /> {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {specialCourse.special_type === "internship" && safeArray<string>(specialCourse.special_metadata?.evaluation_criteria).length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-display font-bold text-ink-900 mb-3">Evaluation Criteria</h4>
                      <ul className="space-y-2.5">
                        {safeArray<string>(specialCourse.special_metadata?.evaluation_criteria).map((o, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
                            <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" /> {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!!specialCourse.special_metadata?.passing_score && (
                    <div className="pt-4 border-t border-sand-200">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Passing Score</div>
                      <div className="font-display font-bold text-ink-900 text-sm">{specialCourse.special_metadata.passing_score}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── INSTRUCTORS ── */}
        {instructors.length > 0 && (
          <section id="program-section-instructors" className="section-padding bg-sand-50 border-b border-sand-100">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-8">Your Instructors</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {instructors.map((ins: any, i: number) => {
                  const p = ins.user?.profile;
                  const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim();
                  if (!name) return null;
                  return (
                    <InstructorCard
                      key={i}
                      name={name}
                      avatarUrl={p?.avatar_url}
                      bio={p?.bio}
                      isLead={ins.is_lead}
                      jobTitle={p?.job_title}
                      company={p?.company}
                      yearsExperience={p?.years_experience}
                      educationEntries={p?.education_entries}
                      experienceEntries={p?.experience_entries}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── ADMISSIONS / PREREQUISITES ── */}
        {prerequisites.length > 0 && (
          <section id="program-section-admissions" className="section-padding bg-white border-b border-sand-100">
            <div className="container-lg max-w-2xl">
              <h2 className="text-3xl font-display font-black text-ink-900 mb-4 leading-tight">Admission Requirements</h2>
              <ul className="space-y-3">
                {prerequisites.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-900 leading-relaxed">
                    <CheckCircle2 size={16} className="text-teal-600 flex-shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── TESTIMONIALS ── */}
        {testimonials.length > 0 && (
          <section className="section-padding bg-sand-50 border-t border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-2 text-center">What Graduates Say</h2>
              <p className="text-slate-500 text-sm text-center mb-10">Real feedback from program graduates</p>
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

        {/* ── FAQS ── */}
        {faqs.length > 0 && (
          <section id="program-section-faqs" className="section-padding bg-white border-t border-sand-100">
            <div className="container-lg">
              <h2 className="text-3xl font-display font-black text-ink-900 mb-6 leading-tight">Frequently Asked Questions</h2>
              <FaqAccordion faqs={faqs} />
            </div>
          </section>
        )}

        {/* ── RELATED PROGRAMS ── */}
        {relatedPrograms.length > 0 && (
          <section className="section-padding bg-white border-t border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">What's Next?</h2>
              <p className="text-slate-500 text-sm mb-8">Continue your journey after {program.title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedPrograms.map((r) => (
                  <div key={r.slug} className="bg-white rounded-2xl border border-sand-200 shadow-card hover:shadow-card-hover transition-all p-5 flex flex-col">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{LEVEL_LABEL[r.level] || r.level}</div>
                    <h3 className="font-display font-bold text-ink-900 text-base mb-2 leading-snug">{r.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-4">{r.short_description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-display font-black text-ink-900">
                        {Number(r.price) === 0 ? "Free" : `$${Number(r.price).toLocaleString()}`}
                      </span>
                      <Link href={`/programs/${r.slug}`} className="btn-dark !py-2 !px-4 !text-xs">
                        Learn More
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
              <h2 className="text-3xl font-display font-black text-white mb-3">Ready to Get Started?</h2>
              {socialProof && <p className="text-white/70 text-base mb-8">{socialProof}</p>}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#enroll" className="btn-primary !py-4 !px-8 !text-base justify-center">
                  <GraduationCap size={18} /> Enroll Now{Number(program.price) > 0 ? ` — $${Number(program.price).toLocaleString()}` : ""}
                </a>
                <Link href="/programs" className="btn-outline-light !py-4 !px-8 !text-base justify-center">
                  View All Programs
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
