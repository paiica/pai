"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

const COURSE_THEMES = [
  { bg: "bg-blue-50", borderColor: "border-blue-200", accentColor: "#3b82f6" },
  { bg: "bg-amber-50", borderColor: "border-amber-200", accentColor: "#f59e0b" },
  { bg: "bg-purple-50", borderColor: "border-purple-200", accentColor: "#a855f7" },
  { bg: "bg-emerald-50", borderColor: "border-emerald-200", accentColor: "#10b981" },
];

type CourseCard = {
  title: string;
  slug: string;
  level: string;
  description: string;
  price: string;
  badge_icon: string;
  featured: string;
};

const DEFAULT_COURSES: CourseCard[] = [
  {
    title: "AI Fundamentals",
    slug: "ai-fundamentals",
    level: "Beginner",
    description: "Master the core concepts of artificial intelligence, machine learning, and practical AI tools used across industries.",
    price: "99",
    badge_icon: "🤖",
    featured: "true",
  },
  {
    title: "AI for Managers",
    slug: "ai-for-managers",
    level: "Intermediate",
    description: "Learn how to lead AI-driven teams, evaluate AI projects, and build data-informed decision-making frameworks.",
    price: "149",
    badge_icon: "📊",
    featured: "false",
  },
  {
    title: "Prompt Engineering",
    slug: "prompt-engineering",
    level: "Beginner",
    description: "Go from basic prompts to advanced techniques for ChatGPT, Claude, and enterprise LLM workflows.",
    price: "79",
    badge_icon: "✍️",
    featured: "false",
  },
];

function CourseCardItem({ course, idx }: { course: CourseCard; idx: number }) {
  const theme = COURSE_THEMES[idx % COURSE_THEMES.length];
  return (
    <div className={cn("relative flex-shrink-0 w-[280px] h-[400px] rounded-2xl overflow-hidden flex flex-col border", theme.bg, theme.borderColor)}>
      <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${theme.accentColor}20, ${theme.accentColor}05)` }}>
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
          <span className="text-4xl">{course.badge_icon}</span>
          {course.featured === "true" && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-500 text-white border-0">
              Featured
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="text-[11px] font-semibold text-slate-500 mb-1 uppercase tracking-wider">{course.level}</p>
        <h3 className="font-display font-black text-[16px] leading-snug mb-2 text-slate-900">{course.title}</h3>
        <p className="text-[13px] leading-relaxed flex-1 mb-4 text-slate-600 line-clamp-3">{course.description}</p>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <span className="text-lg font-black text-slate-900">${course.price}</span>
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-bold transition-colors bg-slate-900 text-white hover:bg-slate-700"
          >
            Learn More <ArrowRight size={11} />
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
          badge_icon: c.cert_acronym ? "📚" : "🤖",
          featured: "true",
        })));
      })
      .catch(() => {});
  }, []);

  const badge = cmsContent.badge ?? "Prep Courses";
  const title = cmsContent.title ?? "Learn at Your Own Pace.";
  const titleHighlight = cmsContent.title_highlight ?? "Pass with Confidence.";
  const description = cmsContent.description ?? "Our self-paced courses prepare you for certification exams with video lessons, quizzes, and hands-on projects.";
  const ctaCardTitle = cmsContent.cta_card_title ?? "Not sure where to start?";
  const ctaCardDesc = cmsContent.cta_card_desc ?? "Browse all courses and find the right path for your goals.";
  const ctaCardLabel = cmsContent.cta_card_label ?? "Browse All Courses";
  const ctaCardHref = cmsContent.cta_card_href ?? "/courses";
  const courses: CourseCard[] = apicourses !== null
    ? apicourses
    : ((cmsContent.courses as CourseCard[])?.length ? (cmsContent.courses as CourseCard[]) : DEFAULT_COURSES);

  function scroll(dir: "left" | "right") {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  }

  return (
    <section className="section-padding bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <span className="badge-gold mb-4">{badge}</span>
            <h2 className="section-title">
              {title}
              <br />
              <span className="text-gradient">{titleHighlight}</span>
            </h2>
          </div>
          <div className="max-w-sm">
            <p className="text-slate-700 leading-relaxed mb-5">{description}</p>
            <Link href="/courses" className="inline-flex items-center gap-1.5 text-slate-900 font-bold text-sm hover:text-slate-700 transition-colors border-b border-slate-300 pb-0.5">
              View All Courses <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: "none" }}>
          {courses.map((course, i) => (
            <div key={course.slug || i} className="snap-start">
              <CourseCardItem course={course} idx={i} />
            </div>
          ))}

          {/* CTA card */}
          <div className="flex-shrink-0 w-[280px] snap-start">
            <div className="h-[400px] rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <span className="text-3xl">📚</span>
              </div>
              <p className="font-display font-black text-slate-900 text-base mb-2">{ctaCardTitle}</p>
              <p className="text-sm text-slate-600 mb-6">{ctaCardDesc}</p>
              <Link href={ctaCardHref} className="btn-primary !py-2.5 !px-5 !text-sm">
                {ctaCardLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-1.5">
            {courses.map((_, i) => (
              <div key={i} className={cn("h-1.5 rounded-full transition-all", i === 0 ? "w-5 bg-slate-700" : "w-1.5 bg-slate-300")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => scroll("left")} className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-900 hover:text-slate-700 hover:border-slate-400 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => scroll("right")} className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-900 hover:text-slate-700 hover:border-slate-400 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
