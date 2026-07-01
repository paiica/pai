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
        <section className="pt-[148px] pb-20 bg-hero-dark relative overflow-hidden">
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
                  const grad = getGradient(course.slug);
                  const price = Number(course.price);
                  return (
                    <div
                      key={course.id}
                      className="bg-white rounded-2xl border border-sand-200 shadow-card hover:shadow-card-hover transition-all flex flex-col overflow-hidden"
                    >
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div
                          className="h-40 w-full"
                          style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
                        />
                      )}
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {course.level && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">
                              {course.level}
                            </span>
                          )}
                          {course.cert_acronym && (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 border border-teal-200 bg-teal-50 px-2 py-0.5 rounded-full">
                              {course.cert_acronym}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-black text-ink-900 text-lg leading-snug mb-2">
                          {course.title}
                        </h3>
                        {course.subtitle && (
                          <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1 line-clamp-2">
                            {course.subtitle}
                          </p>
                        )}
                        {course.duration_hours > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
                            <Clock size={11} /> {course.duration_hours}h of content
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-sand-100">
                          <span className="text-xl font-display font-black text-ink-900">
                            {price === 0 ? "Free" : `$${price.toLocaleString()}`}
                          </span>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="btn-dark !py-2 !px-4 !text-xs flex items-center gap-1"
                          >
                            Learn More <ArrowRight size={12} />
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
