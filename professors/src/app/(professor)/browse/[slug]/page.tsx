"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Sparkles, CheckCircle, Loader2, ArrowRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function fetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then(r => r.json()).then(r => r.data ?? r);
}

const GRADIENTS = [
  { from: "#e6d5f7", to: "#d0b0f0", mid: "#e0c8f5" },
  { from: "#cfe8f5", to: "#b0cfe8", mid: "#c8e0f5" },
  { from: "#f0e2cc", to: "#dfc0a0", mid: "#e8d5b8" },
  { from: "#cdf0e2", to: "#a0d8c0", mid: "#c0e8d5" },
  { from: "#f5cfe0", to: "#e8a8c5", mid: "#f0c0d8" },
  { from: "#d0d8f5", to: "#a8b8ee", mid: "#c8d0f5" },
];

function getGradient(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) { h = ((h << 5) - h) + slug.charCodeAt(i); h |= 0; }
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

function extractAcronym(title: string): string {
  const m = title.match(/\(([A-Z]{2,6}[+®™]*)\)/);
  if (m) return m[1];
  return title.split(/\s+/).filter(w => /^[A-Z]/.test(w) && w.length > 2).slice(0, 3).map(w => w[0]).join("");
}

export default function BrowseToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const { data: tool, isLoading } = useSWR(`/online-tools/${slug}`, fetcher);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-navy-600" />
      </div>
    );
  }

  if (!tool || tool.statusCode === 404) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <p className="text-2xl font-display font-black text-navy-900 mb-3">Tool not found</p>
          <Link href="/browse" className="text-sm text-slate-500 hover:text-navy-700">← Back to Online Tools</Link>
        </div>
      </div>
    );
  }

  const grad        = getGradient(tool.slug);
  const price       = Number(tool.price);
  const features: { title: string; description: string }[] = Array.isArray(tool.features) ? tool.features : [];
  const steps:    { title: string; description: string }[] = Array.isArray(tool.how_it_works) ? tool.how_it_works : [];
  const related:  any[] = Array.isArray(tool.related_tools) ? tool.related_tools : [];
  const acronym   = tool.cert_acronym || extractAcronym(tool.title);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ── */}
      <div
        className="w-full"
        style={{ background: `linear-gradient(135deg, ${grad.from} 0%, ${grad.mid} 50%, ${grad.to} 100%)` }}
      >
        <div className="max-w-6xl mx-auto px-6 pt-6 pb-2 flex items-center gap-2 text-xs text-navy-700/60">
          <Link href="/browse" className="hover:text-navy-900 transition-colors font-medium">Online Tools</Link>
          <span>/</span>
          <span className="text-navy-800 font-medium truncate max-w-xs">{tool.title}</span>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="flex items-center justify-center lg:justify-start">
            {tool.thumbnail_url ? (
              <img
                src={tool.thumbnail_url}
                alt={tool.title}
                className="w-64 h-44 object-contain rounded-2xl"
              />
            ) : (
              <div className="w-64 h-44 rounded-2xl border-2 border-navy-900/30 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                <span className="text-4xl font-black text-navy-900 tracking-tight">{acronym}</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800">
                Online Tools
              </span>
              {tool.badge_text && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-navy-900/30 bg-white/40 text-navy-800 flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-500" /> {tool.badge_text}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-display font-black text-navy-900 leading-tight mb-2">{tool.title}</h1>

            {tool.offered_by && (
              <p className="text-sm text-navy-700/70 mb-3">Offered by {tool.offered_by}</p>
            )}

            {tool.short_description && (
              <p className="text-sm text-navy-800 leading-relaxed mb-4">{tool.short_description}</p>
            )}

            <div className="border-t border-navy-900/15 pt-4">
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-navy-600 font-semibold uppercase tracking-wide mb-0.5">Price</p>
                  <p className="text-xl font-black text-navy-900">
                    {price === 0 ? "Free" : `USD $${price.toFixed(0)}`}
                  </p>
                </div>

                {tool.cta_url && (
                  <a
                    href={tool.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 bg-navy-900 hover:bg-navy-700 text-white text-sm font-bold rounded-full transition-colors inline-flex items-center gap-2"
                  >
                    {tool.cta_label || "Learn More"} <ArrowRight size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="max-w-6xl mx-auto px-6">

        {tool.overview && (
          <section className="py-16 grid grid-cols-1 lg:grid-cols-3 gap-10 border-b border-slate-100">
            <div>
              <h2 className="text-3xl font-display font-black text-navy-900">Overview</h2>
            </div>
            <div className="lg:col-span-2">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{tool.overview}</p>
            </div>
          </section>
        )}

        {features.length > 0 && (
          <section className="py-16 border-b border-slate-100">
            <h2 className="text-3xl font-display font-black text-navy-900 mb-8">What You'll Access</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feat, i) => (
                <div key={i} className="flex gap-3 p-5 rounded-2xl border border-slate-100 bg-slate-50">
                  <CheckCircle size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-navy-900 text-sm">{feat.title}</p>
                    {feat.description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{feat.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {steps.length > 0 && (
          <section className="py-16 border-b border-slate-100">
            <h2 className="text-3xl font-display font-black text-navy-900 mb-8">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {steps.map((step, i) => (
                <div key={i} className="p-6 rounded-2xl border border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-navy-900 text-white font-black text-sm flex items-center justify-center mb-4">
                    {i + 1}
                  </div>
                  <p className="font-display font-bold text-navy-900 mb-2">{step.title}</p>
                  {step.description && <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="py-16">
            <h2 className="text-3xl font-display font-black text-navy-900 mb-8">You May Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((rel: any, i: number) => {
                const rg = getGradient(rel.slug);
                return (
                  <Link
                    key={rel.id}
                    href={`/browse/${rel.slug}`}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div
                      className="h-28 flex items-end p-4"
                      style={{ background: `linear-gradient(135deg, ${rg.from}, ${rg.to})` }}
                    >
                      {rel.badge_text && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-navy-900/20 bg-white/40 text-navy-800">
                          {rel.badge_text}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-navy-900 text-sm mb-1 leading-snug">{rel.title}</p>
                      {rel.short_description && <p className="text-xs text-slate-500 line-clamp-2">{rel.short_description}</p>}
                      <p className="text-xs font-bold text-navy-900 mt-2">
                        {Number(rel.price) === 0 ? "Free" : `$${Number(rel.price).toFixed(2)}`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
