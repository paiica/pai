"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  X, Search, Loader2, Send, CheckCircle2, Users2, Copy, Linkedin, Twitter, Facebook, Mail, MessageCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data);
}

const STATUS_LABEL: Record<string, string> = {
  invited: "invited",
  already_pending: "already pending",
  already_accepted: "already accepted (skipped)",
};

export function ShareCourseModal({
  courseId, courseTitle, onClose, mode = "share", itemType = "course", itemUrl,
}: {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  mode?: "share" | "recommend";
  itemType?: "course" | "certification" | "program";
  itemUrl?: string;
}) {
  const token = useAuthStore((s) => s.accessToken)!;
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<{ student_id: string; email: string; status: string }[] | null>(null);
  const [confirming, setConfirming] = useState(false);

  const { data: students, isLoading } = useSWR(
    [`/prof/students${q ? `?q=${encodeURIComponent(q)}` : ""}`, token],
    ([url, t]) => fetcher(url, t)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set((students ?? []).map((s: any) => s.id)));
  }

  function handleCopyLink() {
    if (!itemUrl) return;
    navigator.clipboard.writeText(itemUrl)
      .then(() => toast.success("Link copied"))
      .catch(() => toast.error("Could not copy link"));
  }

  const itemLabel = itemType === "certification" ? "certification" : itemType === "program" ? "program" : "course";
  const shareText = `Check out this ${itemLabel}: ${courseTitle}`;
  const socialLinks = itemUrl ? [
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(itemUrl)}` },
    { label: "X / Twitter", icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(itemUrl)}&text=${encodeURIComponent(shareText)}` },
    { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(itemUrl)}` },
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${itemUrl}`)}` },
    { label: "Email", icon: Mail, href: `mailto:?subject=${encodeURIComponent(`Recommendation: ${courseTitle}`)}&body=${encodeURIComponent(`${shareText}\n\n${itemUrl}`)}` },
  ] : [];

  async function handleSend() {
    setSending(true);
    try {
      const endpoint = itemType === "certification"
        ? `/prof/certifications/${courseId}/recommendations`
        : itemType === "program"
        ? `/prof/programs/${courseId}/recommendations`
        : `/prof/courses/${courseId}/invitations`;
      const r = await api.post<any>(endpoint, { student_ids: [...selected] }, token);
      setResults(r.data.results);
      toast.success(itemType === "course" ? "Invitations sent" : "Recommendations sent");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-display font-black text-navy-900 text-lg">
            {mode === "recommend" ? "Recommend to Students" : "Share with Students"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className={cn("text-sm text-slate-500 truncate", mode === "recommend" ? "mb-1" : "mb-5")}>{courseTitle}</p>
        {mode === "recommend" && (
          <p className="text-xs text-slate-400 mb-4">
            {itemType === "certification"
              ? "Your students will see this as your certification recommendation."
              : "Your students will see this as your recommendation."}
          </p>
        )}

        {mode === "recommend" && itemUrl && (
          <div className="mb-5 p-3 rounded-xl border border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 mb-2">{itemType === "certification" ? "Certification link" : itemType === "program" ? "Program link" : "Course link"}</p>
            <div className="flex items-center gap-2 mb-3">
              <input
                readOnly
                value={itemUrl}
                onFocus={(e) => e.target.select()}
                className="input-base !text-xs !py-2 flex-1 truncate"
              />
              <button onClick={handleCopyLink} className="btn-outline !px-3 !py-2 text-xs flex-shrink-0">
                <Copy size={13} /> Copy
              </button>
            </div>
            <div className="flex items-center gap-2">
              {socialLinks.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Share on ${label}`}
                  className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-navy-700 hover:border-navy-300 transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
        )}

        {results ? (
          <div>
            <ul className="space-y-2 mb-5">
              {results.map((r) => (
                <li key={r.student_id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700">{r.email}</span>
                  <span className="text-xs text-slate-400">{STATUS_LABEL[r.status] ?? r.status}</span>
                </li>
              ))}
            </ul>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : confirming ? (
          <div>
            <p className="text-sm text-navy-900 mb-5">
              {mode === "recommend"
                ? <>You are about to recommend <strong>{courseTitle}</strong> to <strong>{selected.size}</strong> student{selected.size !== 1 ? "s" : ""}.</>
                : <>You are about to invite <strong>{selected.size}</strong> student{selected.size !== 1 ? "s" : ""} to join <strong>{courseTitle}</strong>.</>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirming(false)} className="btn-outline flex-1 justify-center">Back</button>
              <button onClick={handleSend} disabled={sending} className="btn-primary flex-1 justify-center disabled:opacity-60">
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? "Sending…" : "Confirm & Send"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search students…"
                  className="input-base !pl-9 text-sm"
                />
              </div>
              <button onClick={selectAll} className="text-xs font-semibold text-navy-600 hover:underline whitespace-nowrap">
                Select all
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 mb-5 min-h-[120px]">
              {isLoading ? (
                <div className="p-6 text-center text-sm text-slate-400">Loading…</div>
              ) : !students || students.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">
                  <Users2 size={24} className="mx-auto mb-2 text-slate-300" />
                  No students in your roster yet.
                </div>
              ) : (
                students.map((s: any) => {
                  const name = `${s.first_name} ${s.last_name}`.trim() || s.email;
                  const checked = selected.has(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(s.id)}
                        className="w-4 h-4 rounded border-slate-300 text-navy-700 accent-navy-700 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-900 truncate">{name}</p>
                        <p className="text-xs text-slate-400 truncate">{s.email}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setConfirming(true)}
              disabled={selected.size === 0}
              className="btn-primary w-full justify-center disabled:opacity-40"
            >
              <Send size={15} /> {mode === "recommend" ? "Recommend to" : "Invite"} {selected.size > 0 ? selected.size : ""} Student{selected.size !== 1 ? "s" : ""}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
