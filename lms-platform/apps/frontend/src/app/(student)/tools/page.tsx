"use client";

import Link from "next/link";
import useSWR from "swr";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function fetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); }).then(r => r.data ?? r);
}
function authFetcher(url: string, token: string) {
  return fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); }).then(r => r.data ?? r);
}

const GRADIENTS = [
  { from: "#e6d5f7", to: "#c8a8ef", pattern: "circles" },
  { from: "#cfe8f5", to: "#b0d0ea", pattern: "leaf" },
  { from: "#f0e2cc", to: "#dfc5a0", pattern: "circles" },
  { from: "#cdf0e2", to: "#a0d8c0", pattern: "leaf" },
  { from: "#f5cfe0", to: "#e8a8c5", pattern: "circles" },
  { from: "#d0d8f5", to: "#a8b8ee", pattern: "leaf" },
];

function CardPattern({ type }: { type: string }) {
  if (type === "leaf") return (
    <svg className="absolute right-0 bottom-0 w-3/4 h-3/4 opacity-15" viewBox="0 0 200 200" fill="none">
      <ellipse cx="160" cy="160" rx="120" ry="80" fill="white" transform="rotate(-30 160 160)" />
      <ellipse cx="160" cy="160" rx="80" ry="50" fill="white" opacity="0.5" transform="rotate(-30 160 160)" />
    </svg>
  );
  return (
    <svg className="absolute right-0 top-0 opacity-15" viewBox="0 0 200 200" fill="none">
      <circle cx="180" cy="20" r="100" fill="white" />
      <circle cx="160" cy="180" r="60" fill="white" opacity="0.6" />
    </svg>
  );
}

// ── CMS Online Tool card ──────────────────────────────────────────────────────
function ToolCard({ tool, index }: { tool: any; index: number }) {
  const grad = GRADIENTS[index % GRADIENTS.length];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
      <div className="relative flex flex-col p-5 min-h-[240px]"
        style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
        <CardPattern type={grad.pattern} />
        <div className="flex items-center gap-2 flex-wrap relative z-10">
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
            Online Tools
          </span>
          {tool.badge_text && (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm flex items-center gap-1">
              <Sparkles size={10} className="text-amber-500" /> {tool.badge_text}
            </span>
          )}
        </div>
        <div className="mt-auto relative z-10">
          <h3 className="text-xl font-bold text-navy-900 leading-snug">{tool.title}</h3>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        {tool.short_description && (
          <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1">{tool.short_description}</p>
        )}
        <Link
          href={`/tools/${tool.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-navy-900 hover:bg-navy-700 text-white text-sm font-semibold rounded-full transition-colors w-fit"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}

// ── Prep Course card ──────────────────────────────────────────────────────────
function CourseCard({ course, index }: { course: any; index: number }) {
  const grad = GRADIENTS[(index + 2) % GRADIENTS.length];
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3000";
  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
      {course.thumbnail_url ? (
        <div className="h-[240px] overflow-hidden">
          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="relative flex flex-col p-5 min-h-[240px]"
          style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
          <CardPattern type={grad.pattern} />
          <div className="flex items-center gap-2 flex-wrap relative z-10">
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
              eLearning
            </span>
            {course.cert_acronym && (
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
                {course.cert_acronym}
              </span>
            )}
          </div>
          <div className="mt-auto relative z-10">
            <h3 className="text-xl font-bold text-navy-900 leading-snug">{course.title}</h3>
          </div>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        {course.subtitle && (
          <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1 line-clamp-3">{course.subtitle}</p>
        )}
        <a
          href={`${marketingUrl}/courses/${course.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-navy-900 hover:bg-navy-700 text-white text-sm font-semibold rounded-full transition-colors w-fit"
        >
          Learn More
        </a>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function OnlineToolsPage() {
  const token = useAuthStore(s => s.accessToken);

  const { data: toolsRaw,   isLoading: loadingTools }   = useSWR("/online-tools", fetcher);
  const { data: coursesRaw, isLoading: loadingCourses } = useSWR("/prep-courses", fetcher);

  const tools: any[]   = Array.isArray(toolsRaw)   ? toolsRaw   : (toolsRaw?.data   ?? []);
  const courses: any[] = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw?.data ?? []);
  const isLoading      = loadingTools || loadingCourses;
  const hasContent     = tools.length > 0 || courses.length > 0;

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black text-navy-900 mb-2">
            {!hasContent && !isLoading ? "You don't have any online tools yet" : "Online Tools"}
          </h1>
          <p className="text-slate-500">Start your certification journey</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-96 rounded-3xl animate-pulse bg-slate-200" />
            ))}
          </div>
        ) : !hasContent ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No tools available yet — check back soon.
          </div>
        ) : (
          <>
            {tools.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                {tools.map((tool, i) => <ToolCard key={tool.id} tool={tool} index={i} />)}
              </div>
            )}

            {courses.length > 0 && (
              <>
                {tools.length > 0 && (
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4 mt-4">eLearning Courses</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {courses.map((course, i) => <CourseCard key={course.id} course={course} index={i} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
