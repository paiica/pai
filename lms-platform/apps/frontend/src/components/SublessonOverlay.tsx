"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X, Loader2, AlertTriangle } from "lucide-react";
import { addTargetBlankToLinks } from "@/lib/utils";

const SUBLESSON_KIND_LABEL: Record<string, string> = {
  explanation: "Explanation", instructions: "Instructions", example: "Example", tip: "Tip",
  case_study: "Case Study", how_to: "How-To", resource: "Resource", other: "Other",
};

export type SublessonData = {
  id: string;
  title: string;
  content_body?: string | null;
  sublesson_kind?: string | null;
};

// Sublessons are contextual/supporting content, not a new primary Lesson —
// see schema.prisma's Lesson model comment. This overlay is deliberately
// NOT a page navigation: it opens on top of the current Lesson (this
// session's default `open_behavior`), shows exactly which Lesson it belongs
// to, and closing it (backdrop click, X, Escape, or "Back to Lesson") never
// loses the student's place — the parent page keeps the Lesson mounted
// underneath and only needs to restore scroll position, not refetch/rerender
// anything.
export default function SublessonOverlay({
  open, sublesson, loading, error, parentTitle, onClose,
}: {
  open: boolean;
  sublesson: SublessonData | null;
  loading: boolean;
  // Passed through from the parent's SWR `error` — previously any fetch
  // failure (403/404/500/network) just made the whole overlay silently
  // return null with the backdrop's own onClick={onClose} still mounted,
  // so a failed request looked identical to "nothing happened" instead of
  // showing what actually went wrong. `open` now controls visibility
  // independently of whether the fetch succeeded, so an error has
  // somewhere to render.
  error?: unknown;
  parentTitle: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [onClose]);

  // Portal to document.body rather than rendering inline: `position: fixed`
  // is positioned relative to the nearest ancestor with a `transform` (or
  // filter/perspective) set, not the viewport, if one exists anywhere up
  // the tree — confirmed real-world case: a page-zoom/accessibility tool
  // wrapping the app in a scaled container caused this overlay to render
  // far down the page instead of staying pinned on screen. Rendering
  // straight into body sidesteps that regardless of what's above it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  const errorMessage = error
    ? (error as any)?.message || "Couldn't load this sublesson. Please try again."
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 sm:px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-1.5"
            >
              <ArrowLeft size={13} /> Back to {parentTitle}
            </button>
            {sublesson?.sublesson_kind && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                {SUBLESSON_KIND_LABEL[sublesson.sublesson_kind] ?? sublesson.sublesson_kind}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0 p-1" title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center text-center gap-2 py-16 text-slate-500">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          ) : sublesson ? (
            <>
              <h2 className="text-xl font-bold text-navy-900 mb-4">{sublesson.title}</h2>
              {sublesson.content_body && (
                <div
                  className="prose prose-slate prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(sublesson.content_body) }}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-center gap-2 py-16 text-slate-500">
              <AlertTriangle size={20} className="text-amber-500" />
              <p className="text-sm">This sublesson couldn&apos;t be found.</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
