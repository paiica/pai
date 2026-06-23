"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Edit2, Trash2, Loader2, Globe, EyeOff, FileText } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Page = {
  id: string;
  slug: string;
  title: string;
  meta_description: string;
  is_published: boolean;
  updated_at: string;
};

export default function PagesListPage() {
  const { accessToken, refreshTokens } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/pages", accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    }
  );

  const pages: Page[] = data?.data ?? data ?? [];

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [newTitle,      setNewTitle]      = useState("");
  const [newSlug,       setNewSlug]       = useState("");
  const [createOpen,    setCreateOpen]    = useState(false);

  function slugify(title: string) {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function deletePage(id: string) {
    setDeleting(true);
    try {
      await api.delete(`/pages/${id}`, accessToken!);
      toast.success("Page deleted");
      mutate();
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function createPage() {
    if (!newTitle.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const res = await api.post<any>("/pages", { title: newTitle.trim(), slug: newSlug.trim(), is_published: false }, accessToken!);
      const id  = res?.data?.id ?? res?.id;
      toast.success("Page created");
      mutate();
      setCreateOpen(false);
      setNewTitle("");
      setNewSlug("");
      if (id) window.location.href = `/pages/${id}`;
    } catch {
      toast.error("Failed to create page");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Pages</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage content pages for your site.</p>
        </div>
        <button onClick={() => setCreateOpen((v) => !v)} className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0">
          <Plus size={13} /> New Page
        </button>
      </div>

      {createOpen && (
        <div className="card p-5 mb-5 border-navy-200 bg-navy-50/30">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest mb-4">New Page</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input
                className="input-base"
                placeholder="e.g. Privacy Policy"
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); setNewSlug(slugify(e.target.value)); }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Slug <span className="text-slate-400 font-normal">(URL path)</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400 flex-shrink-0">/</span>
                <input
                  className="input-base"
                  placeholder="privacy-policy"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={createPage} disabled={creating || !newTitle.trim() || !newSlug.trim()} className="btn-primary !py-2 !px-5 !text-xs">
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create & Edit
              </button>
              <button onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        </div>
      ) : error ? (
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load pages.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : pages.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-semibold">No pages yet</p>
          <p className="text-slate-400 text-xs mt-1">Create your first page to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <div key={page.id} className="card px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-navy-900 text-sm">{page.title}</span>
                  {page.is_published ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      <Globe size={9} /> Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      <EyeOff size={9} /> Draft
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">/{page.slug}</div>
              </div>

              {confirmDelete === page.id ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-red-600 font-semibold">Delete?</span>
                  <button onClick={() => deletePage(page.id)} disabled={deleting} className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">
                    {deleting ? <Loader2 size={11} className="animate-spin" /> : "Yes"}
                  </button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors">No</button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/pages/${page.id}`} className="p-2 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </Link>
                  <button onClick={() => setConfirmDelete(page.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
