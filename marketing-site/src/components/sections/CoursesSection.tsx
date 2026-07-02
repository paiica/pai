"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Clock, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type CourseCard = {
  title: string;
  slug: string;
  level: string;
  description: string;
  price: string;
  duration_hours: number;
  module_count: number;
  featured: string;
};

const DEFAULT_COURSES: CourseCard[] = [
  {
    title: "AI Fundamentals",
    slug: "ai-fundamentals",
    level: "Beginner",
    description: "Master the core concepts of artificial intelligence, machine learning, and practical AI tools used across industries.",
    price: "99",
    duration_hours: 2,
    module_count: 5,
    featured: "true",
  },
  {
    title: "AI for Managers",
    slug: "ai-for-managers",
    level: "Intermediate",
    description: "Learn how to lead AI-driven teams, evaluate AI projects, and build data-informed decision-making frameworks.",
    price: "149",
    duration_hours: 3,
    module_count: 6,
    featured: "false",
  },
  {
    title: "Prompt Engineering",
    slug: "prompt-engineering",
    level: "Beginner",
    description: "Go from basic prompts to advanced techniques for ChatGPT, Claude, and enterprise LLM workflows.",
    price: "79",
    duration_hours: 1.5,
    module_count: 4,
    featured: "false",
  },
];

// Signature: a faint oversized module-count numeral behind the copy, plus a
// segmented "syllabus rail" — a distinct, quieter counterpart to the
// certification cards' colored credential-badge treatment.
function CourseCardItem({ course }: { course: CourseCard }) {
  const modules = Math.max(0, Math.round(course.module_count || 0));
  const railSegments = Math.min(Math.max(modules, 1), 8);

  return (
    <div className="relative flex-shrink-0 w-[85vw] max-w-[330px] h-[460px] rounded-2xl overflow-hidden flex flex-col bg-white border border-sand-300 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
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
            <span className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-teal-700 uppercase tracking-[0.15em] pl-3 border-l-2 border-teal-500">
              {course.level}
            </span>
          </div>
          {course.featured === "true" && (
            <span className="text-[10px] font-mono font-semibold text-sand-500 uppercase tracking-widest">Featured</span>
          )}
        </div>

        <h3 className="font-display font-black text-[21px] leading-snug mb-3 text-ink-900">{course.title}</h3>
        <p className="text-sm leading-relaxed flex-1 mb-5 text-ink-900/70 line-clamp-3">{course.description}</p>

        {/* Syllabus rail — one segment per module */}
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

        <div className="flex items-center justify-between pt-4 border-t border-sand-200">
          <span className="text-xl font-mono font-bold text-ink-900">${course.price}</span>
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
}

export default function CoursesSection({ cmsContent = {} }: { cmsContent?: Record<string, any> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [apicourses, setApiCourses] = useState<CourseCard[] | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/prep-courses/featured`)
      .then((r) => r.json())
      .then((r) => {
        const items: any[] = Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : [];
        setApiCourses(items.map((c: any) => ({
          title: c.title,
          slug: c.slug,
          level: c.level ? c.level.charAt(0).toUpperCase() + c.level.slice(1) : "All Levels",
          description: c.subtitle || c.description || "",
          price: c.price != null ? String(Math.round(Number(c.price))) : "0",
          duration_hours: Number(c.duration_hours) || 0,
          module_count: Number(c.module_count) || 0,
          featured: "true",
        })));
      })
      .catch(() => { setApiCourses([]); });
  }, []);

  const badge = cmsContent.badge ?? "Prep Courses";
  const title = cmsContent.title ?? "Learn at Your Own Pace.";
  const titleHighlight = cmsContent.title_highlight ?? "Pass with Confidence.";
  const description = cmsContent.description ?? "Our self-paced courses prepare you for certification exams with video lessons, quizzes, and hands-on projects.";
  const ctaCardTitle = cmsContent.cta_card_title ?? "Not sure where to start?";
  const ctaCardDesc = cmsContent.cta_card_desc ?? "Browse all courses and find the right path for your goals.";
  const ctaCardLabel = cmsContent.cta_card_label ?? "Browse All Courses";
  const ctaCardHref = cmsContent.cta_card_href ?? "/courses";

  // Only use API data — never fall back to hardcoded defaults
  const courses: CourseCard[] = apicourses ?? (cmsContent.courses as CourseCard[] | undefined) ?? [];

  // Hide section entirely while loading or when no courses exist
  if (apicourses === null) return null;
  if (courses.length === 0) return null;

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -350 : 350, behavior: "smooth" });
  }

  return (
    <section className="section-padding bg-sand-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <span className="badge-teal mb-4">{badge}</span>
            <h2 className="section-title">
              {title}
              <br />
              <span className="text-gradient">{titleHighlight}</span>
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-ink-900/70 leading-relaxed mb-5">{description}</p>
            <Link href="/courses" className="inline-flex items-center gap-1.5 text-ink-900 font-bold text-sm hover:text-teal-600 transition-colors border-b border-sand-300 pb-0.5">
              View All Courses <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: "none" }}>
          {courses.map((course, i) => (
            <div key={course.slug || i} className="snap-start">
              <CourseCardItem course={course} />
            </div>
          ))}

          {/* CTA card */}
          <div className="flex-shrink-0 w-[85vw] max-w-[330px] snap-start">
            <div className="h-[460px] rounded-2xl bg-white border border-sand-300 flex flex-col items-center justify-center p-7 text-center">
              <div className="w-20 h-20 rounded-2xl bg-sand-100 flex items-center justify-center mb-5">
                <Compass size={34} className="text-ink-900" strokeWidth={1.5} />
              </div>
              <p className="font-display font-black text-ink-900 text-lg mb-2.5">{ctaCardTitle}</p>
              <p className="text-sm text-ink-900/70 mb-7">{ctaCardDesc}</p>
              <Link href={ctaCardHref} className="btn-primary !py-3 !px-6 !text-sm">
                {ctaCardLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-1.5">
            {courses.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-5 bg-ink-700" : "w-1.5 bg-sand-300")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scroll("left")} className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center text-ink-900 hover:border-ink-300 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll("right")} className="w-10 h-10 rounded-full border border-sand-300 flex items-center justify-center text-ink-900 hover:border-ink-300 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
