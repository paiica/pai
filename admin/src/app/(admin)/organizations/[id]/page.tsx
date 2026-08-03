"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, Building2, Users2, UserCog, CreditCard, Mail, Calendar,
  Armchair, Loader2, AlertCircle, RefreshCw, ExternalLink, UserMinus, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}
function fmtMoney(v: number | string | null | undefined, currency = "USD") {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(n);
}
function fullName(profile: any, email: string) {
  const n = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return n || email;
}

const ENROLLMENT_STATUS_COLOR: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-100",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  suspended: "bg-red-50 text-red-700 border border-red-100",
  expired: "bg-slate-100 text-slate-500 border border-slate-200",
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  failed: "bg-red-50 text-red-700 border border-red-100",
  refunded: "bg-slate-100 text-slate-500 border border-slate-200",
  partially_refunded: "bg-amber-50 text-amber-700 border border-amber-100",
};

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) return <span className="badge bg-slate-100 text-slate-500">No expiration</span>;
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return <span className="badge bg-red-50 text-red-700 border border-red-100">Expired {fmtDate(expiresAt)}</span>;
  if (daysLeft <= 30) return <span className="badge bg-amber-50 text-amber-700 border border-amber-100">Expires {fmtDate(expiresAt)} ({daysLeft}d)</span>;
  return <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">Renews {fmtDate(expiresAt)}</span>;
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();

  const { data, isLoading, error, mutate } = useSWR(
    accessToken ? [`/admin/organizations/${id}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token),
    { revalidateOnFocus: false },
  );

  const detail = data?.data ?? data;
  const org = detail?.organization;
  const rawEmployees: any[] = detail?.employees ?? [];
  const payments: any[] = detail?.payments ?? [];
  const removals: any[] = detail?.removals ?? [];
  const removedLast30Days: number = detail?.removed_last_30_days ?? 0;
  // Churned through more distinct people in 30 days than the org has paid
  // seats for at all — the concrete signal that seat reuse might be turning
  // into an unpaid-headcount workaround rather than normal roster turnover.
  const highChurn = org && removedLast30Days > org.seats_purchased;

  // Group flat enrollment rows into one row per employee — one person can be
  // enrolled in multiple certifications through the same org.
  const employees = useMemo(() => {
    const byUser = new Map<string, { user: any; enrollments: any[] }>();
    for (const e of rawEmployees) {
      const existing = byUser.get(e.user_id);
      if (existing) existing.enrollments.push(e);
      else byUser.set(e.user_id, { user: e.user, enrollments: [e] });
    }
    return [...byUser.values()].sort(
      (a, b) => new Date(b.enrollments[0].enrolled_at).getTime() - new Date(a.enrollments[0].enrolled_at).getTime(),
    );
  }, [rawEmployees]);

  const lifetimeRevenue = payments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="p-10 text-center">
        <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        <p className="text-slate-400 text-sm mt-3">Loading organization…</p>
      </div>
    );
  }
  if (error || !org) {
    return (
      <div className="p-10 text-center">
        <AlertCircle size={28} className="text-red-300 mx-auto mb-3" />
        <p className="text-slate-600 text-sm font-semibold">Could not load organization</p>
        <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mx-auto mt-4">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <Link href="/organizations" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 transition-colors">
        <ArrowLeft size={13} /> Back to Organizations
      </Link>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-navy-100 text-navy-700 flex items-center justify-center flex-shrink-0">
            <Building2 size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-display font-black text-navy-900">{org.name}</h1>
              {expiryBadge(org.subscription_expires_at)}
            </div>
            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
              {org.contact_email && <span className="flex items-center gap-1"><Mail size={11} /> {org.contact_email}</span>}
              <span className="flex items-center gap-1"><Calendar size={11} /> Created {fmtDate(org.created_at)}</span>
            </div>
            {org.notes && <p className="text-xs text-slate-400 mt-1">{org.notes}</p>}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{detail.seats_used}/{org.seats_purchased}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Seats Used</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{org.price_per_seat ? fmtMoney(org.price_per_seat) : "—"}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Price / Seat</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{org.renewal_period_months}mo</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Renewal Period</p>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-lg font-black text-navy-900">{fmtMoney(lifetimeRevenue)}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Lifetime Revenue</p>
            </div>
          </div>
        </div>
      </div>

      {removedLast30Days > 0 && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          highChurn ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700",
        )}>
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>{removedLast30Days}</strong> employee{removedLast30Days !== 1 ? "s" : ""} removed in the last 30 days
            {highChurn && ` — more than this org's ${org.seats_purchased}-seat limit. Worth a closer look.`}
          </span>
        </div>
      )}

      {/* Org Admins */}
      <div>
        <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
          <UserCog size={16} className="text-indigo-500" /> Org Admins
        </h2>
        {org.admins.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-8 text-center text-slate-400 text-sm">
            No org admins provisioned yet.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            {org.admins.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3 border-b border-slate-50 last:border-0 text-sm">
                <span className="text-slate-700">{a.user.email}</span>
                <div className="flex items-center gap-4 text-xs text-slate-400 flex-shrink-0">
                  <span>Added {fmtDate(a.created_at)}</span>
                  <span>Last login {fmtDate(a.user.last_login_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employees */}
      <div>
        <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
          <Users2 size={16} className="text-teal-500" /> Employees ({employees.length})
        </h2>
        {employees.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-8 text-center text-slate-400 text-sm">
            No employees enrolled yet.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</div>
              <div className="flex-[1.5] text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certifications</div>
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28 text-right">Added</div>
              <div className="w-4" />
            </div>
            {employees.map(({ user, enrollments }) => (
              <Link
                key={user.id}
                href={`/students/${user.id}`}
                className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-50 last:border-0 text-sm hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 truncate">{fullName(user.profile, user.email)}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="flex-[1.5] flex flex-wrap gap-1.5">
                  {enrollments.map((e: any) => (
                    <div key={e.id} className="inline-flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-600">{e.certification.acronym}</span>
                      <span className={cn("badge", ENROLLMENT_STATUS_COLOR[e.status] ?? "bg-slate-100 text-slate-500")}>{e.status}</span>
                      <span className="text-xs text-slate-400">{e.progress_percentage ?? 0}%</span>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block text-xs text-slate-400 w-28 text-right flex-shrink-0">{fmtDate(enrollments[0].enrolled_at)}</div>
                <ExternalLink size={13} className="text-slate-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Removed Employees */}
      {removals.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
            <UserMinus size={16} className="text-slate-400" /> Removed Employees ({removals.length})
          </h2>
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-32 text-right">Account</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28 text-right">Removed</div>
            </div>
            {removals.map((r: any) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-600 truncate">{r.full_name || r.email}</p>
                  {r.full_name && <p className="text-xs text-slate-400 truncate">{r.email}</p>}
                </div>
                <div className="w-32 text-right flex-shrink-0">
                  <span className={cn("badge", r.account_deleted ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600")}>
                    {r.account_deleted ? "Deleted (unverified)" : "Kept, unenrolled"}
                  </span>
                </div>
                <div className="text-xs text-slate-400 w-28 text-right flex-shrink-0">{fmtDate(r.removed_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-black text-navy-900 uppercase tracking-widest flex items-center gap-2 mb-3">
          <CreditCard size={16} className="text-navy-500" /> Transactions
        </h2>
        {payments.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl py-8 text-center text-slate-400 text-sm">
            No payments on record. Seats set manually by staff don&apos;t generate a transaction.
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Armchair size={11} /> Description
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-right">Amount</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-right">Status</div>
              <div className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest w-28 text-right">Date</div>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 truncate">{p.description ?? "—"}</p>
                  {p.failure_reason && <p className="text-red-500 text-[11px] mt-0.5">{p.failure_reason}</p>}
                </div>
                <div className="text-slate-800 font-semibold w-24 text-right flex-shrink-0">{fmtMoney(p.amount, p.currency)}</div>
                <div className="w-24 text-right flex-shrink-0">
                  <span className={cn("badge", PAYMENT_STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-500")}>{p.status?.replace(/_/g, " ")}</span>
                </div>
                <div className="hidden md:block text-slate-400 w-28 text-right flex-shrink-0">{fmtDate(p.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
