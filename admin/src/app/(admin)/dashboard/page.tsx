"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Users, BookOpen, Award, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AdminDashboard() {
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
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="text-xs font-bold uppercase tracking-widest text-gold-600 mb-1">Admin Panel</div>
        <h1 className="text-2xl font-display font-black text-navy-900">PAI Admin Dashboard</h1>
      </div>

      <div className="card mb-6">
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
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={!!actionLoading}
                      className="btn-primary !py-1.5 !px-3 !text-xs !bg-emerald-500 hover:!bg-emerald-400 disabled:opacity-50"
                    >
                      {actionLoading === app.id + "_approve" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={!!actionLoading}
                      className="btn-outline !py-1.5 !px-3 !text-xs !text-red-600 !border-red-100 disabled:opacity-50"
                    >
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
          { label: "Manage Users", href: "/users", icon: Users, color: "bg-blue-50 text-blue-600" },
          { label: "All Enrollments", href: "/courses?tab=enrollments", icon: BookOpen, color: "bg-gold-50 text-gold-600" },
          { label: "Certificates", href: "/certificates", icon: Award, color: "bg-emerald-50 text-emerald-600" },
          { label: "All Applications", href: "/applications", icon: Clock, color: "bg-amber-50 text-amber-600" },
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
