"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, GraduationCap, Loader2, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-navy-100 text-navy-700",
  admin: "bg-blue-50 text-blue-700",
  professor: "bg-teal-50 text-teal-700",
  student: "bg-slate-100 text-slate-500",
};

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useSWR(
    accessToken ? [`/admin/institutions/${id}`, accessToken] : null,
    ([url, token]) => api.get<any>(url, token).then((r) => r.data ?? r),
    { revalidateOnFocus: false },
  );

  if (isLoading || !data) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={28} /></div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link href="/institutions" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 transition-colors">
        <ArrowLeft size={13} /> All Institutions
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={22} className="text-navy-700" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">{data.name}</h1>
          <p className="text-slate-500 text-sm">{data.code} · {data.status}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <p className="font-semibold text-navy-900 text-sm mb-3">Members</p>
          {data.memberships.length === 0 ? (
            <p className="text-sm text-slate-400">No members yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.memberships.map((m: any) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-navy-900">{m.user.email}</p>
                    <p className="text-xs text-slate-400">Joined {fmtDate(m.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${ROLE_COLOR[m.role] ?? "bg-slate-100 text-slate-500"}`}>{m.role}</span>
                    {m.status !== "active" && <span className="text-[10px] text-amber-600">{m.status}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <p className="font-semibold text-navy-900 text-sm mb-3">Courses</p>
          {data.courses.length === 0 ? (
            <p className="text-sm text-slate-400">No courses yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.courses.map((c: any) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-slate-300" />
                    <p className="text-sm text-navy-900">{c.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{c.visibility}</span>
                    <span className="uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{c.approval_status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
