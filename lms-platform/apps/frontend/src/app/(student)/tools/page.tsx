"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import {
  Sparkles, Search, X, CheckCircle, ShoppingCart, Star,
  Wrench, BookOpen, Award, RotateCcw, SlidersHorizontal, Check, ChevronDown, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CertIcon } from "@/lib/cert-icons";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";

const API_BASE  = process.env.NEXT_PUBLIC_API_URL      || "http://localhost:4000/api/v1";
const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

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

// ── Normalized catalog item ─────────────────────────────────────────────────

type CatalogType = "tool" | "course" | "certification" | "program";

type CatalogItem = {
  id: string;
  type: CatalogType;
  title: string;
  subtitle?: string;
  price: number;
  finalPrice?: number;
  memberDiscountPercentage?: number;
  slug: string;
  href: string;
  external: boolean;
  badgeText?: string;
  level?: string;
  certAcronym?: string;
  badgeIcon?: string;
  thumbnailUrl?: string;
  enrolled?: boolean;
  enrolledDone?: boolean;
  purchasable?: boolean;
  cartType?: "course" | "certification";
  cartId?: string;
  recommended?: boolean;
};

function getTypeLabels(t: ReturnType<typeof useTranslations>): Record<CatalogType, string> {
  return {
    tool: t("typeTool"),
    course: t("typeCourse"),
    certification: t("typeCertification"),
    program: t("typeProgram"),
  };
}

function getCertLevelLabels(t: ReturnType<typeof useTranslations>): Record<string, string> {
  return {
    pre_certificate: t("levelPreCertificate"),
    foundation: t("levelFoundation"),
    advanced: t("levelAdvanced"),
    specialist: t("levelSpecialist"),
    executive: t("levelExecutive"),
    other: t("levelOther"),
  };
}

// ── Card ─────────────────────────────────────────────────────────────────────

function CatalogCard({ item, index }: { item: CatalogItem; index: number }) {
  const grad = GRADIENTS[index % GRADIENTS.length];
  const price = item.price;
  const pct = item.memberDiscountPercentage ?? 0;
  const finalPrice = item.finalPrice ?? price;
  const token = useAuthStore((s) => s.accessToken);
  const { addItem, hasItem } = useCartStore();
  const inCart = item.cartId ? hasItem(item.cartId) : false;
  const t = useTranslations("Tools");
  const TYPE_LABEL = getTypeLabels(t);
  const CERT_LEVEL_LABEL = getCertLevelLabels(t);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error(t("toastLoginRequired"));
      return;
    }
    if (!item.cartId || !item.cartType) return;
    addItem({
      id: item.cartId,
      type: item.cartType,
      slug: item.slug,
      course_id: item.cartType === "course" ? item.cartId : undefined,
      certification_id: item.cartType === "certification" ? item.cartId : undefined,
      title: item.title,
      price: finalPrice,
      thumbnail_url: item.thumbnailUrl,
      level: item.level,
      cert_acronym: item.certAcronym,
    });
    toast.success(finalPrice === 0 ? t("toastAddedFree") : t("toastAdded"));
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
      {item.thumbnailUrl ? (
        <div className="h-[240px] overflow-hidden relative">
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
          {item.recommended && (
            <div className="absolute top-3 left-3">
              <span className="bg-white/95 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Star size={10} /> {t("recommendedBadge")}
              </span>
            </div>
          )}
          {item.enrolled && (
            <div className="absolute top-3 right-3">
              <span className="bg-white/95 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle size={10} /> {item.enrolledDone ? t("completedBadge") : t("enrolledBadge")}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex flex-col p-5 min-h-[240px]"
          style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
          <CardPattern type={grad.pattern} />
          {item.recommended && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-white/95 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Star size={10} /> {t("recommendedBadge")}
              </span>
            </div>
          )}
          {item.enrolled && (
            <div className="absolute top-3 right-3 z-10">
              <span className="bg-white/95 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle size={10} /> {item.enrolledDone ? t("completedBadge") : t("enrolledBadge")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap relative z-10">
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
              {TYPE_LABEL[item.type]}
            </span>
            {item.badgeText && (
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" /> {item.badgeText}
              </span>
            )}
            {item.certAcronym && (
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 backdrop-blur-sm">
                {item.certAcronym}
              </span>
            )}
            {item.type === "certification" && (
              <span className="ml-auto relative z-10 w-8 h-8 rounded-xl bg-white/40 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <CertIcon iconKey={item.badgeIcon} size={16} className="text-navy-800" />
              </span>
            )}
          </div>
          <div className="mt-auto relative z-10">
            <h3 className="text-xl font-bold text-navy-900 leading-snug">{item.title}</h3>
          </div>
        </div>
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {item.level && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize">
              {item.type === "certification" ? (CERT_LEVEL_LABEL[item.level] ?? item.level) : item.level}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1.5">
            {pct > 0 && <span className="text-xs text-slate-400 font-semibold line-through">${price.toFixed(0)}</span>}
            <span className="text-lg font-black text-navy-900">
              {finalPrice === 0 ? t("free") : `$${finalPrice.toFixed(0)}`}
            </span>
          </span>
        </div>
        {pct > 0 && (
          <span className="inline-flex items-center gap-1 mb-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full w-fit">
            <Sparkles size={9} /> {t("memberPriceOff", { percentage: pct })}
          </span>
        )}
        {item.subtitle && (
          <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1 line-clamp-3">{item.subtitle}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={item.href}
            target={item.enrolled || item.external ? "_blank" : undefined}
            rel={item.enrolled || item.external ? "noopener noreferrer" : undefined}
            className={cn(
              "inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full transition-colors w-fit",
              item.enrolled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-navy-900 hover:bg-navy-700 text-white"
            )}
          >
            {item.enrolled ? (item.enrolledDone ? t("review") : t("continueLearning")) : t("learnMore")}
          </Link>
          {!item.enrolled && item.purchasable && item.cartType && (
            inCart ? (
              <Link
                href="/cart"
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors w-fit"
              >
                <ShoppingCart size={14} /> {t("inCart")}
              </Link>
            ) : (
              <button
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors w-fit"
              >
                <ShoppingCart size={14} /> {finalPrice === 0 ? t("enrollFree") : t("addToCart")}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter dropdown row (checkbox-style, multi-select) ────────────────────────

function FilterOption({ checked, onClick, icon: Icon, variant = "navy", label, count }: {
  checked: boolean; onClick: () => void; icon?: any; variant?: "navy" | "gold"; label: string; count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
    >
      <span
        className={cn(
          "w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
          checked
            ? variant === "gold" ? "bg-amber-500 border-amber-500" : "bg-navy-900 border-navy-900"
            : "border-slate-300 bg-white"
        )}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      {Icon && <Icon size={13} className="text-slate-400 flex-shrink-0" />}
      <span className="text-sm text-slate-700 flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-slate-400">{count}</span>}
    </button>
  );
}

// ── Removable active-filter pill ───────────────────────────────────────────────

function ActiveFilterPill({ label, onRemove, variant = "navy" }: { label: string; onRemove: () => void; variant?: "navy" | "gold" }) {
  const t = useTranslations("Tools");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold border",
        variant === "gold" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-navy-50 text-navy-700 border-navy-100"
      )}
    >
      {label}
      <button onClick={onRemove} aria-label={t("removeFilterLabel", { label })} className="hover:bg-black/10 rounded-full p-0.5 transition-colors">
        <X size={10} />
      </button>
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnlineToolsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const t = useTranslations("Tools");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<CatalogType>>(new Set());
  const [priceFilter, setPriceFilter] = useState<Set<"free" | "paid">>(new Set());
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleType(t: CatalogType) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }
  function togglePrice(p: "free" | "paid") {
    setPriceFilter((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  const { data: toolsRaw,   isLoading: loadingTools }   = useSWR("/online-tools", fetcher);
  const { data: coursesRaw, isLoading: loadingCourses } = useSWR("/prep-courses", fetcher);
  const { data: certsRaw,   isLoading: loadingCerts }   = useSWR("/courses/catalog", fetcher);
  const { data: programsRaw, isLoading: loadingPrograms } = useSWR("/programs", fetcher);
  const { data: myProgramEnrollmentsRaw } = useSWR(
    token ? ["/programs/my", token] : null,
    ([url, t]) => authFetcher(url, t)
  );
  const { data: memberDiscountRaw } = useSWR(
    token ? ["/prep-courses/my/member-discount", token] : null,
    ([url, t]) => authFetcher(url, t)
  );
  const { data: myPrepEnrollmentsRaw } = useSWR(
    token ? ["/prep-courses/my/enrollments", token] : null,
    ([url, t]) => authFetcher(url, t)
  );
  const { data: courseInvitationsRaw } = useSWR(
    token ? ["/me/course-invitations", token] : null,
    ([url, t]) => authFetcher(url, t)
  );
  const { data: certRecommendationsRaw } = useSWR(
    token ? ["/me/certification-recommendations", token] : null,
    ([url, t]) => authFetcher(url, t)
  );

  const tools: any[]  = Array.isArray(toolsRaw)   ? toolsRaw   : (toolsRaw?.data   ?? []);
  const courses: any[] = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw?.data ?? []);
  const certs: any[]   = Array.isArray(certsRaw)   ? certsRaw   : (certsRaw?.data   ?? []);
  const programs: any[] = Array.isArray(programsRaw) ? programsRaw : (programsRaw?.data ?? []);
  const myProgramEnrollments: any[] = Array.isArray(myProgramEnrollmentsRaw) ? myProgramEnrollmentsRaw : [];
  const myPrepEnrollments: any[] = Array.isArray(myPrepEnrollmentsRaw) ? myPrepEnrollmentsRaw : [];
  const courseInvitations: any[] = Array.isArray(courseInvitationsRaw) ? courseInvitationsRaw : [];
  const certRecommendations: any[] = Array.isArray(certRecommendationsRaw) ? certRecommendationsRaw : [];
  const isLoading = loadingTools || loadingCourses || loadingCerts || loadingPrograms;
  const memberDiscountPct: number = memberDiscountRaw?.percentage ?? 0;

  const recommendedCourseIds = useMemo(
    () => new Set(courseInvitations.filter((i) => i.is_recommendation && i.status !== "rejected").map((i) => i.course.id)),
    [courseInvitations]
  );
  const recommendedCertIds = useMemo(
    () => new Set(certRecommendations.map((r) => r.certification.id)),
    [certRecommendations]
  );

  const items: CatalogItem[] = useMemo(() => {
    const toolItems: CatalogItem[] = tools.map((t) => {
      const purchasable = !!(t.course_id || t.certification_id) && t.billing_type !== "external";
      return {
        id: t.id, type: "tool", title: t.title, subtitle: t.short_description,
        price: Number(t.price) || 0, slug: t.slug, href: `/tools/${t.slug}`, external: true,
        badgeText: t.badge_text,
        purchasable,
        cartType: t.course_id ? "course" : t.certification_id ? "certification" : undefined,
        cartId: t.course_id || t.certification_id || undefined,
      };
    });
    const listedCourseIds = new Set(courses.map((c: any) => c.id));
    const courseItems: CatalogItem[] = courses.map((c) => {
      const price = Number(c.price) || 0;
      const finalPrice = memberDiscountPct > 0 ? Math.max(0, Math.round(price * (1 - memberDiscountPct / 100) * 100) / 100) : price;
      const enrollment = myPrepEnrollments.find((e: any) => e.course_id === c.id);
      return {
        id: c.id, type: "course" as const, title: c.title, subtitle: c.subtitle,
        price, finalPrice, memberDiscountPercentage: memberDiscountPct > 0 ? memberDiscountPct : undefined,
        slug: c.slug,
        href: enrollment ? `/learn/course/${enrollment.id}` : `${MARKETING}/courses/${c.slug}`,
        external: !enrollment,
        certAcronym: c.cert_acronym, level: c.level, thumbnailUrl: c.thumbnail_url,
        enrolled: !!enrollment, enrolledDone: !!enrollment?.completed_at,
        purchasable: !enrollment, cartType: "course", cartId: c.id,
        recommended: recommendedCourseIds.has(c.id),
      };
    });
    // Private courses the student accepted via invitation aren't in the
    // public listing above (is_listed: false) but they're enrolled, so the
    // catalog should still show them.
    const privateEnrolledItems: CatalogItem[] = myPrepEnrollments
      .filter((e: any) => !listedCourseIds.has(e.course_id))
      .map((e: any) => ({
        id: e.course_id, type: "course" as const, title: e.title, subtitle: e.subtitle,
        price: 0, finalPrice: 0, slug: e.slug,
        href: `/learn/course/${e.id}`, external: false,
        level: e.level, thumbnailUrl: e.thumbnail_url,
        enrolled: true, enrolledDone: !!e.completed_at,
        purchasable: false,
        recommended: recommendedCourseIds.has(e.course_id),
      }));
    const certItems: CatalogItem[] = certs.map((c) => ({
      id: c.id, type: "certification", title: c.title, subtitle: c.description,
      recommended: recommendedCertIds.has(c.id),
      price: Number(c.price) || 0, slug: c.slug, href: `${MARKETING}/certifications/${c.slug}`, external: true,
      certAcronym: c.acronym, level: c.level, badgeIcon: c.badge_icon,
      purchasable: true, cartType: "certification", cartId: c.id,
    }));
    // Programs aren't cart-based — checkout happens from the marketing
    // landing page's own enroll flow (single-line-item Stripe session), so
    // there's no "Add to Cart" action here, just Learn More / Continue.
    const programItems: CatalogItem[] = programs.map((p) => {
      const enrollment = myProgramEnrollments.find((e: any) => e.program.id === p.id);
      return {
        id: p.id, type: "program" as const, title: p.title, subtitle: p.short_description,
        price: Number(p.price) || 0, slug: p.slug,
        href: enrollment ? `/programs/${p.id}` : `${MARKETING}/programs/${p.slug}`,
        external: !enrollment,
        level: p.level, thumbnailUrl: p.thumbnail_url,
        enrolled: !!enrollment, enrolledDone: !!enrollment?.completed_at,
        purchasable: false,
      };
    });
    return [...toolItems, ...courseItems, ...privateEnrolledItems, ...certItems, ...programItems];
  }, [tools, courses, certs, programs, memberDiscountPct, myPrepEnrollments, myProgramEnrollments, recommendedCourseIds, recommendedCertIds]);

  const counts = useMemo(() => ({
    all: items.length,
    tool: items.filter(i => i.type === "tool").length,
    course: items.filter(i => i.type === "course").length,
    certification: items.filter(i => i.type === "certification").length,
    program: items.filter(i => i.type === "program").length,
    free: items.filter(i => (i.finalPrice ?? i.price) === 0).length,
    paid: items.filter(i => (i.finalPrice ?? i.price) > 0).length,
    recommended: items.filter(i => i.recommended).length,
  }), [items]);

  const filtered = items.filter((item) => {
    if (typeFilter.size > 0 && !typeFilter.has(item.type)) return false;
    if (priceFilter.size > 0) {
      const isFree = (item.finalPrice ?? item.price) === 0;
      const matches = (priceFilter.has("free") && isFree) || (priceFilter.has("paid") && !isFree);
      if (!matches) return false;
    }
    if (recommendedOnly && !item.recommended) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [item.title, item.subtitle, item.certAcronym].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hasContent = items.length > 0;
  const activeFilterCount = typeFilter.size + priceFilter.size + (recommendedOnly ? 1 : 0);
  const filtersActive = activeFilterCount > 0 || !!search.trim();

  function clearFilters() {
    setTypeFilter(new Set());
    setPriceFilter(new Set());
    setRecommendedOnly(false);
    setSearch("");
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black text-navy-900 mb-2">
            {!hasContent && !isLoading ? t("noToolsHeading") : t("onlineToolsHeading")}
          </h1>
          <p className="text-slate-500">{t("subheading")}</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-96 rounded-3xl animate-pulse bg-slate-200" />
            ))}
          </div>
        ) : !hasContent ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {t("noToolsAvailable")}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 transition-colors"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      aria-label={t("clearSearch")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="relative flex-shrink-0" ref={filtersRef}>
                  <button
                    onClick={() => setFiltersOpen((v) => !v)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition-colors w-full sm:w-auto justify-center",
                      activeFilterCount > 0
                        ? "bg-navy-900 text-white border-navy-900"
                        : "bg-white text-slate-700 border-slate-200 hover:border-navy-300"
                    )}
                  >
                    <SlidersHorizontal size={14} />
                    {t("filters")}
                    {activeFilterCount > 0 && (
                      <span className="w-[18px] h-[18px] min-w-[18px] px-1 rounded-full bg-white/20 text-white text-[10px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                    <ChevronDown size={13} className={cn("transition-transform", filtersOpen && "rotate-180")} />
                  </button>

                  {filtersOpen && (
                    <div className="absolute right-0 sm:right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 max-h-[70vh] overflow-y-auto">
                      <div className="px-2 pt-1.5 pb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("typeHeader")}</p>
                      </div>
                      <FilterOption checked={typeFilter.has("tool")} onClick={() => toggleType("tool")} icon={Wrench} label={t("filterTools")} count={counts.tool} />
                      <FilterOption checked={typeFilter.has("course")} onClick={() => toggleType("course")} icon={BookOpen} label={t("filterCourses")} count={counts.course} />
                      <FilterOption checked={typeFilter.has("certification")} onClick={() => toggleType("certification")} icon={Award} label={t("filterCertifications")} count={counts.certification} />
                      <FilterOption checked={typeFilter.has("program")} onClick={() => toggleType("program")} icon={GraduationCap} label={t("filterPrograms")} count={counts.program} />

                      <div className="px-2 pt-3 pb-1 border-t border-slate-100 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("priceHeader")}</p>
                      </div>
                      <FilterOption checked={priceFilter.has("free")} onClick={() => togglePrice("free")} label={t("filterFree")} count={counts.free} />
                      <FilterOption checked={priceFilter.has("paid")} onClick={() => togglePrice("paid")} label={t("filterPaid")} count={counts.paid} />

                      <div className="px-2 pt-3 pb-1 border-t border-slate-100 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("forYouHeader")}</p>
                      </div>
                      <FilterOption checked={recommendedOnly} onClick={() => setRecommendedOnly((v) => !v)} icon={Star} variant="gold" label={t("filterRecommended")} count={counts.recommended} />

                      {filtersActive && (
                        <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                          <button
                            onClick={clearFilters}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <RotateCcw size={12} /> {t("clearAllFilters")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {typeFilter.has("tool") && <ActiveFilterPill label={t("filterTools")} onRemove={() => toggleType("tool")} />}
                  {typeFilter.has("course") && <ActiveFilterPill label={t("filterCourses")} onRemove={() => toggleType("course")} />}
                  {typeFilter.has("certification") && <ActiveFilterPill label={t("filterCertifications")} onRemove={() => toggleType("certification")} />}
                  {typeFilter.has("program") && <ActiveFilterPill label={t("filterPrograms")} onRemove={() => toggleType("program")} />}
                  {priceFilter.has("free") && <ActiveFilterPill label={t("filterFree")} onRemove={() => togglePrice("free")} />}
                  {priceFilter.has("paid") && <ActiveFilterPill label={t("filterPaid")} onRemove={() => togglePrice("paid")} />}
                  {recommendedOnly && <ActiveFilterPill label={t("recommendedBadge")} variant="gold" onRemove={() => setRecommendedOnly(false)} />}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                {t("noMatches")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((item, i) => <CatalogCard key={`${item.type}-${item.id}`} item={item} index={i} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
