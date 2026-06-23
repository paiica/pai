"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ChevronRight, CheckCircle, ShoppingCart, Loader2,
  Clock, BarChart2, BookOpen, PlayCircle, FileText, Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function fetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then(r => r.json()).then(r => r.data ?? r);
}
function authFetcher(url: string, token: string) {
  return fetch(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => r.json()).then(r => r.data ?? r);
}

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

const LESSON_TYPE_ICON: Record<string, any> = {
  video:      PlayCircle,
  reading:    FileText,
  quiz:       BarChart2,
  assignment: FileText,
  html:       FileText,
};

const LEVEL_LABEL: Record<string, string> = {
  beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced",
};

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const token = useAuthStore(s => s.accessToken);
  const { addItem, hasItem } = useCartStore();
  const [activeTab, setActiveTab] = useState(0);
  const [openModule, setOpenModule] = useState<string | null>(null);

  const overviewRef   = useRef<HTMLElement>(null);
  const curriculumRef = useRef<HTMLElement>(null);

  const { data: course, isLoading } = useSWR(`/prep-courses/${slug}`, fetcher);
  const { data: myEnrollmentsRaw } = useSWR(
    token ? ["/prep-courses/my/enrollments", token] : null,
    ([url, t]) => authFetcher(url, t)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-navy-600" />
      </div>
    );
  }

  if (!course || course.statusCode === 404) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <p className="text-2xl font-display font-black text-navy-900 mb-3">Course not found</p>
          <Link href="/tools" className="text-sm text-slate-500 hover:text-navy-700">← Back to Online Tools</Link>
        </div>
      </div>
    );
  }

  const grad      = getGradient(course.slug);
  const price     = Number(course.price);
  const modules: any[] = Array.isArray(course.modules) ? course.modules : [];
  const totalLessons = modules.reduce((s: number, m: any) => s + (Array.isArray(m.lessons) ? m.lessons.length : 0), 0);
  const enrollments: any[] = Array.isArray(myEnrollmentsRaw) ? myEnrollmentsRaw : [];
  const enrollment = enrollments.find(e => e.course_id === course.id);
  const enrolled   = !!enrollment;
  const inCart     = hasItem(course.id);

  const tabs = [
    { label: "Overview",    ref: overviewRef,   show: !!course.description },
    { label: "Curriculum",  ref: curriculumRef, show: modules.length > 0 },
  ].filter(t => t.show);

  function scrollTo(ref: React.RefObject<HTMLElement | null>, idx: number) {
    setActiveTab(idx);
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddToCart() {
    addItem({ id: course.id, type: "course", course_id: course.id,
      title: course.title, subtitle: course.subtitle, price,
      thumbnail_url: course.thumbnail_url, level: course.level });
    toast.success("Added to cart");
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div style={{ background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.to} 100%)` }}>
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-2 flex items-center gap-2 text-xs text-navy-700/60">
          <Link href="/tools" className="hover:text-navy-900 transition-colors font-medium">Online Tools</Link>
          <ChevronRight size={12} />
          <span className="text-navy-800 font-medium truncate max-w-xs">{course.title}</span>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left — course thumbnail or acronym box */}
          <div className="flex items-center justify-center lg:justify-start">
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title}
                className="w-72 h-48 object-cover rounded-2xl shadow-md" />
            ) : (
              <div className="w-72 h-48 rounded-2xl border-2 border-navy-900/30 bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                <BookOpen size={40} className="text-navy-700" />
                {course.cert_acronym && (
                  <span className="text-2xl font-black text-navy-900">{course.cert_acronym}</span>
                )}
              </div>
            )}
          </div>

          {/* Right — info + CTA */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800">
                eLearning
              </span>
              {course.level && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800">
                  {LEVEL_LABEL[course.level] ?? course.level}
                </span>
              )}
              {course.cert_acronym && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800">
                  {course.cert_acronym}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-display font-black text-navy-900 leading-tight mb-2">{course.title}</h1>

            {course.subtitle && (
              <p className="text-sm text-navy-800 leading-relaxed mb-4">{course.subtitle}</p>
            )}

            {/* Quick stats */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {course.duration_hours > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-navy-700">
                  <Clock size={13} /> {course.duration_hours}h of content
                </span>
              )}
              {totalLessons > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-navy-700">
                  <BookOpen size={13} /> {totalLessons} lessons
                </span>
              )}
              {modules.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-navy-700">
                  <BarChart2 size={13} /> {modules.length} modules
                </span>
              )}
            </div>

            <div className="border-t border-navy-900/15 pt-4">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-navy-600 font-semibold uppercase tracking-wide mb-0.5">Price</p>
                  <p className="text-2xl font-black text-navy-900">
                    {price === 0 ? "Free" : `USD $${price.toFixed(0)}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!token ? (
                    <Link
                      href={`/login?redirect=/tools/course/${slug}`}
                      className="px-6 py-2.5 bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold rounded-full transition-colors inline-flex items-center gap-2"
                    >
                      <ShoppingCart size={14} />
                      {price === 0 ? "Enroll Free" : "Get Started"}
                    </Link>
                  ) : enrolled ? (
                    <Link href={`/learn/course/${enrollment.id}`} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-full transition-colors inline-flex items-center gap-2">
                      <CheckCircle size={14} /> Access Course
                    </Link>
                  ) : inCart ? (
                    <Link href="/cart" className="px-6 py-2.5 bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold rounded-full transition-colors inline-flex items-center gap-2">
                      <ShoppingCart size={14} /> Go to Cart
                    </Link>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      className="px-6 py-2.5 bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold rounded-full transition-colors inline-flex items-center gap-2"
                    >
                      <ShoppingCart size={14} />
                      {price === 0 ? "Enroll Free" : "Add to Cart"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      {tabs.length > 0 && (
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 flex items-center">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => scrollTo(tab.ref, i)}
                className={cn(
                  "px-6 py-4 text-sm font-semibold border-b-2 transition-colors",
                  activeTab === i ? "border-navy-900 text-navy-900" : "border-transparent text-slate-400 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6">

        {/* ── Overview ── */}
        {course.description && (
          <section ref={overviewRef} className="py-16 grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-slate-100">
            <div>
              <h2 className="text-3xl font-display font-black text-navy-900">Overview</h2>
            </div>
            <div className="lg:col-span-2">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{course.description}</p>
            </div>
          </section>
        )}

        {/* ── Curriculum ── */}
        {modules.length > 0 && (
          <section ref={curriculumRef} className="py-16">
            <h2 className="text-3xl font-display font-black text-navy-900 mb-2">Curriculum</h2>
            <p className="text-slate-500 text-sm mb-6">{modules.length} modules · {totalLessons} lessons</p>
            <div className="space-y-2">
              {modules.map((mod: any) => {
                const isOpen = openModule === mod.id;
                const lessons: any[] = Array.isArray(mod.lessons) ? mod.lessons : [];
                return (
                  <div key={mod.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <button
                      onClick={() => setOpenModule(isOpen ? null : mod.id)}
                      className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                      <span className="font-semibold text-navy-900 text-sm">{mod.title}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>
                        <ChevronRight size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-90")} />
                      </div>
                    </button>
                    {isOpen && lessons.length > 0 && (
                      <div className="divide-y divide-slate-100">
                        {lessons.map((lesson: any) => {
                          const Icon = LESSON_TYPE_ICON[lesson.type] ?? FileText;
                          return (
                            <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                              <Icon size={14} className="text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-700 flex-1">{lesson.title}</span>
                              {lesson.duration_minutes > 0 && (
                                <span className="text-xs text-slate-400">{lesson.duration_minutes}m</span>
                              )}
                              {!lesson.is_free_preview && !enrolled && (
                                <Lock size={12} className="text-slate-300" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
