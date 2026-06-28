import { cn } from "@/lib/utils";
import type { LeadStatus, CommissionStatus, PromoStatus } from "@/types";

const LEAD_STYLES: Record<LeadStatus, string> = {
  invited:    "bg-slate-100 text-slate-600",
  registered: "bg-blue-50 text-blue-700",
  purchased:  "bg-emerald-50 text-emerald-700",
};

const COMMISSION_STYLES: Record<CommissionStatus, string> = {
  pending:  "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  paid:     "bg-emerald-50 text-emerald-700",
};

const PROMO_STYLES: Record<PromoStatus, string> = {
  active:    "bg-emerald-50 text-emerald-700",
  expired:   "bg-slate-100 text-slate-500",
  exhausted: "bg-red-50 text-red-600",
};

export function LeadBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn("badge capitalize", LEAD_STYLES[status])}>
      {status}
    </span>
  );
}

export function CommissionBadge({ status }: { status: CommissionStatus }) {
  return (
    <span className={cn("badge capitalize", COMMISSION_STYLES[status])}>
      {status}
    </span>
  );
}

export function PromoBadge({ status }: { status: PromoStatus }) {
  return (
    <span className={cn("badge capitalize", PROMO_STYLES[status])}>
      {status}
    </span>
  );
}
