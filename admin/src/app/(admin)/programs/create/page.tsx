"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { GraduationCap, ChevronLeft, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CreateProgramPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken)!;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    short_description: "",
    level: "beginner" as typeof LEVELS[number],
    price: "0",
    duration_weeks: "",
  });

  function setField(k: string, v: string) {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "title" && f.slug === slugify(f.title)) {
        next.slug = slugify(v);
      }
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<any>("/admin/programs", {
        title: form.title,
        slug: form.slug || undefined,
        short_description: form.short_description || undefined,
        level: form.level,
        price: parseFloat(form.price) || 0,
        duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks, 10) : undefined,
      }, token);
      const program = res.data ?? res;
      toast.success("Program created — now build its curriculum");
      router.push(`/programs/${program.id}/edit`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create program");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/programs" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-3">
          <ChevronLeft size={12} /> Programs
        </Link>
        <h1 className="text-2xl font-display font-black text-navy-900 flex items-center gap-2">
          <GraduationCap size={22} className="text-navy-700" /> Create Program
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Start with the basics — you'll add courses, a capstone, and pricing details on the next screen.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            className="input-base"
            placeholder="AI Leadership Certificate Program"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slug</label>
          <input
            className="input-base"
            placeholder="ai-leadership-certificate-program"
            value={form.slug}
            onChange={(e) => setField("slug", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Short Description</label>
          <textarea
            className="input-base h-20 resize-none"
            placeholder="One or two sentences for the catalog card…"
            value={form.short_description}
            onChange={(e) => setField("short_description", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Level</label>
            <select className="input-base" value={form.level} onChange={(e) => setField("level", e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (USD)</label>
            <input
              className="input-base"
              type="number"
              min="0"
              step="0.01"
              placeholder="499.00"
              value={form.price}
              onChange={(e) => setField("price", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration (weeks)</label>
            <input
              className="input-base"
              type="number"
              min="0"
              placeholder="12"
              value={form.duration_weeks}
              onChange={(e) => setField("duration_weeks", e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null} Create Program
          </button>
          <Link href="/programs" className="btn-outline !py-2.5 !px-6 !text-sm">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
