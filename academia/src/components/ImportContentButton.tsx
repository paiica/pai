"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Upload, X, Loader2, CheckCircle2, AlertTriangle, Palette, Puzzle, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

type ImportResult = {
  modules_created: number;
  lessons_created: number;
  questions_created: number;
  images_uploaded: number;
  flagged: string[];
};

type ImportMode = "preserve" | "decompose" | "scorm";

const MODES: { value: ImportMode; label: string; desc: string; icon: typeof Palette }[] = [
  {
    value: "preserve",
    label: "Preserve Original Design",
    desc: "Same look, colors, and interactions as the uploaded course — shown as one embedded lesson.",
    icon: Palette,
  },
  {
    value: "decompose",
    label: "Decompose into Editable Lessons",
    desc: "Rebuilt as separate, per-lesson content you can edit here afterward.",
    icon: Puzzle,
  },
  {
    value: "scorm",
    label: "SCORM Package",
    desc: "For SCORM 1.2 exports (Storyline, Captivate, iSpring). Preserves the original package and tracks completion and score.",
    icon: PackageCheck,
  },
];

// Drop-in "Import Content" entry point for a course/certification builder —
// uploads an Articulate Rise 360 export (.zip) to a backend endpoint that
// creates real Module/Lesson/QuizQuestion rows via the same service methods
// manual building uses, so the result is fully editable afterward in the
// same builder. Uses raw fetch (not the shared `api` helper) since this is a
// multipart upload, not a JSON request — same pattern as the AI
// document-extraction upload elsewhere in the builder.
export default function ImportContentButton({
  uploadUrl, token, onImported,
}: {
  uploadUrl: string;
  token: string;
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("preserve");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      // Raw fetch (needed for multipart upload) doesn't get the shared
      // `api` helper's automatic refresh-and-retry on an expired access
      // token — a real gap, since re-hosting a whole course's worth of
      // files can easily outlast a 15-minute-old token. Mirror that same
      // refresh-then-retry-once pattern here instead of just failing.
      let activeToken = token;
      let res = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
        body: formData,
      });

      if (res.status === 401) {
        const refreshed = await useAuthStore.getState().refreshTokens();
        if (!refreshed) throw new Error("Your session has expired — please log in again.");
        activeToken = useAuthStore.getState().accessToken!;
        res = await fetch(uploadUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${activeToken}` },
          body: formData,
        });
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message ?? `Import failed: ${res.status}`);
      const imported: ImportResult = data?.data ?? data;
      setResult(imported);
      onImported();
      toast.success(`Imported ${imported.modules_created} modules, ${imported.lessons_created} lessons`);
    } catch (err: any) {
      toast.error(err?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function close() {
    setOpen(false);
    setFile(null);
    setResult(null);
  }

  // Escape-to-close, since a long flagged list can push a mouse-only close
  // target out of easy reach on some layouts.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-slate-200 hover:border-navy-300 text-sm text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all"
      >
        <Upload size={14} /> Import Content
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          {/* Fixed max-height with the body scrolling internally — the header
              (close button) and footer (action button) always stay reachable
              no matter how long the flagged-items list gets. */}
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <p className="font-bold text-navy-900">Import Content</p>
              <button onClick={close} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 overflow-y-auto flex-1 min-h-0">
              {!result ? (
                <>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Upload an Articulate Rise 360 export or a SCORM 1.2 package (.zip). For Rise
                    exports, multiple-choice quiz questions always import as real graded
                    questions — anything the platform can&apos;t auto-grade (matching,
                    multi-select, fill-in-the-blank) is added as readable review content instead
                    of being dropped.
                  </p>

                  <div className="space-y-2 mb-4">
                    {MODES.map((m) => {
                      const selected = mode === m.value;
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMode(m.value)}
                          className={cn(
                            "w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left",
                            selected ? "border-navy-700 bg-navy-50" : "border-slate-200 bg-white hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            selected ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className={cn("text-sm font-semibold", selected ? "text-navy-900" : "text-slate-700")}>
                              {m.label}{m.value === "preserve" && <span className="ml-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Recommended</span>}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <label className={cn(
                    "flex items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm",
                    file ? "border-navy-300 bg-navy-50" : "border-slate-200 hover:border-navy-300 hover:bg-slate-50"
                  )}>
                    {file
                      ? <span className="text-navy-700 font-medium px-4 text-center break-all">{file.name}</span>
                      : <span className="text-slate-400">Click to choose a .zip file</span>}
                    <input
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3 text-emerald-700">
                    <CheckCircle2 size={18} className="flex-shrink-0" />
                    <p className="text-sm font-semibold">
                      {result.modules_created} modules, {result.lessons_created} lessons,{" "}
                      {result.questions_created} questions, {result.images_uploaded} files
                    </p>
                  </div>
                  {result.flagged.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-xs mb-2">
                        <AlertTriangle size={13} /> Review recommended
                      </div>
                      <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                        {result.flagged.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 pt-4 flex-shrink-0">
              {!result ? (
                <button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="w-full btn-primary !py-2.5 !text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {importing ? "Importing…" : "Import"}
                </button>
              ) : (
                <button onClick={close} className="w-full btn-primary !py-2.5 !text-sm">Done</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
