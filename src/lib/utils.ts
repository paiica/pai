import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "MMMM d, yyyy");
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function generateCertificateId(acronym: string, year: number, sequence: number): string {
  const seq = String(sequence).padStart(5, "0");
  return `${acronym}-${year}-${seq}`;
}

export function calculateExpiryDate(issueDate: string, years: number): string {
  const date = parseISO(issueDate);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().split("T")[0];
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "expired": return "text-amber-700 bg-amber-50 border-amber-200";
    case "revoked": return "text-red-700 bg-red-50 border-red-200";
    default: return "text-slate-700 bg-slate-50 border-slate-200";
  }
}

export function getCertificationLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    foundation: "Foundation Level",
    professional: "Professional Level",
    specialist: "Specialist Level",
    executive: "Executive Level",
  };
  return labels[level] || level;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
