import { cn } from "@/lib/utils";
import type { EnrollmentStatus } from "@/types";

const STATUS_STYLES: Record<EnrollmentStatus, string> = {
  active:                "bg-blue-50 text-blue-700",
  completed:              "bg-emerald-50 text-emerald-700",
  suspended:              "bg-amber-50 text-amber-700",
  expired:                "bg-slate-100 text-slate-500",
  registration_expired:   "bg-red-50 text-red-600",
  retake_expired:         "bg-red-50 text-red-600",
};

export function EnrollmentBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <span className={cn("badge capitalize", STATUS_STYLES[status] ?? "bg-slate-100 text-slate-500")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
