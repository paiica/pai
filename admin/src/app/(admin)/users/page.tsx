"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Users, Search, Download, MoreHorizontal, Shield, Ban, KeyRound,
  Trash2, Check, ChevronLeft, ChevronRight, Loader2, UserCheck, X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

// ── Config ────────────────────────────────────────────────────────────────────

const ROLES = ["student", "professor", "admin", "super_admin"] as const;
type RoleKey = typeof ROLES[number];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  professor:   "Professor",
  student:     "Student",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  admin:       "bg-purple-100 text-purple-700",
  professor:   "bg-blue-100 text-blue-700",
  student:     "bg-slate-100 text-slate-600",
};

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country: string | null;
  date_of_birth: string | null;
}

const LIMIT = 25;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function fullName(u: User) {
  const n = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return n || u.email;
}

function initial(u: User) {
  return (u.first_name || u.email).charAt(0).toUpperCase();
}

// Three-state checkbox (supports indeterminate)
function Checkbox({ checked, indeterminate, onChange, className = "" }: {
  checked: boolean; indeterminate?: boolean; onChange: () => void; className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className={`w-4 h-4 rounded border-slate-300 text-navy-700 accent-navy-700 cursor-pointer ${className}`}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { accessToken } = useAuthStore();

  // Filters & pagination
  const [q, setQ]                 = useState("");
  const [debouncedQ, setDQ]       = useState("");
  const [roleFilter, setRole]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [page, setPage]           = useState(1);

  // Per-row actions
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
  const [roleModal, setRoleModal]     = useState<User | null>(null);
  const [newRole, setNewRole]         = useState<string>("");
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [acting, setActing]           = useState(false);
  const [exporting, setExporting]     = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [bulkRoleModal, setBulkRoleModal] = useState(false);
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkRole, setBulkRole]           = useState<string>("");
  const [bulkActing, setBulkActing]       = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDQ(q); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [roleFilter, statusFilter]);

  // Clear selection on any filter/page change
  useEffect(() => { setSelectedIds(new Set()); }, [page, roleFilter, statusFilter, debouncedQ]);

  const qs = new URLSearchParams({ limit: String(LIMIT), page: String(page) });
  if (debouncedQ)  qs.set("q", debouncedQ);
  if (roleFilter)  qs.set("role", roleFilter);
  if (statusFilter) qs.set("status", statusFilter);

  const { data, mutate, isLoading } = useSWR(
    accessToken ? [`/users?${qs}`, accessToken] : null,
    ([url, t]) => api.get<any>(url, t),
  );

  const users: User[] = (data as any)?.data?.data ?? [];
  const meta          = (data as any)?.data?.meta ?? { total: 0, totalPages: 1 };

  // Bulk selection computed
  const allSelected  = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = !allSelected && users.some((u) => selectedIds.has(u.id));
  const selectedCount = selectedIds.size;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => new Set([...prev, ...users.map((u) => u.id)]));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  async function handleExport() {
    setExporting(true);
    try {
      const exportQs = new URLSearchParams();
      if (debouncedQ)  exportQs.set("q", debouncedQ);
      if (roleFilter)  exportQs.set("role", roleFilter);
      if (statusFilter) exportQs.set("status", statusFilter);
      const res = await fetch(`${API_BASE}/users/export?${exportQs}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  // ── Single-user actions ────────────────────────────────────────────────────
  async function handleRoleChange() {
    if (!roleModal || !newRole || newRole === roleModal.role) return;
    setActing(true);
    try {
      await api.patch(`/users/${roleModal.id}/role`, { role: newRole }, accessToken!);
      toast.success("Role updated");
      setRoleModal(null);
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setActing(false); }
  }

  async function toggleActive(u: User) {
    setActing(true); setOpenMenu(null);
    try {
      await api.patch(`/users/${u.id}/${u.is_active ? "deactivate" : "activate"}`, {}, accessToken!);
      toast.success(u.is_active ? "Access disabled" : "Access enabled");
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setActing(false); }
  }

  async function requireReset(u: User) {
    setOpenMenu(null); setActing(true);
    try {
      await api.post(`/users/${u.id}/require-password-reset`, {}, accessToken!);
      toast.success(`Reset email sent to ${u.email}`);
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setActing(false); }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setActing(true);
    try {
      await api.delete(`/users/${deleteModal.id}`, accessToken!);
      toast.success("User deleted");
      setDeleteModal(null);
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Cannot delete — user may have enrollments or certificates"); }
    finally { setActing(false); }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  async function bulkActivate() {
    setBulkActing(true);
    try {
      const r = await api.patch<any>("/users/bulk/activate", { ids: [...selectedIds] }, accessToken!);
      toast.success(`${(r as any)?.data?.updated ?? selectedCount} users enabled`);
      setSelectedIds(new Set()); mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBulkActing(false); }
  }

  async function bulkDeactivate() {
    setBulkActing(true);
    try {
      const r = await api.patch<any>("/users/bulk/deactivate", { ids: [...selectedIds] }, accessToken!);
      toast.success(`${(r as any)?.data?.updated ?? selectedCount} users disabled`);
      setSelectedIds(new Set()); mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBulkActing(false); }
  }

  async function bulkReset() {
    setBulkActing(true);
    try {
      const r = await api.post<any>("/users/bulk/require-password-reset", { ids: [...selectedIds] }, accessToken!);
      toast.success(`Reset emails sent to ${(r as any)?.data?.sent ?? selectedCount} users`);
      setSelectedIds(new Set());
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBulkActing(false); }
  }

  async function handleBulkRoleChange() {
    if (!bulkRole) return;
    setBulkActing(true);
    try {
      const r = await api.patch<any>("/users/bulk/role", { ids: [...selectedIds], role: bulkRole }, accessToken!);
      toast.success(`Role updated for ${(r as any)?.data?.updated ?? selectedCount} users`);
      setBulkRoleModal(false); setSelectedIds(new Set()); mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
    finally { setBulkActing(false); }
  }

  async function handleBulkDelete() {
    setBulkActing(true);
    try {
      const r = await api.delete<any>("/users/bulk", accessToken!, { ids: [...selectedIds] });
      toast.success(`${(r as any)?.data?.deleted ?? selectedCount} users deleted`);
      setBulkDeleteModal(false); setSelectedIds(new Set()); mutate();
    } catch (e: any) { toast.error(e.message ?? "Some users could not be deleted — they may have enrollments"); }
    finally { setBulkActing(false); }
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">{meta.total} accounts in the system</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-outline disabled:opacity-60">
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="input-base !pl-9 !py-2 text-sm"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRole(e.target.value)} className="input-base !py-2 text-sm !w-auto">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="input-base !py-2 text-sm !w-auto">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Country</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Date of Birth</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Registered</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-slate-100 rounded animate-pulse" style={{ width: `${55 + (j * 17) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Users size={28} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No users found.</p>
                  </td>
                </tr>
              ) : users.map((u) => {
                const isSelected = selectedIds.has(u.id);
                return (
                  <tr
                    key={u.id}
                    onClick={() => toggleOne(u.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected ? "bg-navy-50" : "hover:bg-slate-50/60"
                    } ${!u.is_active ? "opacity-50" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <Checkbox checked={isSelected} onChange={() => toggleOne(u.id)} />
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-navy-800 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                          {initial(u)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-navy-900 text-sm truncate max-w-[160px]">{fullName(u)}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{u.country || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden xl:table-cell">
                      {u.date_of_birth ? new Date(u.date_of_birth).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden xl:table-cell">{fmtDate(u.last_login_at)}</td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Row actions */}
                    <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === u.id && (
                        <div className="absolute right-4 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1.5 text-sm">
                          <button onClick={() => { setRoleModal(u); setNewRole(u.role); setOpenMenu(null); }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-slate-50 text-slate-700">
                            <Shield size={14} className="text-purple-500 shrink-0" /> Change Role
                          </button>
                          <button onClick={() => toggleActive(u)}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-slate-50 text-slate-700">
                            {u.is_active
                              ? <Ban size={14} className="text-amber-500 shrink-0" />
                              : <UserCheck size={14} className="text-emerald-500 shrink-0" />}
                            {u.is_active ? "Disable Access" : "Enable Access"}
                          </button>
                          <button onClick={() => requireReset(u)}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-slate-50 text-slate-700">
                            <KeyRound size={14} className="text-blue-500 shrink-0" /> Require Password Reset
                          </button>
                          <div className="mx-3 my-1 border-t border-slate-100" />
                          <button onClick={() => { setDeleteModal(u); setOpenMenu(null); }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2 text-left hover:bg-slate-50 text-red-600">
                            <Trash2 size={14} className="shrink-0" /> Delete User
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">Page {page} of {meta.totalPages} · {meta.total} users</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="btn-outline !px-2 !py-1.5 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
                className="btn-outline !px-2 !py-1.5 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Click-away for row menus */}
      {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}

      {/* ── Bulk Action Bar ────────────────────────────────────────────────────── */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-navy-900 text-white rounded-2xl shadow-2xl px-4 py-2.5 flex-wrap max-w-[calc(100vw-48px)]">
          <span className="text-sm font-semibold text-white/80 pr-1">
            {selectedCount} selected
          </span>
          <div className="w-px h-5 bg-white/20 mx-1" />

          <button
            onClick={() => { setBulkRole(""); setBulkRoleModal(true); }}
            disabled={bulkActing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <Shield size={13} /> Change Role
          </button>

          <button
            onClick={bulkActivate}
            disabled={bulkActing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 text-emerald-300"
          >
            <UserCheck size={13} /> Enable
          </button>

          <button
            onClick={bulkDeactivate}
            disabled={bulkActing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 text-amber-300"
          >
            <Ban size={13} /> Disable
          </button>

          <button
            onClick={bulkReset}
            disabled={bulkActing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 text-blue-300"
          >
            <KeyRound size={13} /> Send Reset
          </button>

          <button
            onClick={() => setBulkDeleteModal(true)}
            disabled={bulkActing}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 text-red-300"
          >
            <Trash2 size={13} /> Delete
          </button>

          {bulkActing && <Loader2 size={14} className="animate-spin text-white/60" />}

          <div className="w-px h-5 bg-white/20 mx-1" />

          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors px-1"
          >
            <X size={13} /> Clear
          </button>
        </div>
      )}

      {/* ── Single-user Role Modal ─────────────────────────────────────────────── */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Change Role</h3>
            <p className="text-sm text-slate-500 mb-5 truncate">{roleModal.email}</p>
            <RoleSelector value={newRole} onChange={setNewRole} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setRoleModal(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={handleRoleChange} disabled={acting || newRole === roleModal.role}
                className="btn-primary flex-1 justify-center disabled:opacity-60">
                {acting && <Loader2 size={15} className="animate-spin" />} Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Role Modal ────────────────────────────────────────────────────── */}
      {bulkRoleModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Change Role</h3>
            <p className="text-sm text-slate-500 mb-5">Apply to {selectedCount} selected users</p>
            <RoleSelector value={bulkRole} onChange={setBulkRole} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setBulkRoleModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
              <button onClick={handleBulkRoleChange} disabled={bulkActing || !bulkRole}
                className="btn-primary flex-1 justify-center disabled:opacity-60">
                {bulkActing && <Loader2 size={15} className="animate-spin" />} Apply to {selectedCount}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single-user Delete Modal ───────────────────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Delete User?</h3>
            <p className="text-sm text-slate-600 mb-3">
              Permanently delete <strong>{fullName(deleteModal)}</strong>?
            </p>
            <DeleteWarning />
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="btn-outline flex-1 justify-center">Cancel</button>
              <DangerButton onClick={handleDelete} loading={acting} label="Delete" />
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Modal ──────────────────────────────────────────────────── */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-display font-black text-navy-900 text-lg mb-1">Delete {selectedCount} Users?</h3>
            <p className="text-sm text-slate-600 mb-3">
              This will permanently delete all {selectedCount} selected accounts and their data.
            </p>
            <DeleteWarning />
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
              <DangerButton onClick={handleBulkDelete} loading={bulkActing} label={`Delete ${selectedCount}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleSelector({ value, onChange }: { value: string; onChange: (r: string) => void }) {
  return (
    <div className="space-y-2">
      {ROLES.map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
            value === r ? "border-navy-700 bg-navy-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
            {value === r && <Check size={14} className="text-navy-700" />}
          </div>
          <div>
            <span className={`text-sm font-semibold ${value === r ? "text-navy-900" : "text-slate-700"}`}>
              {ROLE_LABELS[r]}
            </span>
            {r === "super_admin" && (
              <span className="ml-2 text-[10px] text-red-500 font-semibold">Full access</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

function DeleteWarning() {
  return (
    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-5">
      <p className="text-xs text-amber-700 font-medium">
        Users with enrollments or certificates cannot be deleted. Disable their access instead.
      </p>
    </div>
  );
}

function DangerButton({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-60">
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      {label}
    </button>
  );
}
