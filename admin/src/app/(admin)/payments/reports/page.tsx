"use client";

import useSWR from "swr";
import { BarChart3, TrendingUp, DollarSign, Receipt, RefreshCw, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher([url, token]: [string, string]) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

const TYPE_LABELS: Record<string, string> = {
  enrollment:       "Enrollment",
  retake_fee:       "Retake Fee",
  renewal_fee:      "Renewal Fee",
  corporate_bundle: "Corporate Bundle",
};

const STATUS_COLORS: Record<string, string> = {
  succeeded:          "bg-green-500",
  pending:            "bg-amber-400",
  failed:             "bg-red-400",
  refunded:           "bg-slate-400",
  partially_refunded: "bg-blue-400",
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MonthBar({ month, revenue, maxRevenue }: { month: string; revenue: number; maxRevenue: number }) {
  const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  const label = month.slice(5); // MM
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const displayMonth = monthNames[parseInt(label, 10) - 1] ?? label;

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <span className="text-[10px] text-slate-500 font-medium">${revenue >= 1000 ? `${(revenue/1000).toFixed(1)}k` : revenue.toFixed(0)}</span>
      <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
        <div
          className="w-full bg-navy-700 rounded-t-sm transition-all"
          style={{ height: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400">{displayMonth}</span>
    </div>
  );
}

export default function ReportsPage() {
  const { accessToken } = useAuthStore();

  const { data, mutate, isLoading } = useSWR(
    accessToken ? ["/payments/admin/stats", accessToken] : null,
    fetcher
  );

  const totalRevenue = Number(data?.total_revenue ?? 0);
  const byStatus: any[]  = data?.by_status ?? [];
  const byType: any[]    = data?.by_type   ?? [];
  const monthly: any[]   = data?.monthly   ?? [];

  const succeeded = byStatus.find((s: any) => s.status === "succeeded");
  const refunded  = byStatus.find((s: any) => s.status === "refunded");
  const totalCount = byStatus.reduce((acc: number, s: any) => acc + Number(s._count.id), 0);
  const succeededCount = Number(succeeded?._count?.id ?? 0);
  const refundedAmount = Number(refunded?._sum?.amount ?? 0);

  const maxMonthlyRevenue = Math.max(...monthly.map((m: any) => m.revenue), 1);

  // Fill all 12 months even if some have no data
  const now = new Date();
  const allMonths: { month: string; revenue: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const found = monthly.find((m: any) => m.month === key);
    allMonths.push({ month: key, revenue: found?.revenue ?? 0, count: found?.count ?? 0 });
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-navy-600" />
            <h1 className="text-2xl font-display font-black text-navy-900">Reports</h1>
          </div>
          <p className="text-slate-500 text-sm">Revenue and payment analytics</p>
        </div>
        <button onClick={() => mutate()} className="btn-outline flex items-center gap-2 !py-2 !px-3 !text-xs">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <DollarSign size={16} className="text-green-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</span>
              </div>
              <p className="text-2xl font-display font-black text-navy-900">${fmt(totalRevenue)}</p>
              <p className="text-xs text-slate-400 mt-1">All-time succeeded payments</p>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center">
                  <Receipt size={16} className="text-navy-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactions</span>
              </div>
              <p className="text-2xl font-display font-black text-navy-900">{totalCount.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">{succeededCount} succeeded</p>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <TrendingUp size={16} className="text-red-500" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refunded</span>
              </div>
              <p className="text-2xl font-display font-black text-navy-900">${fmt(refundedAmount)}</p>
              <p className="text-xs text-slate-400 mt-1">{refunded?._count?.id ?? 0} refund{refunded?._count?.id !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Monthly revenue chart */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-900 mb-6">Monthly Revenue — Last 12 Months</h2>
            {allMonths.every((m) => m.revenue === 0) ? (
              <div className="text-center py-12 text-slate-400 text-sm">No revenue data yet</div>
            ) : (
              <div className="flex items-end gap-1.5">
                {allMonths.map((m) => (
                  <MonthBar key={m.month} month={m.month} revenue={m.revenue} maxRevenue={maxMonthlyRevenue} />
                ))}
              </div>
            )}
          </div>

          {/* Breakdown by type */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-900 mb-5">Revenue by Type</h2>
            {byType.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byType.map((t: any) => {
                  const rev = Number(t._sum?.amount ?? 0);
                  const pct = totalRevenue > 0 ? (rev / totalRevenue) * 100 : 0;
                  return (
                    <div key={t.type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-navy-900">{TYPE_LABELS[t.type] ?? t.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{t._count?.id} tx</span>
                          <span className="text-sm font-semibold text-navy-900">${fmt(rev)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-navy-700 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Breakdown by status */}
          <div className="card p-6">
            <h2 className="font-semibold text-navy-900 mb-5">Transactions by Status</h2>
            {byStatus.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-2">
                {byStatus.map((s: any) => (
                  <div key={s.status} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s.status] ?? "bg-slate-300"}`} />
                      <span className="text-sm text-navy-900 capitalize">{s.status.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-xs text-slate-500">{s._count?.id} transactions</span>
                      <span className="text-sm font-semibold text-navy-900 w-24 text-right">
                        ${fmt(Number(s._sum?.amount ?? 0))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
