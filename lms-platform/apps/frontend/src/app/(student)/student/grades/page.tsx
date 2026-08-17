"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { BarChart2, CheckCircle2, XCircle, HelpCircle, ClipboardList, Trophy, Clock, GraduationCap, Award, Download, ChevronRight, ChevronDown, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

function pctOf(item: any) {
  if (item.type === "quiz") return item.score;
  if (item.grade === null || item.grade === undefined) return null;
  return Math.round((item.grade / (item.max_score || 100)) * 100);
}

const STANDALONE = "__standalone__";

// ─── Overall average ring ──────────────────────────────────────────────────

function AverageRing({ value }: { value: number | null }) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const pct = value ?? 0;
  const offset = circumference - (pct / 100) * circumference;
  const color = value === null ? "#cbd5e1" : pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#eef1f5" strokeWidth="8" />
        {value !== null && (
          <circle
            cx="48" cy="48" r={r}
            fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-navy-900">{value !== null ? `${value}%` : "—"}</span>
      </div>
    </div>
  );
}

// ─── Graded item row ────────────────────────────────────────────────────────

function GradeRow({ item }: { item: any }) {
  const t = useTranslations("Grades");
  const isQuiz = item.type === "quiz";
  const pct = pctOf(item);
  const passed = isQuiz ? item.passed : (item.grade !== null && item.grade !== undefined ? pct! >= 50 : null);
  const hasScore = pct !== null && pct !== undefined;
  const barColor = passed === true ? "bg-emerald-500" : passed === false ? "bg-red-400" : "bg-slate-300";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy-900 truncate">{item.title}</p>
          {item.feedback && (
            <p className="text-xs text-slate-400 italic mt-0.5 truncate">"{item.feedback}"</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasScore ? (
            <>
              {passed !== null && (
                passed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-400" />
              )}
              <span className={cn(
                "text-sm font-black tabular-nums",
                passed === true ? "text-emerald-700" : passed === false ? "text-red-600" : "text-slate-700"
              )}>
                {isQuiz ? `${item.score}%` : `${item.grade}/${item.max_score ?? 100}`}
              </span>
            </>
          ) : (
            <span className="text-xs font-medium text-slate-300 px-2 py-0.5 rounded-full bg-slate-50">{t("notYetGraded")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${hasScore ? Math.min(pct!, 100) : 0}%` }}
          />
        </div>
        {isQuiz && item.passing_score && (
          <span className="text-[10px] text-slate-400 flex-shrink-0">{t("passThreshold", { score: item.passing_score })}</span>
        )}
      </div>
    </div>
  );
}

// ─── Unified accordion group — used for both a Course and a certification's
// "General" (native, not-part-of-any-course) content, so everything on the
// page lives in exactly one list with one consistent look. ───────────────

type AccordionGroupProps = {
  icon: any;
  iconBg: string;
  title: string;
  badges: { key: string; label: string; tone: "cert" | "standalone" | "general" }[];
  meta: string[];
  gradePercentage: number | null;
  passed: boolean | null;
  items: any[];
  certificateHref?: string;
  defaultOpen: boolean;
};

function AccordionGroup({ icon: Icon, iconBg, title, badges, meta, gradePercentage, passed, items, certificateHref, defaultOpen }: AccordionGroupProps) {
  const t = useTranslations("Grades");
  const [open, setOpen] = useState(defaultOpen);
  const quizItems = items.filter((i) => i.type === "quiz");
  const assignmentItems = items.filter((i) => i.type === "assignment");

  return (
    <div className="border-b border-slate-50 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronDown size={14} className={cn("text-slate-300 flex-shrink-0 transition-transform", !open && "-rotate-90")} />
          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon size={12} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-navy-900 truncate">{title}</p>
              {passed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1">
                  <Award size={9} /> {t("passedBadge")}
                </span>
              )}
              {badges.map((b) => (
                <span
                  key={b.key}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    b.tone === "cert" && "bg-navy-50 text-navy-600",
                    b.tone === "standalone" && "bg-slate-100 text-slate-400",
                    b.tone === "general" && "bg-amber-50 text-amber-600",
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
            {meta.length > 0 && (
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                {meta.map((m, i) => <span key={i}>{m}</span>)}
              </div>
            )}
          </div>
          <span className={cn(
            "text-sm font-black tabular-nums flex-shrink-0",
            gradePercentage == null ? "text-slate-300" : passed === false ? "text-red-600" : "text-emerald-700"
          )}>
            {gradePercentage != null ? `${gradePercentage}%` : "—"}
          </span>
        </div>
      </button>

      {open && (
        <div className="bg-slate-50/60 px-5 pb-4 pt-1 space-y-3">
          {certificateHref && (
            <Link
              href={certificateHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              <Award size={12} /> {t("viewCertificateOfCompletion")} <ChevronRight size={12} />
            </Link>
          )}
          {items.length === 0 ? (
            <p className="text-xs text-slate-400">{t("nothingGradedYet")}</p>
          ) : (
            <div className="space-y-2">
              {quizItems.length > 0 && (
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-2.5">{t("quizzes")}</p>
                  <div className="divide-y divide-slate-50">
                    {quizItems.map((item) => <GradeRow key={item.lesson_id} item={item} />)}
                  </div>
                </div>
              )}
              {assignmentItems.length > 0 && (
                <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-2.5">{t("assignments")}</p>
                  <div className="divide-y divide-slate-50">
                    {assignmentItems.map((item) => <GradeRow key={item.lesson_id} item={item} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Printable report ───────────────────────────────────────────────────────

function GradeReportDocument({ studentName, filterLabel, courseRows, generalRows }: { studentName: string; filterLabel: string; courseRows: any[]; generalRows: any[] }) {
  const t = useTranslations("Grades");
  const allRows = [...courseRows, ...generalRows];
  const passedCount = courseRows.filter((c) => c.passed).length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg print:border-0 print:shadow-none print:rounded-none p-8 sm:p-12 print:p-0">
      <div className="text-center border-b-2 border-navy-900 pb-6 mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">{t("reportInstituteLine")}</p>
        <h1 className="text-2xl font-display font-black text-navy-900">{t("gradeReportTitle")}</h1>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
          <span>{t("generatedOn", { date: formatDate(new Date().toISOString()) })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 text-sm">
        <div><span className="text-slate-400">{t("studentLabel")}</span> <span className="font-semibold text-navy-900">{studentName}</span></div>
        <div><span className="text-slate-400">{t("scopeLabel")}</span> <span className="font-semibold text-navy-900">{filterLabel}</span></div>
      </div>

      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t("coursesAndContent")}</p>
      <table className="w-full text-sm mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-2 font-semibold text-slate-600">{t("tableName")}</th>
            <th className="text-left py-2 font-semibold text-slate-600 pl-4">{t("tableCertification")}</th>
            <th className="text-left py-2 font-semibold text-slate-600 pl-4">{t("tableCompleted")}</th>
            <th className="text-right py-2 font-semibold text-slate-600">{t("tableGrade")}</th>
            <th className="text-left py-2 font-semibold text-slate-600 pl-4">{t("tableStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((c) => (
            <tr key={c.key} className="border-b border-slate-100">
              <td className="py-2 text-navy-900">{c.title}</td>
              <td className="py-2 pl-4 text-slate-600">{c.certLabel}</td>
              <td className="py-2 pl-4 text-slate-600">{c.completed_at ? formatDate(c.completed_at) : "—"}</td>
              <td className="py-2 text-right text-slate-600">{c.grade_percentage != null ? `${c.grade_percentage}%` : "—"}</td>
              <td className="py-2 pl-4 font-semibold">
                <span className={c.passed ? "text-emerald-600" : "text-slate-500"}>{c.statusLabel}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-slate-50 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("coursesPassedLabel")}</p>
          <p className="text-sm font-semibold text-navy-900 mt-0.5">{passedCount} / {courseRows.length}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentGradesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const user = useAuthStore((s) => s.user);
  const t = useTranslations("Grades");
  // Empty set = "All". Otherwise holds a mix of certification acronyms and/or
  // the STANDALONE sentinel — the single filter that drives everything on
  // the page (courses AND each certification's own general content).
  const [filter, setFilter] = useState<Set<string>>(new Set());

  const { data: certContentRaw, isLoading: loadingCert } = useSWR(
    token ? ["/learn/my/certification-content", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const certContent: any[] = Array.isArray(certContentRaw) ? certContentRaw : [];

  const { data: coursesRaw, isLoading: loadingCourses } = useSWR(
    token ? ["/prep-courses/my/course-grades", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const allCourses: any[] = Array.isArray(coursesRaw) ? coursesRaw : [];

  const loading = loadingCert || loadingCourses;
  const studentName = `${user?.profile?.first_name ?? ""} ${user?.profile?.last_name ?? ""}`.trim() || user?.email || "Student";

  // ── Filter options: one pill per certification the student has any
  // content in, plus "Standalone" if any course has zero certification links.
  const filterCerts = certContent.map((c) => c.certification);
  const hasStandalone = allCourses.some((c) => !c.certifications?.length);

  function toggleFilter(key: string) {
    setFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filterActive = filter.size > 0;
  const filteredCourses = !filterActive
    ? allCourses
    : allCourses.filter((c) =>
        (c.certifications ?? []).some((cert: any) => filter.has(cert.acronym)) ||
        (filter.has(STANDALONE) && !c.certifications?.length)
      );
  const filteredCertContent = !filterActive
    ? certContent
    : certContent.filter((c) => filter.has(c.certification.acronym));

  const filterLabel = !filterActive
    ? t("all")
    : Array.from(filter).map((k) => (k === STANDALONE ? t("standalone") : k)).join(", ");

  // ── Build the unified, single accordion list (courses + each visible
  // certification's own General content) ─────────────────────────────────
  const courseGroups = filteredCourses.map((c) => ({
    key: `course-${c.course_id}`,
    kind: "course" as const,
    title: c.title,
    badges: c.certifications?.length
      ? c.certifications.map((x: any) => ({ key: x.id, label: x.acronym, tone: "cert" as const }))
      : [{ key: STANDALONE, label: t("standalone"), tone: "standalone" as const }],
    meta: [
      c.module_count === 1 ? `${c.module_count} ${t("moduleSingular")}` : `${c.module_count} ${t("modulePlural")}`,
      c.completed_at ? t("completedOn", { date: formatDate(c.completed_at) }) : t("inProgress"),
    ],
    gradePercentage: c.grade_percentage,
    passed: c.passed,
    items: c.graded_items ?? [],
    certificateHref: c.passed ? `/student/grades/course/${c.course_id}/certificate` : undefined,
    certLabel: c.certifications?.length ? c.certifications.map((x: any) => x.acronym).join(", ") : t("standalone"),
    completed_at: c.completed_at,
    statusLabel: c.passed ? t("passedBadge") : c.completed_at ? t("notPassed") : t("inProgress"),
  }));

  const generalGroups = filteredCertContent
    .filter((c) => c.native_items.length > 0)
    .map((c) => ({
      key: `general-${c.enrollment_id}`,
      kind: "general" as const,
      title: `${c.certification.title} — General`,
      badges: [{ key: c.certification.id, label: c.certification.acronym, tone: "general" as const }],
      meta: [c.native_items.length === 1 ? `${c.native_items.length} ${t("itemSingular")}` : `${c.native_items.length} ${t("itemPlural")}`],
      gradePercentage: (() => {
        const scored = c.native_items.map((i: any) => pctOf(i)).filter((v: any): v is number => v != null);
        return scored.length ? Math.round(scored.reduce((a: number, b: number) => a + b, 0) / scored.length) : null;
      })(),
      passed: null,
      items: c.native_items,
      certificateHref: undefined,
      certLabel: c.certification.acronym,
      completed_at: null,
      statusLabel: "—",
    }));

  const allGroups = [...courseGroups, ...generalGroups];

  // ── Hero summary — aggregated across everything currently visible ──────
  const allItems = allGroups.flatMap((g) => g.items);
  const quizItems = allItems.filter((i) => i.type === "quiz");
  const assignmentItems = allItems.filter((i) => i.type === "assignment");
  const scored = allItems.map((i) => pctOf(i)).filter((v): v is number => v !== null && v !== undefined);
  const overallAvg = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : null;
  const quizzesPassed = quizItems.filter((i) => i.passed === true).length;
  const quizzesGraded = quizItems.filter((i) => i.score !== null && i.score !== undefined).length;
  const assignmentsGraded = assignmentItems.filter((i) => i.grade !== null && i.grade !== undefined).length;
  const coursesPassed = filteredCourses.filter((c) => c.passed).length;

  const hasAnyData = allCourses.length > 0 || certContent.length > 0;

  function handleDownloadPdf() {
    const win = window.open("", "_blank");
    if (!win) { toast.error(t("popupBlocked")); return; }
    const printArea = document.getElementById("grade-report-document");
    if (!printArea) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Grade Report</title><script src="https://cdn.tailwindcss.com"></script></head><body class="p-10">${printArea.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.14em] mb-1">{t("performance")}</p>
            <h1 className="text-3xl font-display font-black text-navy-900 tracking-tight">{t("myGrades")}</h1>
            <p className="text-slate-500 mt-1 text-sm">{t("subheading")}</p>
          </div>
          {!loading && allGroups.length > 0 && (
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex-shrink-0"
            >
              <Download size={13} /> {t("downloadPdf")}
            </button>
          )}
        </div>

        {/* Single filter — replaces the old certification switcher */}
        {(filterCerts.length > 1 || (filterCerts.length >= 1 && hasStandalone)) && (
          <div className="flex items-center gap-1.5 flex-wrap mb-6">
            <button
              onClick={() => setFilter(new Set())}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors",
                !filterActive ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-500 border-slate-200 hover:border-navy-300 hover:text-navy-700"
              )}
            >
              {t("all")}
            </button>
            {filterCerts.map((c: any) => (
              <button
                key={c.id}
                onClick={() => toggleFilter(c.acronym)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors",
                  filter.has(c.acronym) ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-500 border-slate-200 hover:border-navy-300 hover:text-navy-700"
                )}
              >
                {c.acronym}
              </button>
            ))}
            {hasStandalone && (
              <button
                onClick={() => toggleFilter(STANDALONE)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors",
                  filter.has(STANDALONE) ? "bg-navy-900 text-white border-navy-900" : "bg-white text-slate-500 border-slate-200 hover:border-navy-300 hover:text-navy-700"
                )}
              >
                {t("standalone")}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="rounded-2xl h-28 bg-white border border-slate-200 animate-pulse" />
            <div className="rounded-2xl h-40 bg-white border border-slate-200 animate-pulse" />
          </div>
        ) : !hasAnyData ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center">
            <BarChart2 size={36} className="mx-auto mb-4 text-slate-200" />
            <p className="font-semibold text-slate-600">{t("noGradesYet")}</p>
            <p className="text-sm mt-1 text-slate-400">{t("noGradesBody")}</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Hero summary */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 flex items-center gap-5">
              <AverageRing value={overallAvg} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-navy-900 text-sm mb-2">{filterLabel === t("all") ? t("allCertsAndCourses") : filterLabel}</p>
                <div className="flex items-center gap-4 flex-wrap text-xs">
                  {allCourses.length > 0 && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <GraduationCap size={12} className="text-slate-400" />
                      {t("coursesLabel")} <span className="font-bold text-navy-800">{coursesPassed}/{filteredCourses.length}</span> {t("passedSuffix")}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <HelpCircle size={12} className="text-slate-400" />
                    {t("quizzesLabel")} <span className="font-bold text-navy-800">{quizzesPassed}/{quizItems.length}</span> {t("passedSuffix")}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <ClipboardList size={12} className="text-slate-400" />
                    {t("assignmentsLabel")} <span className="font-bold text-navy-800">{assignmentsGraded}/{assignmentItems.length}</span> {t("gradedSuffix")}
                  </span>
                </div>
              </div>
            </div>

            {/* Courses & Content — one unified accordion list */}
            {allGroups.length > 0 && (
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-teal-500">
                    <Layers size={14} className="text-white" />
                  </div>
                  <p className="font-display font-bold text-navy-900 text-sm">{t("coursesAndContent")}</p>
                  <span className="ml-auto text-xs text-slate-400 font-medium">{allGroups.length} {allGroups.length !== 1 ? t("itemPlural") : t("itemSingular")}</span>
                </div>
                <div>
                  {courseGroups.map((g) => (
                    <AccordionGroup
                      key={g.key}
                      icon={GraduationCap}
                      iconBg="bg-teal-500"
                      title={g.title}
                      badges={g.badges}
                      meta={g.meta}
                      gradePercentage={g.gradePercentage}
                      passed={g.passed}
                      items={g.items}
                      certificateHref={g.certificateHref}
                      defaultOpen={allGroups.length === 1}
                    />
                  ))}
                  {generalGroups.map((g) => (
                    <AccordionGroup
                      key={g.key}
                      icon={ClipboardList}
                      iconBg="bg-amber-500"
                      title={g.title}
                      badges={g.badges}
                      meta={g.meta}
                      gradePercentage={g.gradePercentage}
                      passed={g.passed}
                      items={g.items}
                      defaultOpen={allGroups.length === 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Certification exam(s) */}
            {filteredCertContent.filter((c) => c.exam_attempts.length > 0).map((c) => (
              <div key={c.enrollment_id} className="rounded-2xl bg-navy-900 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <Trophy size={14} className="text-gold-400" />
                  </div>
                  <p className="font-display font-bold text-white text-sm">{t("examTitle", { acronym: c.certification.acronym })}</p>
                  {c.exam_attempts[0] && (
                    <span className={cn(
                      "ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full",
                      c.exam_attempts[0].passed ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                    )}>
                      {c.exam_attempts[0].passed ? t("passedBadge") : c.exam_attempts[0].status.replace("_", " ")}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {c.exam_attempts.map((attempt: any) => (
                    <div key={attempt.id} className="flex items-center justify-between text-sm px-3.5 py-2.5 rounded-xl bg-white/5">
                      <span className="text-white/60 flex items-center gap-1.5">
                        <Clock size={11} /> {t("attemptNumber", { number: attempt.attempt_number })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-black tabular-nums", attempt.passed ? "text-emerald-400" : "text-red-400")}>
                          {attempt.score_percentage ? `${Number(attempt.score_percentage).toFixed(1)}%` : "—"}
                        </span>
                        <span className="text-white/40 text-xs capitalize">{attempt.status.replace("_", " ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden printable document — only rendered into the DOM for the
            Download PDF button to snapshot; never visible on screen. */}
        {allGroups.length > 0 && (
          <div className="hidden">
            <div id="grade-report-document">
              <GradeReportDocument studentName={studentName} filterLabel={filterLabel} courseRows={courseGroups} generalRows={generalGroups} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
