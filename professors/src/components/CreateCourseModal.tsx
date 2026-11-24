"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { X, Loader2, Plus, GraduationCap } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

interface MyInstitution {
  institution: { id: string; name: string; code: string };
  role: string;
}
interface Term {
  id: string; name: string; status: "upcoming" | "active" | "completed";
}

export function CreateCourseModal({ onClose }: { onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken)!;
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [level, setLevel] = useState("beginner");
  const [institutionId, setInstitutionId] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [termId, setTermId] = useState("");
  const [saving, setSaving] = useState(false);

  // Only fetched/shown for professors who actually belong to an institution
  // — an independent professor sees exactly the same modal as before.
  const { data: myInstitutions } = useSWR(
    token ? ["/me/institutions", token] : null,
    ([url, t]) => api.get<any>(url, t).then((r): MyInstitution[] => r.data ?? r),
  );

  const { data: terms } = useSWR(
    token && institutionId ? [`/institutions/${institutionId}/terms`, token] : null,
    ([url, t]) => api.get<any>(url, t).then((r): Term[] => r.data ?? r),
  );

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const r = await api.post<any>(
        "/prof/courses",
        {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          price: price ? Number(price) : 0,
          level,
          institution_id: institutionId || undefined,
          visibility: institutionId ? visibility : undefined,
          term_id: institutionId && termId ? termId : undefined,
        },
        token
      );
      toast.success("Course created");
      router.push(`/courses/${r.data.id}/builder`);
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create course");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display font-black text-navy-900 text-lg">Create a Course</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          New courses stay private until you submit them for PAII approval.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prompt Engineering Fundamentals"
              className="input-base text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Subtitle</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="A short one-liner"
              className="input-base text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will students learn?"
              className="input-base text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Price (USD)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-base text-sm"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {myInstitutions && myInstitutions.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1.5">
                <GraduationCap size={13} /> Institution (optional)
              </label>
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="input-base text-sm"
              >
                <option value="">None — independent course</option>
                {myInstitutions.map((m) => (
                  <option key={m.institution.id} value={m.institution.id}>{m.institution.name}</option>
                ))}
              </select>
              {institutionId && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={visibility === "private"} onChange={() => setVisibility("private")} />
                    Private — this institution's students only
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                    Public — submit to PAII marketplace
                  </label>
                </div>
              )}
              {institutionId && terms && terms.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Academic Term (optional)</label>
                  <select value={termId} onChange={(e) => setTermId(e.target.value)} className="input-base text-sm">
                    <option value="">No specific term</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} {t.status === "active" ? "(active)" : t.status === "upcoming" ? "(upcoming)" : "(completed)"}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={saving || !title.trim()}
          className="btn-primary w-full justify-center mt-6 disabled:opacity-40"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {saving ? "Creating…" : "Create & Continue to Builder"}
        </button>
      </div>
    </div>
  );
}
