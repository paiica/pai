"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// One-click "start over" for a course/certification builder — wipes every
// module, lesson, and quiz question so the admin can immediately re-upload
// a fresh build via Import Content. Irreversible, so it's gated behind a
// type-to-confirm modal rather than a plain confirm() popup.
export default function ClearBuildButton({
  deleteUrl, token, entityLabel, moduleCount, onCleared,
}: {
  deleteUrl: string; token: string; entityLabel: string; moduleCount: number; onCleared: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === "DELETE";

  function close() {
    if (clearing) return;
    setOpen(false);
    setConfirmText("");
  }

  async function handleClear() {
    if (!canConfirm) return;
    setClearing(true);
    try {
      await api.delete(deleteUrl, token);
      toast.success("Build cleared — ready for a fresh import");
      setOpen(false);
      setConfirmText("");
      onCleared();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to clear build");
    } finally {
      setClearing(false);
    }
  }

  if (moduleCount === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all text-sm font-medium"
      >
        <Trash2 size={14} /> Clear All Content
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={close}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-red-600" />
              </div>
              <div>
                <p className="font-bold text-navy-900">Clear the entire build?</p>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  This permanently deletes all {moduleCount} module{moduleCount !== 1 ? "s" : ""} — every lesson and
                  quiz question in <strong>{entityLabel}</strong> — with no way to undo it. Once cleared, you can use
                  Import Content to upload a fresh build.
                </p>
              </div>
            </div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "Enter" && canConfirm) handleClear();
              }}
              className="input-base mb-4"
              placeholder="DELETE"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={close} disabled={clearing} className="btn-outline !py-2 !px-4 !text-sm disabled:opacity-60">
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={!canConfirm || clearing}
                className="bg-red-600 hover:bg-red-700 text-white !py-2 !px-4 !text-sm rounded-xl font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {clearing ? "Clearing…" : "Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
