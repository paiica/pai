"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Users, BookOpen, Award, Clock, CheckCircle2, XCircle, Loader2,
  ChevronDown, DollarSign, UserCheck, UserX, TrendingUp, AlertCircle,
  GraduationCap, FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";

type DashboardView = "lms" | "sales";

// ── Needs Attention + What's New ──────────────────────────────────────────────

interface NeedsAttentionItem {
  key: string; label: string; description: string; count: number; href: string;
}
interface OverviewData {
  needs_attention: NeedsAttentionItem[];
  needs_attention_total: number;
  whats_new: {
    since_days: number;
    new_students_count: number;
    new_students: { id: string; name: string; email: string; created_at: string }[];
    new_applications_count: number;
    new_applications: { id: string; full_name: string; email: string; status: string; certification: string | null; created_at: string }[];
  };
}

const APP_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment", payment_submitted: "Payment to verify",
  pending_review: "Pending review", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn",
};

function AttentionOverview() {
  const { accessToken } = useAuthStore();
  const { data, isLoading } = useSWR(
    accessToken ? "/admin/overview" : null,
    (url) => api.get<OverviewData>(url, accessToken!),
    { refreshInterval: 60000 },
  );
  const overview = (data as any)?.data ?? data;

  if (isLoading || !overview) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={24} /></div>;
  }

  const { needs_attention, needs_attention_total, whats_new } = overview as OverviewData;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-navy-900 text-base">Needs Your Attention</h2>
            {needs_attention_total > 0 && <span className="badge bg-amber-100 text-amber-700">{needs_attention_total}</span>}
          </div>
          {needs_attention_total === 0 && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> All caught up
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {needs_attention.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-xl p-4 border transition-colors ${
                item.count > 0 ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50" : "border-slate-100 hover:bg-slate-50"
              }`}
              title={item.description}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600 leading-snug">{item.label}</p>
                <span className={`text-lg font-display font-black shrink-0 ${item.count > 0 ? "text-amber-600" : "text-slate-300"}`}>
                  {item.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-navy-400" />
              <h3 className="font-semibold text-navy-900 text-sm">New Students</h3>
              <span className="text-xs text-slate-400">last {whats_new.since_days}d</span>
            </div>
            <span className="badge bg-navy-50 text-navy-700">{whats_new.new_students_count}</span>
          </div>
          {whats_new.new_students.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No new student signups in this window.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {whats_new.new_students.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-400 truncate">{s.email}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{formatDateTime(s.created_at)}</p>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-slate-100 text-center">
            <Link href="/users" className="text-xs font-semibold text-navy-600 hover:text-navy-800">View all users →</Link>
          </div>
        </div>

        <div className="card">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-navy-400" />
              <h3 className="font-semibold text-navy-900 text-sm">New Applications</h3>
              <span className="text-xs text-slate-400">last {whats_new.since_days}d</span>
            </div>
            <span className="badge bg-navy-50 text-navy-700">{whats_new.new_applications_count}</span>
          </div>
          {whats_new.new_applications.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">No new applications in this window.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {whats_new.new_applications.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{a.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{a.certification ?? ""} · {APP_STATUS_LABEL[a.status] ?? a.status}</p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">{formatDateTime(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-slate-100 text-center">
            <Link href="/applications" className="text-xs font-semibold text-navy-600 hover:text-navy-800">View all applications →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sales Dashboard ───────────────────────────────────────────────────────────

function SalesDashboard() {
  const { accessToken } = useAuthStore();

  const { data: statsData } = useSWR(
    accessToken ? "/admin/affiliates/stats" : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const { data: affiliatesData } = useSWR(
    accessToken ? "/admin/affiliates?limit=5&status=pending" : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const stats = statsData?.data ?? statsData ?? null;
  const pendingReps = affiliatesData?.data?.data ?? affiliatesData?.data ?? [];

  const kpis = stats ? [
    { label: "Total Reps",           value: stats.total_reps,            icon: Users,     color: "bg-blue-50 text-blue-600" },
    { label: "Pending Approvals",    value: stats.pending_approvals,     icon: AlertCircle, color: "bg-amber-50 text-amber-600" },
    { label: "Active Reps",          value: stats.active_reps,           icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
    { label: "Suspended",            value: stats.suspended_reps,        icon: UserX,     color: "bg-red-50 text-red-600" },
    { label: "Commission Owed",      value: `$${(stats.total_commission_owed ?? 0).toFixed(2)}`, icon: DollarSign, color: "bg-gold-50 text-gold-600" },
    { label: "Commission Paid",      value: `$${(stats.total_commission_paid ?? 0).toFixed(2)}`, icon: TrendingUp, color: "bg-purple-50 text-purple-600" },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{k.label}</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.color}`}>
                <k.icon size={15} />
              </div>
            </div>
            <p className="text-2xl font-display font-black text-navy-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-navy-900 text-base">Pending Rep Approvals</h2>
            {stats?.pending_approvals > 0 && (
              <span className="badge bg-amber-100 text-amber-700">{stats.pending_approvals}</span>
            )}
          </div>
          <Link href="/affiliates" className="text-xs font-semibold text-navy-600 hover:text-navy-800">
            Manage all →
          </Link>
        </div>

        {pendingReps.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No pending applications.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pendingReps.map((rep: any) => (
              <div key={rep.id} className="p-5 flex items-center gap-4">
                <div className="w-9 h-9 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                  {(rep.first_name || rep.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 text-sm">
                    {rep.first_name && rep.last_name ? `${rep.first_name} ${rep.last_name}` : rep.email}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{rep.email}</p>
                </div>
                <p className="text-xs text-slate-400">{formatDate(rep.created_at)}</p>
                <Link href={`/affiliates/${rep.id}`} className="btn-outline !py-1.5 !px-3 !text-xs shrink-0">
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Manage Reps",    href: "/affiliates",              icon: Users,     color: "bg-blue-50 text-blue-600" },
          { label: "Commissions",    href: "/affiliates?tab=commissions", icon: DollarSign, color: "bg-gold-50 text-gold-600" },
          { label: "Products",       href: "/affiliates?tab=products", icon: BookOpen,  color: "bg-purple-50 text-purple-600" },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={label} href={href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-sm font-semibold text-navy-900">{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── LMS Dashboard ─────────────────────────────────────────────────────────────

function LMSDashboard() {
  const { accessToken } = useAuthStore();

  const { data: pendingData, mutate } = useSWR(
    accessToken ? "/applications/pending?limit=20" : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const pending = pendingData?.data?.data || [];
  const pendingTotal = pendingData?.data?.meta?.total || 0;

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<Record<string, string>>({});

  async function handleApprove(id: string) {
    setActionLoading(id + "_approve");
    try {
      await api.patch(`/applications/${id}/approve`, {}, accessToken!);
      setActionDone((d) => ({ ...d, [id]: "approved" }));
      mutate();
    } catch {}
    setActionLoading(null);
  }

  async function handleReject(id: string) {
    setActionLoading(id + "_reject");
    try {
      await api.patch(`/applications/${id}/reject`, {}, accessToken!);
      setActionDone((d) => ({ ...d, [id]: "rejected" }));
      mutate();
    } catch {}
    setActionLoading(null);
  }

  return (
    <div className="space-y-6">
      <AttentionOverview />

      <div className="card">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-navy-900 text-base">Pending Applications</h2>
            {pendingTotal > 0 && (
              <span className="badge bg-amber-100 text-amber-700">{pendingTotal} awaiting</span>
            )}
          </div>
          <Link href="/applications" className="text-xs font-semibold text-navy-600 hover:text-navy-800">
            View all →
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No pending applications. All caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pending.map((app: any) => (
              <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {(app.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-navy-900 text-sm">{app.full_name}</div>
                    <div className="text-xs text-slate-400 truncate">{app.email}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="badge bg-navy-50 text-navy-700">{app.certification?.acronym}</span>
                  <span className="text-slate-400">{formatDate(app.created_at)}</span>
                </div>
                {actionDone[app.id] ? (
                  <span className={`badge flex-shrink-0 ${actionDone[app.id] === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {actionDone[app.id] === "approved" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    {actionDone[app.id]}
                  </span>
                ) : (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleApprove(app.id)} disabled={!!actionLoading}
                      className="btn-primary !py-1.5 !px-3 !text-xs !bg-emerald-500 hover:!bg-emerald-400 disabled:opacity-50">
                      {actionLoading === app.id + "_approve" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Approve
                    </button>
                    <button onClick={() => handleReject(app.id)} disabled={!!actionLoading}
                      className="btn-outline !py-1.5 !px-3 !text-xs !text-red-600 !border-red-100 disabled:opacity-50">
                      <XCircle size={11} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Manage Users",    href: "/users",                          icon: Users,    color: "bg-blue-50 text-blue-600" },
          { label: "All Enrollments", href: "/courses?tab=enrollments",        icon: BookOpen, color: "bg-gold-50 text-gold-600" },
          { label: "Certificates",    href: "/certificates",                   icon: Award,    color: "bg-emerald-50 text-emerald-600" },
          { label: "All Applications",href: "/applications",                   icon: Clock,    color: "bg-amber-50 text-amber-600" },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={label} href={href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-sm font-semibold text-navy-900">{label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [view, setView] = useState<DashboardView>("lms");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const VIEW_LABELS: Record<DashboardView, string> = {
    lms:   "LMS Overview",
    sales: "Sales Dashboard",
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gold-600 mb-1">Admin Panel</div>
          <h1 className="text-2xl font-display font-black text-navy-900">PAII Admin Dashboard</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="btn-outline flex items-center gap-2 !py-2 !px-4"
          >
            {VIEW_LABELS[view]}
            <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 card shadow-lg z-10 overflow-hidden">
              {(Object.entries(VIEW_LABELS) as [DashboardView, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setView(key); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${
                    view === key ? "font-semibold text-navy-800 bg-navy-50" : "text-slate-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "lms" ? <LMSDashboard /> : <SalesDashboard />}
    </div>
  );
}
