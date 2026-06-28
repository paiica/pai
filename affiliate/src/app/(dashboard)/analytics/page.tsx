"use client";

import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";
import { TrendingUp, Package } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ChartSkeleton, Skeleton } from "@/components/ui/LoadingSkeleton";
import { formatCurrency, formatPercent } from "@/lib/utils";

type Range = "7d" | "30d" | "90d";

function RangeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={active ? "btn-primary !py-1 !px-3 !text-xs" : "btn-ghost !py-1 !px-3 !text-xs"}
    >
      {label}
    </button>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const { analytics, isLoading } = useAnalytics(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <RangeButton label="7 days"  active={range === "7d"}  onClick={() => setRange("7d")} />
        <RangeButton label="30 days" active={range === "30d"} onClick={() => setRange("30d")} />
        <RangeButton label="90 days" active={range === "90d"} onClick={() => setRange("90d")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
            <ChartSkeleton height={220} />
          </>
        ) : analytics ? (
          <>
            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Revenue Over Time</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics.revenue_over_time} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8962E" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#B8962E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Area type="monotone" dataKey="value" stroke="#B8962E" strokeWidth={2} fill="url(#grad-revenue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Clicks vs Conversions</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.clicks_vs_conversions} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="clicks" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Clicks" />
                  <Bar dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Conversion Funnel</p>
              <ResponsiveContainer width="100%" height={200}>
                <FunnelChart>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Funnel
                    dataKey="value"
                    data={analytics.funnel.map((s, i) => ({
                      value: s.count,
                      name: s.stage,
                      fill: ["#1e3a5f", "#B8962E", "#3b82f6", "#10b981"][i % 4],
                    }))}
                  >
                    <LabelList position="right" content={({ value, name }) => (
                      <text fontSize={11} fill="#64748b">{name}: {value}</text>
                    )} />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Package size={15} className="text-slate-400" />
                Top Products
              </p>
              <div className="space-y-3">
                {analytics.top_products.map((tp, i) => (
                  <div key={tp.product_id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-semibold text-slate-700 truncate">{tp.product_name}</p>
                        <p className="text-xs font-bold text-gold-700 ml-2 shrink-0">{formatCurrency(tp.revenue)}</p>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold-400 rounded-full"
                          style={{ width: `${tp.conversion_rate * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{tp.sales} sales · {formatPercent(tp.conversion_rate)} CVR</p>
                    </div>
                  </div>
                ))}
                {analytics.top_products.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No product data yet.</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
