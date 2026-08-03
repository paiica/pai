"use client";

import useSWR from "swr";
import Link from "next/link";
import { Users2, UserCheck, UserPlus, Armchair, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import KPICard from "@/components/ui/KPICard";
import type { OrgDashboard, OrgBilling } from "@/types";

export default function DashboardPage() {
  const { accessToken, user } = useAuthStore();

  const { data, isLoading } = useSWR(
    accessToken ? ["/org/dashboard", accessToken] : null,
    ([url, token]) => api.get<OrgDashboard>(url, token),
  );

  const { data: billing } = useSWR(
    accessToken ? ["/org/billing", accessToken] : null,
    ([url, token]) => api.get<OrgBilling>(url, token),
  );

  const completed = data?.status_counts.find((s) => s.status === "completed")?.count ?? 0;
  const active = data?.status_counts.find((s) => s.status === "active")?.count ?? 0;

  const daysLeft = billing?.subscription_expires_at
    ? Math.ceil((new Date(billing.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showExpiryBanner = billing?.is_expired || (daysLeft !== null && daysLeft <= 30);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl font-display font-black text-navy-900">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ""}
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">{user?.organization_name}&apos;s certification overview</p>
      </div>

      {showExpiryBanner && (
        <Link
          href="/billing"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
            billing?.is_expired
              ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
          }`}
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          {billing?.is_expired
            ? "Your subscription has expired — new employee invites are blocked until you renew."
            : `Your subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"} — renew to avoid interruption.`}
          <span className="ml-auto underline">Go to Billing →</span>
        </Link>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-28 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Seats Purchased" value={String(data?.seats_purchased ?? 0)} icon={Armchair} accent="gold" />
          <KPICard title="Seats Used" value={String(data?.seats_used ?? 0)} icon={Users2} accent="blue" />
          <KPICard title="Seats Available" value={String(data?.seats_available ?? 0)} icon={UserPlus} accent="emerald" />
          <KPICard title="Completed" value={String(completed)} icon={UserCheck} accent="purple" changeLabel={`${active} in progress`} />
        </div>
      )}

      <div className="card p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="font-semibold text-navy-900 mb-1">Ready to add more employees?</p>
          <p className="text-sm text-slate-500">Bulk-invite your team into one or more certifications.</p>
        </div>
        <Link href="/employees/invite" className="btn-primary">
          <UserPlus size={16} /> Invite Employees
        </Link>
      </div>
    </div>
  );
}
