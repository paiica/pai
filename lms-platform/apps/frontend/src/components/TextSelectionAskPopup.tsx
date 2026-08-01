"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Sparkles } from "lucide-react";

const MIN_SELECTION_LENGTH = 4;

// A small "Ask AI Professor" pill that appears near whatever text the
// student just selected inside the lesson content, mirroring the
// highlight-to-look-up pattern from Kindle/Medium — not fully automatic
// (most selections are just copy/read-along, not a request for help), but
// one click away once they actually want it.
export default function TextSelectionAskPopup({
  containerRef, onAsk,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onAsk: (text: string) => void;
}) {
  const [popup, setPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const popupRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const container = containerRef.current;
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed || text.length < MIN_SELECTION_LENGTH) {
        setPopup(null);
        return;
      }
      const anchorNode = sel.anchorNode;
      if (!anchorNode || !container.contains(anchorNode)) {
        setPopup(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPopup(null);
        return;
      }
      setPopup({ text, x: rect.left + rect.width / 2, y: rect.top });
    }

    // A document-level "selectionchange" listener (rather than mouseup/keyup
    // scoped to the content container) fires regardless of what's inside the
    // lesson content — interactive blocks (sorting exercises, accordions,
    // embedded widgets) that stopPropagation() on their own click handling
    // would otherwise stop a container-scoped listener from ever seeing the
    // event at all.
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [containerRef]);

  // SCORM lessons render inside a cross-origin iframe — window.getSelection()
  // in this page can never see a selection made inside it. The SCORM bridge
  // script relays it instead via postMessage; the lesson page translates
  // that into real viewport coordinates and re-dispatches it as this custom
  // event, which is otherwise identical to a same-page selection from here on.
  useEffect(() => {
    function handleFrameSelection(e: Event) {
      const detail = (e as CustomEvent).detail as { text: string; x: number; y: number } | null;
      setPopup(detail);
    }
    window.addEventListener("paii:lesson-frame-selection", handleFrameSelection);
    return () => window.removeEventListener("paii:lesson-frame-selection", handleFrameSelection);
  }, []);

  // Dismiss on scroll (the fixed-position popup would otherwise point at
  // stale coordinates) and on any click outside both the content and the
  // popup itself.
  useEffect(() => {
    const container = containerRef.current;
    function clear() { setPopup(null); }
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if (container?.contains(target)) return;
      setPopup(null);
    }
    container?.addEventListener("scroll", clear);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      container?.removeEventListener("scroll", clear);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [containerRef]);

  if (!popup) return null;

  return (
    <button
      ref={popupRef}
      onClick={() => {
        onAsk(popup.text);
        setPopup(null);
        window.getSelection()?.removeAllRanges();
      }}
      style={{ position: "fixed", left: popup.x, top: popup.y, transform: "translate(-50%, calc(-100% - 8px))" }}
      className="z-50 flex items-center gap-1.5 bg-[#171527] hover:bg-[#2d2b43] text-white text-xs font-semibold pl-2.5 pr-3 py-2 rounded-full shadow-xl transition-colors"
    >
      <Sparkles size={13} className="text-teal-400 flex-shrink-0" />
      Ask AI Professor
    </button>
  );
}
