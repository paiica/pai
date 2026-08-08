"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Sparkles, Search, X, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { CertIcon } from "@/lib/cert-icons";
import { useAuthStore } from "@/store/auth.store";
import { ShareCourseModal } from "@/components/ShareCourseModal";

const API_BASE  = process.env.NEXT_PUBLIC_API_URL      || "http://localhost:4000/api/v1";
const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

function fetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); }).then(r => r.data ?? r);
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

type CatalogType = "tool" | "course" | "certification";

type CatalogItem = {
  id: string;
  type: CatalogType;
  title: string;
  subtitle?: string;
  price: number;
  slug: string;
  href: string;
  external: boolean;
  badgeText?: string;
  level?: string;
  certAcronym?: string;
  badgeIcon?: string;
  thumbnailUrl?: string;
};

const TYPE_LABEL: Record<CatalogType, string> = {
  tool: "Online Tools",
  course: "eLearning",
  certification: "Certification",
};

const CERT_LEVEL_LABEL: Record<string, string> = {
  pre_certificate: "Pre-Certificate",
  foundation: "Foundation",
  advanced: "Advanced",
  specialist: "Specialist",
  executive: "Executive",
  other: "Other",
};

// ── Card ─────────────────────────────────────────────────────────────────────

function CatalogCard({ item, index, onRecommend }: { item: CatalogItem; index: number; onRecommend: (item: CatalogItem) => void }) {
  const grad = GRADIENTS[index % GRADIENTS.length];
  const price = item.price;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col">
      {item.thumbnailUrl ? (
        <div className="h-[240px] overflow-hidden relative">
          <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="relative flex flex-col p-5 min-h-[240px]"
          style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}>
          <CardPattern type={grad.pattern} />
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
          <span className="ml-auto text-lg font-black text-navy-900">
            {price === 0 ? "Free" : `$${price.toFixed(0)}`}
          </span>
        </div>
        {item.subtitle && (
          <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1 line-clamp-3">{item.subtitle}</p>
        )}
        <div className="flex items-center gap-2">
          <Link
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full transition-colors w-fit bg-navy-900 hover:bg-navy-700 text-white"
          >
            Learn More
          </Link>
          {(item.type === "course" || item.type === "certification") && (
            <button
              onClick={() => onRecommend(item)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-full transition-colors w-fit border border-navy-200 text-navy-700 hover:bg-navy-50"
            >
              <Compass size={14} /> Recommend
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors",
        active
          ? "bg-navy-900 text-white border-navy-900"
          : "bg-white text-slate-600 border-slate-200 hover:border-navy-300 hover:text-navy-700"
      )}
    >
      {children}
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function OnlineToolsPage() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CatalogType | "all">("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [recommending, setRecommending] = useState<{ id: string; title: string; slug: string; type: CatalogType } | null>(null);

  const { data: toolsRaw,   isLoading: loadingTools }   = useSWR("/online-tools", fetcher);
  const { data: coursesRaw, isLoading: loadingCourses } = useSWR("/prep-courses", fetcher);
  const { data: certsRaw,   isLoading: loadingCerts }   = useSWR("/courses/catalog", fetcher);

  const tools: any[]  = Array.isArray(toolsRaw)   ? toolsRaw   : (toolsRaw?.data   ?? []);
  const courses: any[] = Array.isArray(coursesRaw) ? coursesRaw : (coursesRaw?.data ?? []);
  const certs: any[]   = Array.isArray(certsRaw)   ? certsRaw   : (certsRaw?.data   ?? []);
  const isLoading = loadingTools || loadingCourses || loadingCerts;

  const items: CatalogItem[] = useMemo(() => {
    const toolItems: CatalogItem[] = tools.map((t) => ({
      id: t.id, type: "tool", title: t.title, subtitle: t.short_description,
      price: Number(t.price) || 0, slug: t.slug, href: `/browse/${t.slug}`, external: false,
      badgeText: t.badge_text,
    }));
    const courseItems: CatalogItem[] = courses
      .filter((c) => !(c.instructors ?? []).some((i: any) => i.user_id === user?.id))
      .map((c) => ({
        id: c.id, type: "course" as const, title: c.title, subtitle: c.subtitle,
        price: Number(c.price) || 0, slug: c.slug, href: `/browse/course/${c.slug}`, external: false,
        certAcronym: c.cert_acronym, level: c.level, thumbnailUrl: c.thumbnail_url,
      }));
    const certItems: CatalogItem[] = certs.map((c) => ({
      id: c.id, type: "certification", title: c.title, subtitle: c.description,
      price: Number(c.price) || 0, slug: c.slug, href: `${MARKETING}/certifications/${c.slug}`, external: true,
      certAcronym: c.acronym, level: c.level, badgeIcon: c.badge_icon,
    }));
    return [...toolItems, ...courseItems, ...certItems];
  }, [tools, courses, certs, user?.id]);

  const counts = useMemo(() => ({
    all: items.length,
    tool: items.filter(i => i.type === "tool").length,
    course: items.filter(i => i.type === "course").length,
    certification: items.filter(i => i.type === "certification").length,
    free: items.filter(i => i.price === 0).length,
    paid: items.filter(i => i.price > 0).length,
  }), [items]);

  const filtered = items.filter((item) => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (priceFilter === "free" && item.price !== 0) return false;
    if (priceFilter === "paid" && item.price === 0) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = [item.title, item.subtitle, item.certAcronym].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const hasContent = items.length > 0;

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-black text-navy-900 mb-2">
            {!hasContent && !isLoading ? "No online tools yet" : "Online Tools"}
          </h1>
          <p className="text-slate-500">Everything PAII offers, in one place — browse and recommend courses to your students.</p>
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
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tools, courses, certifications…"
                  className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
                  All ({counts.all})
                </FilterChip>
                <FilterChip active={typeFilter === "tool"} onClick={() => setTypeFilter("tool")}>
                  Tools ({counts.tool})
                </FilterChip>
                <FilterChip active={typeFilter === "course"} onClick={() => setTypeFilter("course")}>
                  Courses ({counts.course})
                </FilterChip>
                <FilterChip active={typeFilter === "certification"} onClick={() => setTypeFilter("certification")}>
                  Certifications ({counts.certification})
                </FilterChip>
                <div className="w-px h-5 bg-slate-200 mx-0.5" />
                <FilterChip active={priceFilter === "all"} onClick={() => setPriceFilter("all")}>
                  All Prices
                </FilterChip>
                <FilterChip active={priceFilter === "free"} onClick={() => setPriceFilter("free")}>
                  Free ({counts.free})
                </FilterChip>
                <FilterChip active={priceFilter === "paid"} onClick={() => setPriceFilter("paid")}>
                  Paid ({counts.paid})
                </FilterChip>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                Nothing matches your search or filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((item, i) => (
                  <CatalogCard
                    key={`${item.type}-${item.id}`}
                    item={item}
                    index={i}
                    onRecommend={(it) => setRecommending({ id: it.id, title: it.title, slug: it.slug, type: it.type })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {recommending && (
        <ShareCourseModal
          courseId={recommending.id}
          courseTitle={recommending.title}
          itemType={recommending.type === "certification" ? "certification" : "course"}
          itemUrl={
            recommending.type === "certification"
              ? `${MARKETING}/certifications/${recommending.slug}`
              : `${MARKETING}/courses/${recommending.slug}`
          }
          mode="recommend"
          onClose={() => setRecommending(null)}
        />
      )}
    </div>
  );
}
