"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type GlossaryTermData = {
  id: string;
  term: string;
  slug: string;
  category: string;
  definition: string;
  example: string;
  related_terms: string[];
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Client-side filter over an already server-fetched list (see
// GlossaryLiveSection) — at realistic glossary term counts this is simpler
// and faster than a dedicated search endpoint, and keeps every term present
// in the initial server-rendered HTML for SEO.
export default function GlossaryBrowser({ terms }: { terms: GlossaryTermData[] }) {
  const t = useTranslations("GlossaryBrowser");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return terms;
    return terms.filter((t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [terms, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTermData[]>();
    for (const t of filtered) {
      const letter = t.term.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(t);
    }
    return map;
  }, [filtered]);

  const availableLetters = new Set(Array.from(grouped.keys()));
  const bySlug = useMemo(() => new Map(terms.map((t) => [t.slug, t])), [terms]);

  if (!terms.length) return null;

  return (
    <div className="container-md py-10">
      <div className="relative max-w-md mx-auto mb-8">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchAriaLabel")}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <nav aria-label="Jump to letter" className="sticky top-[calc(var(--header-height,88px)+8px)] z-10 bg-white/95 backdrop-blur-sm py-2 mb-8 flex flex-wrap justify-center gap-1 border-b border-sand-100">
        {LETTERS.map((l) =>
          availableLetters.has(l) ? (
            <a
              key={l}
              href={`#letter-${l}`}
              aria-label={`Jump to terms starting with ${l}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors text-ink-900 hover:bg-teal-100 cursor-pointer"
            >
              {l}
            </a>
          ) : (
            <span key={l} aria-hidden="true" className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-slate-300">
              {l}
            </span>
          )
        )}
      </nav>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-10">{t("noResults", { query })}</p>
      ) : (
        <div className="space-y-10 max-w-3xl mx-auto">
          {LETTERS.filter((l) => grouped.has(l)).map((letter) => (
            <div key={letter} id={`letter-${letter}`}>
              <h2 className="text-sm font-display font-black text-teal-600 uppercase tracking-widest mb-4">{letter}</h2>
              <div className="space-y-4">
                {grouped.get(letter)!.map((term) => (
                  <div key={term.id} id={term.slug} className="bg-white rounded-2xl border border-sand-200 p-5 scroll-mt-32">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="font-display font-bold text-ink-900 text-base">{term.term}</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">{term.category}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{term.definition}</p>
                    {term.example?.trim() && (
                      <p className="text-xs text-slate-400 mt-2 italic">{t("example")} {term.example}</p>
                    )}
                    {term.related_terms?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-sand-100">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t("related")}</span>
                        {term.related_terms.map((rSlug) => {
                          const related = bySlug.get(rSlug);
                          if (!related) return null;
                          return (
                            <Link key={rSlug} href={`/glossary#${related.slug}`} className="text-xs font-semibold text-teal-700 hover:underline">
                              {related.term}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
