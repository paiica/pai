"use client";

import { useEffect, useState } from "react";
import { List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Quick-jump dropdown for long reading lessons — scans the rendered content
// for headings after each render and builds a "On this page" menu. Shared
// by both player tracks (certification and prep-course). Only shown once
// there's actually something worth jumping between.
export default function TableOfContents({
  containerRef, contentKey,
}: { containerRef: React.RefObject<HTMLDivElement | null>; contentKey: string }) {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) { setHeadings([]); return; }
    const els = Array.from(container.querySelectorAll("h1, h2, h3")) as HTMLElement[];
    const list = els.map((el, i) => {
      if (!el.id) {
        const slug = (el.textContent || `section-${i}`).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        el.id = slug || `section-${i}`;
      }
      return { id: el.id, text: el.textContent || "", level: el.tagName === "H1" ? 1 : el.tagName === "H2" ? 2 : 3 };
    });
    setHeadings(list);
  }, [containerRef, contentKey]);

  if (headings.length < 2) return null;

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  }

  return (
    <div className="relative mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-lg px-3 py-1.5 transition-colors"
      >
        <List size={13} /> On this page <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-10 w-72 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-2">
          {headings.map((h) => (
            <button
              key={h.id}
              onClick={() => jumpTo(h.id)}
              className={cn(
                "block w-full text-left px-3.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-teal-700 transition-colors truncate",
                h.level === 1 && "font-semibold text-slate-800",
                h.level === 3 && "pl-6 text-xs text-slate-500"
              )}
            >
              {h.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
