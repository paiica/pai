import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-CA", { dateStyle: "medium" });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getQRCodeUrl(text: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=0e1e3d`;
}

const MARKETING_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3000"
    : process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3000";

export function buildReferralLink(slug: string, referralCode: string): string {
  const base = slug ? `${MARKETING_URL}/${slug}` : MARKETING_URL;
  return `${base}?ref=${referralCode}`;
}

export function buildInviteLink(referralCode: string): string {
  return `${MARKETING_URL}/invite?ref=${referralCode}`;
}

export function buildCheckoutLink(promoCode: string): string {
  return `${MARKETING_URL}/checkout?promo=${promoCode}`;
}

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function getChangeColor(change: number): string {
  if (change > 0) return "text-emerald-600";
  if (change < 0) return "text-red-500";
  return "text-slate-400";
}

export function getChangeLabel(change: number): string {
  if (change > 0) return `+${change.toFixed(1)}%`;
  return `${change.toFixed(1)}%`;
}
