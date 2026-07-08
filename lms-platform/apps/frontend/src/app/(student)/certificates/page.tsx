"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { ShoppingCart, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE  = process.env.NEXT_PUBLIC_API_URL      || "http://localhost:4000/api/v1";
const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}
function publicFetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then((r) => r.json()).then((r) => r.data ?? r);
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-CA", { dateStyle: "long" });
}

// ─── Shared accent system ─────────────────────────────────────────────────────

const ACCENTS = [
  { badge: "from-amber-400 via-orange-400 to-rose-400",    bar: "bg-amber-400",   ring: "ring-amber-300/50"   },
  { badge: "from-blue-500 via-indigo-500 to-violet-500",   bar: "bg-blue-500",    ring: "ring-blue-300/50"    },
  { badge: "from-violet-500 via-purple-500 to-fuchsia-500",bar: "bg-violet-500",  ring: "ring-violet-300/50"  },
  { badge: "from-emerald-400 via-teal-500 to-cyan-500",    bar: "bg-emerald-500", ring: "ring-emerald-300/50" },
  { badge: "from-rose-500 via-pink-500 to-fuchsia-400",    bar: "bg-rose-500",    ring: "ring-rose-300/50"    },
  { badge: "from-sky-400 via-blue-500 to-indigo-500",      bar: "bg-sky-500",     ring: "ring-sky-300/50"     },
];

function accentForAcronym(acronym: string) {
  const idx = acronym.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % ACCENTS.length;
  return ACCENTS[idx];
}

function AcronymBadge({ acronym, size = "md" }: { acronym: string; size?: "sm" | "md" | "lg" }) {
  const accent = accentForAcronym(acronym);
  const words = acronym.split(/\s+/);
  const charCount = acronym.replace(/\s/g, "").length;

  const boxCls   = size === "lg" ? "w-20 h-20 rounded-2xl ring-4 gap-1.5"
                 : size === "sm" ? "w-12 h-12 rounded-xl ring-[3px] gap-0.5"
                 :                 "w-16 h-16 rounded-2xl ring-4 gap-1";
  const textSize = size === "lg" ? (charCount <= 4 ? "text-[17px]" : "text-[13px]")
                 : size === "sm" ? (charCount <= 4 ? "text-[10px]" : "text-[8px]")
                 :                 (charCount <= 4 ? "text-[13px]" : "text-[11px]");

  return (
    <div className={cn(
      "flex-shrink-0 flex flex-col items-center justify-center relative overflow-hidden shadow-lg",
      `bg-gradient-to-br ${accent.badge}`, accent.ring, boxCls
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-1/3 bg-black/10 pointer-events-none" />
      {words.map((w, i) => (
        <span key={i} className={cn("relative font-black text-white tracking-widest leading-none uppercase drop-shadow", textSize)}>
          {w}
        </span>
      ))}
    </div>
  );
}

// ─── Level config ─────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  pre_certificate: "Pre-Certificate",
  foundation:      "Foundation",
  advanced:        "Advanced",
  executive:       "Executive",
};

const LEVEL_COLOR: Record<string, string> = {
  pre_certificate: "bg-slate-100 text-slate-600 border border-slate-200",
  foundation:      "bg-emerald-50 text-emerald-700 border border-emerald-100",
  advanced:        "bg-blue-50 text-blue-700 border border-blue-100",
  executive:       "bg-purple-50 text-purple-700 border border-purple-100",
};

const LEVEL_GROUPS = [
  { key: "pre_certificate", label: "Pre-Certification", description: "No prior experience required. Start your AI journey here." },
  { key: "foundation",      label: "Foundation",        description: "Core credentials for professionals entering the AI field." },
  { key: "advanced",        label: "Advanced",          description: "Advanced specializations for experienced AI practitioners." },
  { key: "executive",       label: "Executive",         description: "Executive and leadership-level AI credentials." },
];

// ─── Catalog card ─────────────────────────────────────────────────────────────

function CertCatalogCard({ cert, enrolled }: { cert: any; enrolled: boolean }) {
  const { addItem, hasItem } = useCartStore();
  const inCart = hasItem(cert.id);
  const price  = Number(cert.price);
  const accent = accentForAcronym(cert.acronym ?? "");
  const words  = (cert.acronym ?? "").split(/\s+/);
  const charCount = (cert.acronym ?? "").replace(/\s/g, "").length;
  const fontSize  = charCount <= 4 ? "text-[26px]" : "text-[18px]";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-200">
      {/* Gradient header with acronym */}
      <div className={cn(
        "relative h-32 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br gap-1",
        accent.badge
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/5 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-black/10 pointer-events-none" />
        {enrolled && (
          <div className="absolute top-3 right-3">
            <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/40 tracking-wide">
              Enrolled
            </span>
          </div>
        )}
        {words.map((w: string, i: number) => (
          <span key={i} className={cn("relative font-black text-white tracking-widest leading-none uppercase drop-shadow-md text-center", fontSize)}>
            {w}
          </span>
        ))}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {cert.level && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", LEVEL_COLOR[cert.level] ?? "bg-slate-100 text-slate-600")}>
              {LEVEL_LABEL[cert.level] ?? cert.level}
            </span>
          )}
          {cert.duration_weeks && (
            <span className="text-[10px] text-slate-400">{cert.duration_weeks}w</span>
          )}
        </div>

        <h3 className="font-display font-bold text-navy-900 text-sm leading-snug mb-1">{cert.title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 line-clamp-2 mb-3">{cert.description}</p>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="font-black text-navy-900 text-sm">{price === 0 ? "Free" : `$${price.toFixed(2)}`}</span>
          {enrolled ? (
            <Link href="/learn" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              Continue →
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {!inCart ? (
                <button
                  onClick={() => {
                    addItem({ id: cert.id, type: "certification", slug: cert.slug, title: cert.title, price, cert_acronym: cert.acronym });
                    toast.success("Added to cart");
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:border-navy-300 hover:text-navy-700 transition-colors"
                  title="Add to cart"
                >
                  <ShoppingCart size={12} />
                </button>
              ) : (
                <Link
                  href="/cart"
                  className="p-1.5 rounded-lg border border-navy-200 text-navy-600 hover:text-navy-800 transition-colors"
                  title="View cart"
                >
                  <ShoppingCart size={12} />
                </Link>
              )}
              <Link
                href={`${MARKETING}/certifications/${cert.slug}`}
                target="_blank" rel="noreferrer"
                className="text-xs font-semibold bg-navy-900 hover:bg-navy-700 text-white px-3 py-1.5 rounded-xl transition-colors"
              >
                Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Catalog grouped by level ─────────────────────────────────────────────────

function CatalogByLevel({ catalog, enrolledCertIds }: { catalog: any[]; enrolledCertIds: Set<string> }) {
  const grouped = LEVEL_GROUPS.map(g => ({
    ...g, certs: catalog.filter((c: any) => c.level === g.key),
  })).filter(g => g.certs.length > 0);

  const ungrouped = catalog.filter((c: any) => !LEVEL_GROUPS.some(g => g.key === c.level));
  const allGroups = [
    ...grouped,
    ...(ungrouped.length > 0 ? [{ key: "__other", label: "Other", description: "", certs: ungrouped }] : []),
  ];

  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(allGroups.map(g => [g.key, true]))
  );

  return (
    <div className="space-y-3">
      {allGroups.map(group => (
        <div key={group.key} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <button
            onClick={() => setOpen(p => ({ ...p, [group.key]: !p[group.key] }))}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="min-w-0">
              <span className="font-display font-black text-navy-900 text-base">{group.label}</span>
              {group.description && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{group.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-4">
              <span className="text-[11px] font-medium text-slate-400">
                {group.certs.length} cert{group.certs.length !== 1 ? "s" : ""}
              </span>
              <ChevronDown
                size={15}
                className={cn("text-slate-300 transition-transform duration-200", open[group.key] && "rotate-180")}
              />
            </div>
          </button>

          <div className={cn("overflow-hidden transition-all duration-300", open[group.key] ? "max-h-[2000px]" : "max-h-0")}>
            <div className="px-5 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-100">
              {group.certs.map((cert: any) => (
                <CertCatalogCard key={cert.id} cert={cert} enrolled={enrolledCertIds.has(cert.id)} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificatesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { items } = useCartStore();

  const { data: certsRaw }       = useSWR(token ? ["/certificates/my", token] : null, ([u, t]) => fetcher(u, t));
  const { data: catalogRaw }     = useSWR("/courses", publicFetcher);
  const { data: enrollmentsRaw } = useSWR(token ? ["/enrollments/my", token] : null, ([u, t]) => fetcher(u, t));

  const certificates: any[] = Array.isArray(certsRaw)       ? certsRaw       : (certsRaw?.data       ?? []);
  const catalog: any[]      = Array.isArray(catalogRaw)     ? catalogRaw     : [];
  const enrollments: any[]  = Array.isArray(enrollmentsRaw) ? enrollmentsRaw : (enrollmentsRaw?.data  ?? []);

  const enrolledCertIds = new Set(
    enrollments
      .filter((e: any) => e.status === "active" || e.status === "completed")
      .map((e: any) => e.certification_id)
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* ── Earned Certificates ── */}
        <section>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-display font-black text-navy-900 tracking-tight">My Certificates</h1>
              <p className="text-sm text-slate-400 mt-1">Your earned PAII credentials</p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <p className="text-4xl mb-4">🎓</p>
              <p className="font-display font-bold text-navy-900 text-base mb-1">No certificates yet</p>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                Complete a certification program and pass the exam to earn your first credential.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map((cert: any) => (
                <div key={cert.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-5 p-5">
                    <AcronymBadge acronym={cert.certification_acronym ?? "—"} size="md" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                          <p className="font-display font-black text-navy-900 text-base leading-snug truncate">
                            {cert.certification_title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {cert.certificate_number} · Issued {formatDate(cert.issued_at)}
                          </p>
                        </div>
                        <span className={cn(
                          "flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full",
                          cert.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                          {cert.status === "active" ? "Active" : "Revoked"}
                        </span>
                      </div>

                      {cert.status === "revoked" ? (
                        <p className="text-xs text-red-500 mt-2">
                          This certificate has been revoked and is no longer valid.
                        </p>
                      ) : (
                        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-400 flex-1">
                            Valid until{" "}
                            <span className="font-semibold text-slate-700">{formatDate(cert.expires_at)}</span>
                          </p>
                          <Link
                            href={`/certificates/${cert.certification_id}`}
                            className="text-xs font-semibold text-navy-700 hover:text-navy-900 transition-colors"
                          >
                            View →
                          </Link>
                          <Link
                            href={cert.verification_url || `/verify?id=${cert.certificate_number}`}
                            target="_blank"
                            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            Verify →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Certification Catalog ── */}
        <section>
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-display font-black text-navy-900 tracking-tight">Available Certifications</h2>
              <p className="text-sm text-slate-400 mt-1">Enroll in a PAII certification program to start your AI career</p>
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

          {catalog.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
              <p className="text-slate-400 text-sm font-semibold">No certifications available yet</p>
            </div>
          ) : (
            <CatalogByLevel catalog={catalog} enrolledCertIds={enrolledCertIds} />
          )}
        </section>

      </div>
    </div>
  );
}
