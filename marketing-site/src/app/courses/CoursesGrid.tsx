"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Search, X, ArrowRight } from "lucide-react";

type CourseListItem = {
  id: string; slug: string; title: string; subtitle?: string | null;
  price: string | number; level?: string | null; cert_acronym?: string | null;
  module_count?: number; duration_hours?: number;
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm font-semibold px-4 py-2 rounded-full border-2 transition-colors ${
        active ? "border-teal-500 bg-teal-500 text-white" : "border-sand-300 bg-white text-ink-700 hover:border-teal-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function CoursesGrid({ courses }: { courses: CourseListItem[] }) {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string | "all">("all");
  const [price, setPrice] = useState<"all" | "free" | "paid">("all");

  const availableLevels = useMemo(
    () => Array.from(new Set(courses.map((c) => c.level).filter((l): l is string => !!l))),
    [courses],
  );

  const filtered = courses.filter((course) => {
    if (level !== "all" && course.level !== level) return false;
    if (price === "free" && Number(course.price) !== 0) return false;
    if (price === "paid" && Number(course.price) === 0) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [course.title, course.subtitle, course.cert_acronym].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-4 mb-10">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-sand-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses…"
            className="w-full pl-11 pr-9 py-3 text-sm rounded-full border-2 border-sand-300 bg-white focus:outline-none focus:border-teal-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sand-400 hover:text-ink-700"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableLevels.length > 1 && (
            <>
              <FilterChip active={level === "all"} onClick={() => setLevel("all")}>All Levels</FilterChip>
              {availableLevels.map((l) => (
                <FilterChip key={l} active={level === l} onClick={() => setLevel(l)}>
                  {LEVEL_LABELS[l] ?? l}
                </FilterChip>
              ))}
              <div className="w-px h-6 bg-sand-300 mx-1" />
            </>
          )}
          <FilterChip active={price === "all"} onClick={() => setPrice("all")}>All Prices</FilterChip>
          <FilterChip active={price === "free"} onClick={() => setPrice(price === "free" ? "all" : "free")}>Free</FilterChip>
          <FilterChip active={price === "paid"} onClick={() => setPrice(price === "paid" ? "all" : "paid")}>Paid</FilterChip>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-sand-500 text-sm">No courses match these filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((course) => {
            const coursePrice = Number(course.price);
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
                    {(course.duration_hours ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><Clock size={11} /> {course.duration_hours}h</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-sand-200">
                    <span className="text-xl font-mono font-bold text-ink-900">
                      {coursePrice === 0 ? "Free" : `$${coursePrice.toLocaleString()}`}
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
  );
}
