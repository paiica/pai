import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  CheckCircle2, Clock, BookOpen, ArrowRight, ChevronRight,
  BarChart2, Lock,
} from "lucide-react";
import EnrollButton from "@/components/EnrollButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const LMS = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";

type Lesson = { id: string; title: string; type: string; duration_minutes: number; is_free_preview: boolean };
type Module = { id: string; title: string; description?: string; lessons?: Lesson[] };
type Instructor = { user_id: string; is_lead: boolean; first_name: string; last_name: string; avatar_url?: string; bio?: string };
type CourseContent = {
  overview_headline?: string;
  overview_body?: string;
  learning_outcomes?: string[];
  how_it_works_headline?: string;
  how_it_works_steps?: { title: string; description: string }[];
  training_exam_prep_headline?: string;
  training_exam_prep_body?: string;
  training_exam_prep_items?: string[];
  related_course_slugs?: string[];
};
type Course = {
  id: string; slug: string; title: string; subtitle?: string;
  description?: string; price: number; level?: string; status: string;
  duration_hours: number; thumbnail_url?: string;
  cert_acronym?: string; cert_title?: string; cert_slug?: string;
  modules?: Module[]; instructors?: Instructor[];
  content?: CourseContent;
};

const GRADIENTS = [
  { from: "#e6d5f7", to: "#c8a8ef" },
  { from: "#cfe8f5", to: "#b0d0ea" },
  { from: "#f0e2cc", to: "#dfc5a0" },
  { from: "#cdf0e2", to: "#a0d8c0" },
  { from: "#f5cfe0", to: "#e8a8c5" },
  { from: "#d0d8f5", to: "#a8b8ee" },
];

function getGradient(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) { h = ((h << 5) - h) + slug.charCodeAt(i); h |= 0; }
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

const LESSON_ICON: Record<string, string> = {
  video: "▶", reading: "📄", quiz: "📊", assignment: "📝", html: "📄",
};

function safeArray<T>(val: unknown, fallback: T[] = []): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback;
}

async function getCourse(slug: string): Promise<Course | null> {
  try {
    const res = await fetch(`${API}/prep-courses/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch { return null; }
}

async function getRelatedCourses(slugs: string[]): Promise<Course[]> {
  if (!slugs.length) return [];
  const results = await Promise.all(
    slugs.map(s =>
      fetch(`${API}/prep-courses/${s}`, { next: { revalidate: 300 } })
        .then(r => r.ok ? r.json() : null)
        .then(j => j?.data ?? j ?? null)
        .catch(() => null)
    )
  );
  return results.filter(Boolean) as Course[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "Not Found" };
  return {
    title: `${course.title} | Professional AI Institute`,
    description: course.subtitle || course.description,
    openGraph: {
      title: `${course.title} | Professional AI Institute`,
      description: course.description,
    },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course || course.status === "archived") notFound();

  const lmsEnrollUrl = `${LMS}/tools/course/${course.slug}`;
  const grad = getGradient(course.slug);
  const price = Number(course.price);
  const modules = safeArray<Module>(course.modules);
  const instructors = safeArray<Instructor>(course.instructors);
  const content: CourseContent = course.content ?? {};
  const learningOutcomes = safeArray<string>(content.learning_outcomes);
  const howItWorksSteps = safeArray<{ title: string; description: string }>(content.how_it_works_steps);
  const prepItems = safeArray<string>(content.training_exam_prep_items);
  const relatedSlugs = safeArray<string>(content.related_course_slugs);
  const relatedCourses = await getRelatedCourses(relatedSlugs);
  const totalLessons = modules.reduce((s, m) => s + (m.lessons?.length ?? 0), 0);

  const enrollmentIncludes = prepItems.length > 0 ? prepItems : [
    "Self-paced learning",
    "Lifetime access",
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* ── HERO ── */}
        <section
          className="pt-[148px] pb-20 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)` }}
        >
          <div className="container-lg relative">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-navy-700/60 text-xs font-semibold mb-5">
              <Link href="/" className="hover:text-navy-900 transition-colors">Home</Link>
              <ChevronRight size={12} />
              <Link href="/courses" className="hover:text-navy-900 transition-colors">Courses</Link>
              <ChevronRight size={12} />
              <span className="text-navy-800 truncate max-w-xs">{course.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left — course info */}
              <div className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
                    eLearning
                  </span>
                  {course.level && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
                      {LEVEL_LABEL[course.level] ?? course.level}
                    </span>
                  )}
                  {course.cert_acronym && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
                      {course.cert_acronym}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-navy-900 leading-tight mb-3">
                  {course.title}
                </h1>
                {course.subtitle && (
                  <p className="text-lg text-navy-800 leading-relaxed mb-5">{course.subtitle}</p>
                )}

                <div className="flex flex-wrap gap-5 text-sm text-navy-700 mb-6">
                  {course.duration_hours > 0 && (
                    <span className="flex items-center gap-1.5"><Clock size={14} />{course.duration_hours}h of content</span>
                  )}
                  {totalLessons > 0 && (
                    <span className="flex items-center gap-1.5"><BookOpen size={14} />{totalLessons} lessons</span>
                  )}
                  {modules.length > 0 && (
                    <span className="flex items-center gap-1.5"><BarChart2 size={14} />{modules.length} modules</span>
                  )}
                </div>

                {course.description && (
                  <p className="text-base text-navy-800 leading-relaxed">{course.description}</p>
                )}
              </div>

              {/* Right — enrollment card */}
              <div className="bg-white rounded-2xl p-7 shadow-xl border border-sand-200">
                <div className="text-4xl font-display font-black text-ink-900 mb-0.5">
                  {price === 0 ? "Free" : `$${price.toLocaleString()}`}
                </div>
                <div className="text-ink-900 text-sm mb-5">
                  {price > 0 ? "One-time fee · Lifetime access" : "No credit card required"}
                </div>

                <div className="space-y-2.5 mb-6">
                  {[
                    course.duration_hours > 0 ? `${course.duration_hours}+ hours of content` : null,
                    totalLessons > 0
                      ? `${totalLessons} lessons${modules.length > 0 ? ` in ${modules.length} modules` : ""}`
                      : null,
                    ...enrollmentIncludes,
                  ].filter(Boolean).map((item) => (
                    <div key={item!} className="flex items-center gap-2.5 text-sm text-ink-900">
                      <CheckCircle2 size={15} className="text-ink-900 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>

                <EnrollButton
                  courseId={course.id}
                  courseSlug={course.slug}
                  title={course.title}
                  price={price}
                  level={course.level}
                />

                {price > 0 && (
                  <div className="mt-5 pt-4 border-t border-sand-200 text-center text-xs text-ink-900">
                    🔒 Secure checkout · 30-day money-back guarantee
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT YOU'LL LEARN ── */}
        {learningOutcomes.length > 0 && (
          <section className="section-padding bg-white border-b border-sand-200">
            <div className="container-lg">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div>
                  <h2 className="text-3xl font-display font-black text-ink-900">What You'll Learn</h2>
                </div>
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {learningOutcomes.map((o, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-ink-900">
                      <CheckCircle2 size={16} className="text-ink-900 flex-shrink-0 mt-0.5" />
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── HOW IT WORKS ── */}
        {howItWorksSteps.length > 0 && (
          <section className="section-padding bg-sand-50 border-b border-sand-200">
            <div className="container-lg">
              <h2 className="text-3xl font-display font-black text-ink-900 mb-2">
                {content.how_it_works_headline || "How It Works"}
              </h2>
              <p className="text-slate-500 text-sm mb-10">Your step-by-step learning path</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {howItWorksSteps.map((step, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-sand-200 shadow-card">
                    <div className="w-10 h-10 rounded-xl bg-ink-900 text-white flex items-center justify-center text-sm font-black mb-4">
                      {i + 1}
                    </div>
                    <h3 className="font-display font-bold text-ink-900 text-base mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── CURRICULUM ── */}
        {modules.length > 0 && (
          <section className="section-padding bg-white border-b border-sand-200">
            <div className="container-lg">
              <h2 className="text-3xl font-display font-black text-ink-900 mb-2">Course Curriculum</h2>
              <p className="text-slate-500 text-sm mb-8">{modules.length} modules · {totalLessons} lessons</p>
              <div className="space-y-2">
                {modules.map((mod) => {
                  const lessons = safeArray<Lesson>(mod.lessons);
                  return (
                    <div key={mod.id} className="rounded-2xl border border-sand-200 overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 bg-sand-50">
                        <span className="font-semibold text-ink-900 text-sm">{mod.title}</span>
                        <span className="text-xs text-slate-400">
                          {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {lessons.length > 0 && (
                        <div className="divide-y divide-sand-100">
                          {lessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                              <span className="text-slate-400 text-xs flex-shrink-0">
                                {LESSON_ICON[lesson.type] ?? "📄"}
                              </span>
                              <span className="text-sm text-ink-900 flex-1">{lesson.title}</span>
                              {lesson.duration_minutes > 0 && (
                                <span className="text-xs text-slate-400">{lesson.duration_minutes}m</span>
                              )}
                              {!lesson.is_free_preview && (
                                <Lock size={12} className="text-slate-300 flex-shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── WHAT'S INCLUDED ── */}
        {(content.training_exam_prep_body || prepItems.length > 0) && (
          <section className="section-padding bg-sand-50 border-b border-sand-200">
            <div className="container-lg">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div>
                  <h2 className="text-3xl font-display font-black text-ink-900">
                    {content.training_exam_prep_headline || "What's Included"}
                  </h2>
                </div>
                <div className="lg:col-span-2 space-y-5">
                  {content.training_exam_prep_body && (
                    <p className="text-slate-700 leading-relaxed">{content.training_exam_prep_body}</p>
                  )}
                  {prepItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {prepItems.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm text-ink-900">
                          <CheckCircle2 size={16} className="text-ink-900 flex-shrink-0 mt-0.5" />
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── INSTRUCTORS ── */}
        {instructors.length > 0 && (
          <section className="section-padding bg-white border-b border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-8">Your Instructors</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {instructors.map((ins, i) => {
                  const name = `${ins.first_name ?? ""} ${ins.last_name ?? ""}`.trim();
                  if (!name) return null;
                  const initials = [(ins.first_name ?? "")[0], (ins.last_name ?? "")[0]]
                    .filter(Boolean).join("").toUpperCase();
                  return (
                    <div key={i} className="flex items-start gap-4 bg-sand-50 rounded-2xl p-5 border border-sand-200">
                      {ins.avatar_url ? (
                        <img src={ins.avatar_url} alt={name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-ink-800 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="font-display font-bold text-ink-900 text-base">{name}</div>
                        {ins.is_lead && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                            Lead Instructor
                          </span>
                        )}
                        {ins.bio && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{ins.bio}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── RELATED COURSES ── */}
        {relatedCourses.length > 0 && (
          <section className="section-padding bg-white border-t border-sand-200">
            <div className="container-lg">
              <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">You Might Also Like</h2>
              <p className="text-slate-500 text-sm mb-8">More courses to advance your AI skills</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedCourses.map((r) => {
                  const rGrad = getGradient(r.slug);
                  return (
                    <div key={r.slug} className="bg-white rounded-2xl border border-sand-200 shadow-card hover:shadow-card-hover transition-all p-5 flex flex-col">
                      <div
                        className="w-12 h-12 rounded-2xl mb-4 flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${rGrad.from}, ${rGrad.to})` }}
                      />
                      {r.cert_acronym && (
                        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{r.cert_acronym}</div>
                      )}
                      <h3 className="font-display font-bold text-ink-900 text-base mb-2 leading-snug">{r.title}</h3>
                      {r.subtitle && (
                        <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-4">{r.subtitle}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-lg font-display font-black text-ink-900">
                          {Number(r.price) === 0 ? "Free" : `$${Number(r.price).toLocaleString()}`}
                        </span>
                        <Link href={`/courses/${r.slug}`} className="btn-dark !py-2 !px-4 !text-xs flex items-center gap-1">
                          Learn More <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── BOTTOM CTA ── */}
        <section className="section-padding bg-ink-900">
          <div className="container-lg text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-display font-black text-white mb-3">
                Ready to Get Started?
              </h2>
              <p className="text-white/70 text-base mb-8">
                Join thousands of professionals advancing their AI skills
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={lmsEnrollUrl} className="btn-primary !py-4 !px-8 !text-base justify-center flex items-center gap-2">
                  <ShoppingCart size={18} />
                  {price === 0 ? "Enroll Free" : `Get Started — $${price.toLocaleString()}`}
                </Link>
                <Link href="/courses" className="btn-outline-light !py-4 !px-8 !text-base justify-center">
                  View All Courses
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
