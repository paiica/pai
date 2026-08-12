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
export function addTargetBlankToLinks(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("a").forEach((link) => {
    if (link.hasAttribute("data-internal-lesson")) return;
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
  return doc.body.innerHTML;
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
