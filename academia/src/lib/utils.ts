import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
