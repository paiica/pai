import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Rewrites every <a> in a lesson-content HTML string to open in a new tab.
// Skips anchors carrying `data-internal-lesson` — those are same-course
// cross-lesson links meant to navigate in-app (see the lesson player's
// internal-link click handler), not launch a new tab.
//
// Uses a <template> to parse rather than DOMParser("text/html") — a
// <template>'s content is a plain DocumentFragment, not a full document, so
// it never splits into synthetic <head>/<body> elements. That distinction
// matters here: content wrapped by wrapLessonContent() (block-authored
// lessons — accordion/flashcards/etc.) starts with a leading <style> tag,
// and a full-document parse hoists a leading <style> into the auto-created
// <head>, which then silently vanishes when only `doc.body.innerHTML` is
// read back out — every interactive block's CSS was being stripped this way.
export function addTargetBlankToLinks(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("a").forEach((link) => {
    // Both in-app navigation shapes are skipped here — data-internal-lesson
    // (a real page navigation) and data-sublesson-link (opens the contextual
    // overlay in place) each have their own click handler below instead.
    if (link.hasAttribute("data-internal-lesson") || link.hasAttribute("data-sublesson-link")) return;
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
  return template.innerHTML;
}

// Delegated click handler for content rendered from `addTargetBlankToLinks`-
// processed HTML: anchors authored as `<a data-internal-lesson="{lessonId}"
// href="#lesson:{lessonId}">` should navigate within the app (same
// enrollment, different lesson) instead of following the placeholder href.
export function handleInternalLessonClick(
  e: import("react").MouseEvent<HTMLElement>,
  navigate: (lessonId: string) => void
) {
  const target = (e.target as HTMLElement).closest?.("[data-internal-lesson]");
  const lessonId = target?.getAttribute("data-internal-lesson");
  if (!lessonId) return;
  e.preventDefault();
  navigate(lessonId);
}

// Delegated click handler for `<a data-sublesson-link="{sublessonId}">`
// anchors (inserted via the admin RichTextEditor's "Insert Sublesson Link"
// button — see RichTextEditor.tsx's SublessonLinkExt). Unlike
// handleInternalLessonClick, this never navigates to a new page — a
// Sublesson is contextual/supporting content, opened in an overlay on top
// of the current Lesson (see SublessonOverlay.tsx), with the student's
// scroll position preserved so "Back to Lesson" returns them to exactly
// where they were.
export function handleSublessonClick(
  e: import("react").MouseEvent<HTMLElement>,
  open: (sublessonId: string) => void
) {
  const target = (e.target as HTMLElement).closest?.("[data-sublesson-link]");
  const sublessonId = target?.getAttribute("data-sublesson-link");
  if (!sublessonId) return;
  e.preventDefault();
  open(sublessonId);
}
