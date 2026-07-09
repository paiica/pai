"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  BookOpen, Calendar, ArrowRight, CheckCircle, GraduationCap,
  ShoppingCart, Layers, ExternalLink, ChevronDown, Clock, Trophy, Play,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function authFetcher(url: string, token: string) {
  return fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json()).then(r => r.data ?? r);
}

function publicFetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then(r => r.json()).then(r => r.data ?? r);
}

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

const LEVEL_COLOR: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700 border border-emerald-100",
  intermediate: "bg-blue-50 text-blue-700 border border-blue-100",
  advanced:     "bg-purple-50 text-purple-700 border border-purple-100",
};

const CERT_ACCENTS = [
  { badge: "from-amber-400 via-orange-400 to-rose-400",    bar: "bg-amber-400",   ring: "ring-amber-300/50"   },
  { badge: "from-blue-500 via-indigo-500 to-violet-500",   bar: "bg-blue-500",    ring: "ring-blue-300/50"    },
  { badge: "from-violet-500 via-purple-500 to-fuchsia-500",bar: "bg-violet-500",  ring: "ring-violet-300/50"  },
  { badge: "from-emerald-400 via-teal-500 to-cyan-500",    bar: "bg-emerald-500", ring: "ring-emerald-300/50" },
  { badge: "from-rose-500 via-pink-500 to-fuchsia-400",    bar: "bg-rose-500",    ring: "ring-rose-300/50"    },
];

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-3">{children}</p>
  );
}

// ─── Cert accordion card ──────────────────────────────────────────────────────

function CertBannerCard({
  enrollment, index, certCourses, prepEnrollments,
}: {
  enrollment: any; index: number; certCourses: any[]; prepEnrollments: any[];
}) {
  const [open, setOpen] = useState(false);
  const cert = enrollment.certification;
  const pct = enrollment.progress_percentage ?? 0;
  const isCompleted = pct === 100;
  const accent = CERT_ACCENTS[index % CERT_ACCENTS.length];
  const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString("en-CA", {
    month: "short", day: "numeric", year: "numeric",
  });

  const statusText  = isCompleted ? "Completed" : pct > 0 ? `${pct}% complete` : "Not started";
  const statusClass = isCompleted
    ? "bg-emerald-50 text-emerald-700"
    : pct > 0
    ? "bg-amber-50 text-amber-700"
    : "bg-slate-100 text-slate-500";
  const dotClass = isCompleted ? "bg-emerald-500" : pct > 0 ? "bg-amber-400" : "bg-slate-300";

  return (
    <div className={cn(
      "rounded-2xl bg-white overflow-hidden border transition-all duration-200",
      open ? "border-slate-300 shadow-lg" : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className={cn(
          "w-16 h-16 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center ring-4 gap-1 relative overflow-hidden shadow-lg",
          `bg-gradient-to-br ${accent.badge}`, accent.ring
        )}>
          {/* shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/5 to-transparent pointer-events-none" />
          {/* bottom shadow */}
          <div className="absolute bottom-0 inset-x-0 h-1/3 bg-black/10 pointer-events-none" />
          {cert?.acronym?.split(/\s+/).map((word: string, i: number) => (
            <span
              key={i}
              className={cn(
                "relative font-black text-white tracking-widest leading-none text-center uppercase block drop-shadow",
                cert.acronym.replace(/\s/g, "").length <= 4 ? "text-[13px]" : "text-[11px]"
              )}
            >
              {word}
            </span>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{cert?.acronym}™</span>
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full", statusClass)}>
              <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotClass)} />
              {statusText}
            </span>
          </div>
          <p className="font-display font-bold text-navy-900 text-[15px] leading-snug truncate mb-1">{cert?.title}</p>
          {certCourses.length > 0 && (
            <p className="text-[10px] text-slate-400 mb-2">
              {certCourses.length} course{certCourses.length !== 1 ? "s" : ""}
              {" · "}
              {certCourses.reduce((s, c) => s + (c.module_count || 0), 0)} modules
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", isCompleted ? "bg-emerald-500" : accent.bar)}

                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0 w-8 text-right">{pct}%</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar size={9} /> {enrolledDate}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/learn/${enrollment.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Play size={11} className="fill-white" />
              {isCompleted ? "Review" : pct > 0 ? "Continue" : "Start"}
            </Link>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0",
              open ? "bg-navy-900" : "bg-slate-100 hover:bg-slate-200"
            )}>
              <ChevronDown
                size={14}
                className={cn("transition-transform duration-200", open ? "rotate-180 text-white" : "text-slate-400")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expandable course list */}
      <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", open ? "max-h-[600px]" : "max-h-0")}>
        <div className="px-5 pb-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 overflow-hidden">
            {certCourses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No courses linked to this certification yet.</p>
            ) : (
              certCourses.map((course: any, idx: number) => {
                const prepEnrollment = prepEnrollments.find((e: any) => e.course_id === course.id);
                const coursePct = prepEnrollment?.progress_percentage ?? 0;
                const href = prepEnrollment
                  ? `/learn/course/${prepEnrollment.id}`
                  : `/learn/${enrollment.id}`;

                return (
                  <div
                    key={course.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5",
                      idx > 0 && "border-t border-slate-100"
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate leading-snug">
                        {course.title}
                        {course.subtitle && (
                          <span className="font-normal text-slate-400 ml-1.5 text-xs">· {course.subtitle}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 mb-1.5">
                        {course.module_count > 0 && (
                          <span className="text-[10px] text-slate-400">{course.module_count} module{course.module_count !== 1 ? "s" : ""}</span>
                        )}
                        {parseFloat(course.duration_hours) > 0 && (
                          <>
                            {course.module_count > 0 && <span className="text-[10px] text-slate-300">·</span>}
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock size={9} /> {parseFloat(course.duration_hours)}h
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", coursePct === 100 ? "bg-emerald-500" : accent.bar)}
                            style={{ width: `${coursePct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 flex-shrink-0 w-7 text-right">{coursePct}%</span>
                      </div>
                    </div>
                    {course.level && (
                      <span className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize flex-shrink-0",
                        LEVEL_COLOR[course.level] ?? "bg-slate-100 text-slate-600"
                      )}>
                        {course.level}
                      </span>
                    )}
                    <Link
                      href={href}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-700 text-white transition-colors"
                    >
                      {coursePct === 100 ? "Review" : coursePct > 0 ? "Continue" : "Start"}
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Standalone prep course banner ───────────────────────────────────────────

function PrepCourseBanner({ enrollment }: { enrollment: any }) {
  const pct = enrollment.progress_percentage ?? 0;

  return (
    <Link
      href={`/learn/course/${enrollment.id}`}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br from-violet-50 to-purple-100 ring-4 ring-violet-100 flex items-center justify-center">
        <GraduationCap size={20} className="text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        {enrollment.cert_acronym && (
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">{enrollment.cert_acronym}</p>
        )}
        <p className="font-display font-bold text-navy-900 text-[15px] leading-snug truncate mb-2">{enrollment.title}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">{pct}%</span>
        </div>
      </div>
      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-navy-900 flex items-center justify-center transition-all">
        <ArrowRight size={14} className="text-slate-400 group-hover:text-white transition-colors" />
      </div>
    </Link>
  );
}

// ─── Related courses strip ────────────────────────────────────────────────────

function RelatedCoursesStrip({
  certId, enrolledCourseIds, prepEnrollments, onAddToCart, hasItem,
}: {
  certId: string; enrolledCourseIds: Set<string>; prepEnrollments: any[];
  onAddToCart: (course: any) => void; hasItem: (id: string) => boolean;
}) {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    if (!certId) return;
    fetch(`${API_BASE}/prep-courses/recommended-by-cert/${certId}`)
      .then(r => r.json())
      .then(r => setCourses(Array.isArray(r.data) ? r.data : []));
  }, [certId]);

  if (!courses.length) return null;

  return (
    <div className="pl-1">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
        Related Courses
        <span className="font-normal normal-case tracking-normal ml-1.5 text-slate-300">
          · standalone courses that pair well with this certification
        </span>
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {courses.map((course: any) => {
          const enrolled = enrolledCourseIds.has(course.id);
          const enrollment = prepEnrollments.find((e: any) => e.course_id === course.id);
          const price = parseFloat(course.price) || 0;
          const inCart = hasItem(course.id);

          return (
            <div key={course.id} className="w-52 flex-shrink-0 rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2 hover:border-slate-300 hover:shadow-sm transition-all">
              <div>
                <p className="font-semibold text-navy-900 text-xs leading-snug line-clamp-2 mb-1.5">{course.title}</p>
                <div className="flex items-center gap-1.5">
                  {course.level && (
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize", LEVEL_COLOR[course.level] ?? "bg-slate-100 text-slate-600")}>
                      {course.level}
                    </span>
                  )}
                  <span className="text-[10px] font-black text-navy-900 ml-auto">
                    {price === 0 ? "Free" : `$${price.toFixed(0)}`}
                  </span>
                </div>
              </div>
              <div className="mt-auto">
                {enrolled ? (
                  <Link href={`/learn/course/${enrollment!.id}`}
                    className="w-full text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                    <CheckCircle size={10} /> Enrolled
                  </Link>
                ) : inCart ? (
                  <Link href="/cart"
                    className="w-full text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors">
                    <ShoppingCart size={10} /> In Cart
                  </Link>
                ) : (
                  <button onClick={() => onAddToCart(course)}
                    className="w-full bg-navy-900 hover:bg-navy-700 text-white text-[11px] font-semibold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1">
                    <ShoppingCart size={10} /> Add to Cart
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Catalog course card ──────────────────────────────────────────────────────

const CATALOG_GRADIENTS = [
  { a: "#f0ebe8", b: "#e0d5cf" },
  { a: "#e8eef7", b: "#d0dcf0" },
  { a: "#f0ece8", b: "#e0d8cf" },
  { a: "#e8f3ee", b: "#d0e8da" },
  { a: "#f3e8ee", b: "#e8d0da" },
  { a: "#eae8f3", b: "#d8d0e8" },
];

function CatalogCourseCard({
  course, index, isEnrolled, enrollmentId, certEnrollmentId, onAddToCart, inCart,
}: {
  course: any; index: number; isEnrolled: boolean;
  enrollmentId?: string; certEnrollmentId?: string;
  onAddToCart: () => void; inCart: boolean;
}) {
  const price = parseFloat(course.price) || 0;
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";
  const g = CATALOG_GRADIENTS[index % CATALOG_GRADIENTS.length];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200 group">
      <div
        className="relative h-28 flex flex-col justify-end p-4 overflow-hidden"
        style={{ background: `linear-gradient(140deg, ${g.a} 0%, ${g.b} 100%)` }}
      >
        {isEnrolled && (
          <div className="absolute top-3 right-3">
            <span className="bg-white/95 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <CheckCircle size={9} /> Enrolled
            </span>
          </div>
        )}
        {course.cert_acronym && (
          <p className="text-[9px] font-black tracking-widest text-slate-500/60 uppercase mb-0.5">{course.cert_acronym}</p>
        )}
        <p className="font-display font-black text-slate-700 text-lg leading-tight line-clamp-1">{course.title}</p>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {course.level && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize", LEVEL_COLOR[course.level] ?? "bg-slate-100 text-slate-600")}>
              {course.level}
            </span>
          )}
          {course.module_count > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Layers size={9} /> {course.module_count}
            </span>
          )}
          {parseFloat(course.duration_hours) > 0 && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock size={9} /> {course.duration_hours}h
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 line-clamp-2 mb-3">
          {course.description || course.subtitle || ""}
        </p>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="font-black text-navy-900 text-sm">{price === 0 ? "Free" : `$${price.toFixed(2)}`}</span>
          {isEnrolled ? (
            <Link
              href={certEnrollmentId ? `/learn/${certEnrollmentId}` : `/learn/course/${enrollmentId}`}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
            >
              {certEnrollmentId ? "Included in cert" : "Continue"} <ArrowRight size={11} />
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              {!inCart ? (
                <button onClick={onAddToCart}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:border-navy-300 hover:text-navy-700 transition-colors">
                  <ShoppingCart size={12} />
                </button>
              ) : (
                <Link href="/cart"
                  className="p-1.5 rounded-lg border border-navy-200 text-navy-600 hover:text-navy-800 transition-colors">
                  <ShoppingCart size={12} />
                </Link>
              )}
              <a
                href={course.slug ? `${marketingUrl}/courses/${course.slug}` : `${marketingUrl}/courses`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                View <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyCoursesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { addItem, hasItem, items } = useCartStore();
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [certFilter, setCertFilter] = useState<string | null>(null);

  const { data, isLoading } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: prepRaw, isLoading: loadingPrep } = useSWR(
    token ? ["/prep-courses/my/enrollments", token] : null,
    ([url, t]) => authFetcher(url, t)
  );
  const { data: catalogRaw, isLoading: loadingCatalog } = useSWR(
    "/prep-courses",
    publicFetcher
  );

  const all: any[] = data?.data ?? data ?? [];
  const active = all.filter((e: any) => e.status === "active");
  const completed = all.filter((e: any) => e.status === "completed");
  const shown = tab === "active" ? active : completed;
  const prepEnrollments: any[] = Array.isArray(prepRaw) ? prepRaw : [];
  const catalog: any[] = Array.isArray(catalogRaw) ? catalogRaw : [];

  const enrolledCourseIds = new Set(prepEnrollments.map((e: any) => e.course_id));
  const certIdToEnrollmentId = new Map<string, string>(
    active.map((e: any) => [e.certification?.id, e.id] as [string, string])
  );

  const certFilters: { id: string; acronym: string; title: string }[] = [];
  const seenCertIds = new Set<string>();
  for (const c of catalog) {
    if (c.certification_id && !seenCertIds.has(c.certification_id)) {
      seenCertIds.add(c.certification_id);
      certFilters.push({ id: c.certification_id, acronym: c.cert_acronym ?? c.certification_id, title: c.cert_title ?? "" });
    }
  }

  const filteredCatalog = certFilter
    ? catalog.filter((c: any) => c.certification_id === certFilter)
    : catalog;

  function handleAddToCart(course: any) {
    const price = parseFloat(course.price) || 0;
    addItem({
      id: course.id, type: "course", course_id: course.id,
      title: course.title, subtitle: course.subtitle, price,
      thumbnail_url: course.thumbnail_url ?? undefined,
      level: course.level, cert_acronym: course.cert_acronym ?? undefined,
    });
    toast.success(price === 0
      ? `"${course.title}" added — go to Cart to enroll free!`
      : `"${course.title}" added to cart`
    );
  }

  const activeSummary = [
    active.length > 0 && `${active.length} certification${active.length !== 1 ? "s" : ""}`,
    prepEnrollments.length > 0 && `${prepEnrollments.length} standalone course${prepEnrollments.length !== 1 ? "s" : ""}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-display font-black text-navy-900 tracking-tight">My Learning</h1>
            <p className="text-sm text-slate-400 mt-1">
              {activeSummary || "Start your certification journey below"}
            </p>
          </div>
          {items.length > 0 && (
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 bg-navy-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-navy-700 transition-colors shadow-sm"
            >
              <ShoppingCart size={13} /> Cart ({items.length})
            </Link>
          )}
        </div>

        {/* ── Standalone Courses ── */}
        {(loadingPrep || prepEnrollments.length > 0) && (
          <section className="mb-10">
            <SectionLabel>Standalone Courses</SectionLabel>
            {loadingPrep ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-[76px] rounded-2xl animate-pulse bg-slate-200" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {prepEnrollments.map((e: any) => (
                  <PrepCourseBanner key={e.id} enrollment={e} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Certification Programs ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Certification Programs</SectionLabel>
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              {(["active", "completed"] as const).map((key) => {
                const count = key === "active" ? active.length : completed.length;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize",
                      tab === key
                        ? "bg-navy-900 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-700"
                    )}
                  >
                    {key}{count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="rounded-2xl bg-white border border-slate-200 p-5 flex items-center gap-4 animate-pulse">
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-24" />
                    <div className="h-4 bg-slate-200 rounded w-48" />
                    <div className="h-1.5 bg-slate-200 rounded-full w-full" />
                  </div>
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-200" />
                </div>
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              <Trophy size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500 text-sm mb-1">
                {tab === "active" ? "No active programs" : "No completed certifications yet"}
              </p>
              <p className="text-xs text-slate-400">
                {tab === "active"
                  ? "Enroll in a certification program to get started"
                  : "Complete an active program to see it here"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map((e: any, i: number) => (
                <div key={e.id} className="space-y-3">
                  <CertBannerCard
                    enrollment={e}
                    index={i}
                    certCourses={catalog.filter((c: any) => c.certification_id === e.certification?.id)}
                    prepEnrollments={prepEnrollments}
                  />
                  <RelatedCoursesStrip
                    certId={e.certification?.id}
                    enrolledCourseIds={enrolledCourseIds}
                    prepEnrollments={prepEnrollments}
                    onAddToCart={handleAddToCart}
                    hasItem={hasItem}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Browse Courses ── */}
        <section>
          <div className="mb-5">
            <SectionLabel>Browse Courses</SectionLabel>
            <p className="text-xs text-slate-400 -mt-2">Standalone prep courses available for individual enrollment</p>
          </div>

          {certFilters.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <button
                onClick={() => setCertFilter(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                  certFilter === null
                    ? "bg-navy-900 text-white border-navy-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-navy-300 hover:text-navy-700"
                )}
              >
                All
              </button>
              {certFilters.map((cf) => (
                <button
                  key={cf.id}
                  onClick={() => setCertFilter(certFilter === cf.id ? null : cf.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    certFilter === cf.id
                      ? "bg-navy-900 text-white border-navy-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-navy-300 hover:text-navy-700"
                  )}
                >
                  {cf.acronym}
                  {cf.title && <span className="ml-1 opacity-60 font-normal hidden sm:inline">· {cf.title}</span>}
                </button>
              ))}
            </div>
          )}

          {loadingCatalog ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-2xl animate-pulse bg-slate-200" />)}
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              <BookOpen size={28} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-semibold text-sm">
                {catalog.length === 0 ? "No courses available yet" : "No courses match this filter"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map((course: any, i: number) => {
                const directEnrollment = prepEnrollments.find((e: any) => e.course_id === course.id);
                const certEnrollmentId = course.certification_id
                  ? certIdToEnrollmentId.get(course.certification_id)
                  : undefined;
                const enrolled = !!directEnrollment || !!certEnrollmentId;
                return (
                  <CatalogCourseCard
                    key={course.id}
                    course={course}
                    index={i}
                    isEnrolled={enrolled}
                    enrollmentId={directEnrollment?.id}
                    certEnrollmentId={certEnrollmentId}
                    onAddToCart={() => handleAddToCart(course)}
                    inCart={hasItem(course.id)}
                  />
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
