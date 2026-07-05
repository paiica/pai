import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Clock, BookOpen, ArrowRight, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Prep Courses | Professional Artificial Intelligence Institute",
  description: "Self-paced online courses to build practical AI skills and prepare for certification exams.",
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getCourses(): Promise<any[]> {
  try {
    const res = await fetch(`${API}/prep-courses`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  } catch { return []; }
}

export default async function CoursesListPage() {
  const courses = await getCourses();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pb-20 bg-hero-dark relative overflow-hidden" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(201,145,58,0.9) 1px, transparent 0)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="container-lg relative">
            <div className="flex items-center gap-2 text-white/60 text-xs font-semibold mb-5">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight size={12} />
              <span className="text-white">Courses</span>
            </div>
            <span className="badge-dark mb-5">Prep Courses</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5 leading-tight">
              Learn at Your Own Pace.
              <br />
              <span className="text-gradient">Pass with Confidence.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl">
              Self-paced courses built to develop practical AI skills and prepare you for certification exams.
            </p>
          </div>
        </section>

        {/* Course Grid */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            {courses.length === 0 ? (
              <div className="py-20 text-center">
                <BookOpen size={40} className="mx-auto mb-4 text-slate-300" />
                <p className="font-semibold text-slate-500">No courses available yet — check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course: any) => {
                  const price = Number(course.price);
                  const modules = Math.max(0, Math.round(Number(course.module_count) || 0));
                  const railSegments = Math.min(Math.max(modules, 1), 8);
                  return (
                    <div
                      key={course.id}
                      className="relative bg-white rounded-2xl border border-sand-300 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
                    >
                      {modules > 0 && (
                        <div
                          className="absolute -top-6 -right-3 font-display font-black leading-none text-sand-100 select-none pointer-events-none"
                          style={{ fontSize: "160px" }}
                          aria-hidden="true"
                        >
                          {String(modules).padStart(2, "0")}
                        </div>
                      )}
                      <div className="relative p-6 flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-sand-300 bg-sand-50 text-ink-900">
                              Course
                            </span>
                            {course.level && (
                              <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-teal-700 uppercase tracking-[0.15em] pl-3 border-l-2 border-teal-500">
                                {course.level}
                              </span>
                            )}
                          </div>
                          {course.cert_acronym && (
                            <span className="text-[10px] font-mono font-semibold text-sand-500 uppercase tracking-widest">
                              {course.cert_acronym}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-black text-ink-900 text-xl leading-snug mb-3">
                          {course.title}
                        </h3>
                        {course.subtitle && (
                          <p className="text-sm text-ink-900/70 leading-relaxed mb-5 flex-1 line-clamp-2">
                            {course.subtitle}
                          </p>
                        )}

                        {modules > 0 && (
                          <div className="flex items-center gap-1 mb-3">
                            {Array.from({ length: railSegments }).map((_, i) => (
                              <div key={i} className="h-1.5 flex-1 rounded-full bg-teal-500/70" />
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-sand-500 mb-5">
                          {modules > 0 && <span>{modules} module{modules !== 1 ? "s" : ""}</span>}
                          {course.duration_hours > 0 && (
                            <span className="flex items-center gap-1"><Clock size={11} /> {course.duration_hours}h</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-sand-200">
                          <span className="text-xl font-mono font-bold text-ink-900">
                            {price === 0 ? "Free" : `$${price.toLocaleString()}`}
                          </span>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-teal-600 transition-colors"
                          >
                            View Course <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
