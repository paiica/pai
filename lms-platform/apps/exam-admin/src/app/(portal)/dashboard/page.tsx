"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface RecentSession {
  id: string;
  scheduled_at: string;
  status: string;
  cert_title: string;
  booking_count: number;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "badge-blue",
  active:    "badge-green",
  completed: "badge-slate",
  cancelled: "badge-red",
};

function SessionStatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLES[status] ?? "badge-slate"}`}>
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1.5">{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { accessToken, user } = useAuthStore();
  const [recent, setRecent] = useState<RecentSession[]>([]);
  const [all, setAll] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const r = await api.get<any>("/exam-sessions/admin", accessToken!);
        const sessions: RecentSession[] = (r.data ?? r).map((s: any) => ({
          ...s,
          cert_title: s.certification?.title ?? s.cert_title ?? "Unknown",
          booking_count: s._count?.bookings ?? s.booking_count ?? 0,
        }));
        setAll(sessions);
        setRecent(sessions.slice(0, 6));
      } catch {}
      setLoading(false);
    }
    load();
  }, [accessToken]);

  const now = new Date();
  const upcoming = all.filter(
    (s) => s.status === "scheduled" && new Date(s.scheduled_at) > now
  ).length;
  const active = all.filter((s) => s.status === "active").length;
  const completed = all.filter((s) => s.status === "completed").length;

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.profile?.first_name ?? user?.email?.split("@")[0] ?? "Admin";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}</h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value={loading ? "—" : all.length}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          color="bg-brand-950/60 text-brand-400 border border-brand-900/50"
        />
        <StatCard
          label="Upcoming"
          value={loading ? "—" : upcoming}
          sub="scheduled ahead"
          icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          color="bg-blue-950/60 text-blue-400 border border-blue-900/50"
        />
        <StatCard
          label="Active Now"
          value={loading ? "—" : active}
          icon="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M8.464 15.536a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M12 12h.01"
          color="bg-emerald-950/60 text-emerald-400 border border-emerald-900/50"
        />
        <StatCard
          label="Completed"
          value={loading ? "—" : completed}
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          color="bg-slate-800/60 text-slate-400 border border-slate-700/50"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              href: "/sessions",
              title: "Schedule Session",
              desc: "Set up a new proctored exam",
              icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
              iconBg: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
              iconColor: "text-blue-300",
              hoverStyle: { boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.20)" },
            },
            {
              href: "/certifications",
              title: "Manage Exams",
              desc: "Build question banks and structured exams",
              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
              iconBg: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
              iconColor: "text-brand-200",
              hoverStyle: { boxShadow: "inset 0 0 0 1px rgba(99,102,232,0.20)" },
            },
            {
              href: "/results",
              title: "View Results",
              desc: "Scores and proctor events",
              icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
              iconBg: "linear-gradient(135deg, #064e3b 0%, #065f46 100%)",
              iconColor: "text-emerald-300",
              hoverStyle: { boxShadow: "inset 0 0 0 1px rgba(16,185,129,0.20)" },
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card p-5 flex items-start gap-4 transition-all hover:bg-slate-800/50 group"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.iconColor}`}
                style={{ background: item.iconBg }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm">{item.title}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Sessions</h2>
          <Link href="/sessions" className="text-brand-400 hover:text-brand-300 text-xs font-medium transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-16 animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-slate-500 text-sm">No sessions yet.</p>
            <Link href="/sessions" className="inline-flex items-center gap-1.5 mt-3 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
              Schedule your first session →
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-slate-800/80">
            {recent.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.cert_title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {new Date(s.scheduled_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {s.booking_count > 0 && ` · ${s.booking_count} student${s.booking_count !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <SessionStatusBadge status={s.status} />
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
