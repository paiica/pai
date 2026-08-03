import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  accent?: "gold" | "emerald" | "blue" | "purple" | "amber";
}

const ACCENT_STYLES: Record<string, { bar: string; icon: string }> = {
  gold:    { bar: "from-gold-400 to-gold-600",    icon: "bg-gold-50 text-gold-600" },
  emerald: { bar: "from-emerald-400 to-emerald-600", icon: "bg-emerald-50 text-emerald-600" },
  blue:    { bar: "from-blue-400 to-blue-600",    icon: "bg-blue-50 text-blue-600" },
  purple:  { bar: "from-purple-400 to-purple-600", icon: "bg-purple-50 text-purple-600" },
  amber:   { bar: "from-amber-400 to-amber-600",  icon: "bg-amber-50 text-amber-600" },
};

export default function KPICard({ title, value, change, changeLabel, icon: Icon, accent = "gold" }: KPICardProps) {
  const styles = ACCENT_STYLES[accent];
  const isPositive = (change ?? 0) > 0;
  const isNeutral = change === undefined || change === 0;

  return (
    <div className="card p-5 space-y-3 relative overflow-hidden">
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r", styles.bar)} />
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", styles.icon)}>
          <Icon size={17} />
        </div>
      </div>
      <p className="text-2xl font-display font-black text-navy-900">{value}</p>
      {!isNeutral && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp size={13} className="text-emerald-500" />
          ) : (
            <TrendingDown size={13} className="text-red-500" />
          )}
          <span className={cn("text-xs font-semibold", isPositive ? "text-emerald-600" : "text-red-600")}>
            {isPositive ? "+" : ""}{change}%
          </span>
          {changeLabel && <span className="text-xs text-slate-400">{changeLabel}</span>}
        </div>
      )}
      {isNeutral && changeLabel && (
        <div className="flex items-center gap-1.5">
          <Minus size={13} className="text-slate-400" />
          <span className="text-xs text-slate-400">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
