"use client";

import {
  DollarSign, Users, TrendingUp, MousePointerClick,
  ShoppingBag, Mail, BarChart3, Percent,
  Award,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import KPICard from "@/components/ui/KPICard";
import { KPICardSkeleton, ChartSkeleton } from "@/components/ui/LoadingSkeleton";
import { useAffiliateDashboard } from "@/hooks/useAffiliateDashboard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const CHART_COLOR = "#14b8a6";

function ChartCard({ title, data, dataKey, color = CHART_COLOR, formatter }: {
  title: string;
  data: { date: string; value: number }[];
  dataKey: string;
  color?: string;
  formatter?: (v: number) => string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold text-slate-700 mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
            tickFormatter={formatter} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
            formatter={(v: number) => [formatter ? formatter(v) : v, title]}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            fill={`url(#grad-${dataKey})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardPage() {
  const { stats, charts, isLoading } = useAffiliateDashboard();

  const kpis = stats ? [
    { title: "Total Earnings",      value: formatCurrency(stats.total_earnings),        change: stats.earnings_change,     icon: DollarSign,       accent: "gold"    as const },
    { title: "Pending Commissions", value: formatCurrency(stats.pending_commissions),   change: undefined,                  icon: Award,            accent: "amber"   as const },
    { title: "Total Leads",         value: formatNumber(stats.total_leads),              change: stats.leads_change,         icon: Users,            accent: "blue"    as const },
    { title: "Conversions",         value: formatNumber(stats.conversions),              change: stats.conversions_change,   icon: ShoppingBag,      accent: "emerald" as const },
    { title: "Conversion Rate",     value: formatPercent(stats.conversion_rate),         change: stats.conversion_rate_change, icon: Percent,        accent: "purple"  as const },
    { title: "Clicks",              value: formatNumber(stats.total_clicks),             change: stats.clicks_change,        icon: MousePointerClick, accent: "blue"   as const },
    { title: "Invites Sent",        value: formatNumber(stats.invites_sent),             change: undefined,                  icon: Mail,             accent: "gold"    as const },
    { title: "Active Promo Codes",  value: formatNumber(stats.active_promo_codes),       change: undefined,                  icon: BarChart3,        accent: "emerald" as const },
    { title: "Active Products",     value: formatNumber(stats.active_products),          change: undefined,                  icon: TrendingUp,       accent: "purple"  as const },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => <KPICardSkeleton key={i} />)
          : kpis.map((kpi) => (
              <KPICard key={kpi.title} {...kpi} changeLabel="vs last month" />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
          </>
        ) : charts ? (
          <>
            <ChartCard
              title="Earnings Over Time"
              data={charts.earnings.map((d) => ({ date: d.date, value: d.value }))}
              dataKey="value"
              color="#14b8a6"
              formatter={formatCurrency}
            />
            <ChartCard
              title="Leads Over Time"
              data={charts.leads.map((d) => ({ date: d.date, value: d.value }))}
              dataKey="value"
              color="#3b82f6"
              formatter={(v) => String(Math.round(v))}
            />
            <ChartCard
              title="Clicks Over Time"
              data={charts.clicks.map((d) => ({ date: d.date, value: d.value }))}
              dataKey="value"
              color="#8b5cf6"
              formatter={(v) => String(Math.round(v))}
            />
            <ChartCard
              title="Conversions Over Time"
              data={charts.conversions.map((d) => ({ date: d.date, value: d.value }))}
              dataKey="value"
              color="#10b981"
              formatter={(v) => String(Math.round(v))}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
