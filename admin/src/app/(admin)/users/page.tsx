"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Users, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-50 text-red-700",
  admin: "bg-purple-50 text-purple-700",
  professor: "bg-blue-50 text-blue-700",
  student: "bg-slate-100 text-slate-600",
};

export default function UsersPage() {
  const { accessToken } = useAuthStore();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const { data } = useSWR(
    accessToken ? `/users?limit=30&q=${debouncedQ}` : null,
    (url) => api.get<any>(url, accessToken!)
  );

  const users = data?.data?.data || [];
  const total = data?.data?.meta?.total || 0;

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} total accounts</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email…"
              className="input-base !pl-9"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {users.length === 0 ? (
            <div className="p-10 text-center">
              <Users size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No users found.</p>
            </div>
          ) : users.map((u: any) => (
            <div key={u.id} className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                {(u.profile?.first_name || u.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm">
                  {u.profile?.first_name} {u.profile?.last_name}
                </div>
                <div className="text-xs text-slate-400 truncate">{u.email}</div>
              </div>
              <span className={`badge flex-shrink-0 ${ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"}`}>
                {u.role}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:block">
                {formatDate(u.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
