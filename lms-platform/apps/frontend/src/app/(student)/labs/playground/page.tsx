"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { ArrowLeft, Play, Square, Loader2, Plus, Trash2, Globe, Cloud, FlaskConical, Sparkles, Lock } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { createPyodideInterpreter, runPyodideCell, type CellOutput } from "@/lib/lab-runtime";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Runtime = "pyodide" | "e2b";
type Cell = { id: number; code: string; output?: CellOutput };
type SandboxAccess = { hasAccess: boolean; expiresAt: string | null; cancelAtPeriodEnd: boolean };

let nextCellId = 1;

// Cache the loaded Stripe.js instance per publishable key so re-renders
// don't re-fetch/re-init the SDK — same pattern as the marketing site's
// event-checkout embed.
const stripePromises = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string) {
  if (!stripePromises.has(publishableKey)) {
    stripePromises.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromises.get(publishableKey)!;
}

// A blank sandbox with no lesson/course attached — just a place for a
// student to try things out. Unlike a lesson lab, cells here are entirely
// student-created (add/remove freely) and nothing is graded, saved, or fed
// into course progress; it's a scratchpad, reset each time you start fresh.
//
// The in-browser (Pyodide) runtime is unrestricted for everyone. The cloud
// (E2B) runtime is a paid add-on here — course-lesson labs that require E2B
// stay unrestricted since those are already covered by course enrollment;
// this gate applies only to this standalone Playground.
export default function LabPlaygroundPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.accessToken) ?? "";

  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState<Runtime | null>(null);
  const [cells, setCells] = useState<Cell[]>([{ id: nextCellId++, code: "" }]);
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const pyodideRef = useRef<any>(null);
  const anyCellRunning = Object.values(running).some(Boolean);

  const [access, setAccess] = useState<SandboxAccess | null>(null);
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [updatingSub, setUpdatingSub] = useState(false);

  async function loadAccess() {
    if (!token) return;
    try {
      const res: any = await api.get<any>("/labs/playground/sandbox-access", token);
      setAccess(res.data ?? res);
    } catch { /* treat as no access */ }
  }

  useEffect(() => {
    loadAccess();
    if (searchParams.get("sandbox_unlocked") === "1") {
      toast.success("Cloud Sandbox subscription active");
      router.replace("/labs/playground");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function unlockSandbox() {
    setUnlocking(true);
    try {
      const res: any = await api.post<any>("/payments/lab-sandbox-checkout", {}, token);
      const data = res.data ?? res;
      if (data?.client_secret && data?.publishable_key) {
        setCheckout({ clientSecret: data.client_secret, publishableKey: data.publishable_key });
      } else {
        throw new Error("Failed to start checkout");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start checkout");
    } finally {
      setUnlocking(false);
    }
  }

  async function cancelSubscription() {
    if (!confirm("Stop auto-renewal? You'll keep Cloud Sandbox access until the end of the current billing period.")) return;
    setUpdatingSub(true);
    try {
      await api.post<any>("/payments/lab-sandbox-subscription/cancel", {}, token);
      toast.success("Auto-renewal turned off");
      await loadAccess();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to cancel");
    } finally {
      setUpdatingSub(false);
    }
  }

  async function resumeSubscription() {
    setUpdatingSub(true);
    try {
      await api.post<any>("/payments/lab-sandbox-subscription/resume", {}, token);
      toast.success("Auto-renewal resumed");
      await loadAccess();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to resume");
    } finally {
      setUpdatingSub(false);
    }
  }

  async function start(chosen: Runtime) {
    setStarting(chosen);
    try {
      if (chosen === "pyodide") {
        // Preloads a broad, commonly-used set up front (numpy/matplotlib/
        // pandas/scikit-learn/scipy/sympy/networkx/pillow) since a
        // playground's cells don't exist yet at start time to detect
        // imports from — a one-time slightly heavier download in exchange
        // for not needing to guess what a student will type.
        pyodideRef.current = await createPyodideInterpreter([
          { type: "code", content: "import numpy, matplotlib, pandas, sklearn, scipy, sympy, networkx, PIL" },
        ]);
        setSessionId("pyodide-local");
        setRuntime("pyodide");
        toast.success("Python runtime ready — runs entirely in your browser");
        return;
      }
      const res: any = await api.post<any>("/labs/playground/session", {}, token);
      const data = res.data ?? res;
      setSessionId(data.sessionId);
      setRuntime("e2b");
      toast.success(data.resumed ? "Resumed your sandbox" : "Sandbox ready");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start");
    } finally {
      setStarting(null);
    }
  }

  async function stop() {
    if (!sessionId) return;
    if (runtime === "pyodide") {
      pyodideRef.current = null;
    } else {
      try { await api.delete<any>(`/labs/sessions/${sessionId}`, token); } catch { /* idle cleanup will reap it */ }
    }
    setSessionId(null);
    setRuntime(null);
    setCells((c) => c.map((cell) => ({ ...cell, output: undefined })));
  }

  function updateCell(id: number, code: string) {
    setCells((c) => c.map((cell) => (cell.id === id ? { ...cell, code } : cell)));
  }
  function addCell() {
    setCells((c) => [...c, { id: nextCellId++, code: "" }]);
  }
  function removeCell(id: number) {
    setCells((c) => (c.length > 1 ? c.filter((cell) => cell.id !== id) : c));
  }

  async function runCell(id: number) {
    if (!sessionId) return;
    const cell = cells.find((c) => c.id === id);
    if (!cell) return;
    setRunning((r) => ({ ...r, [id]: true }));
    try {
      let output: CellOutput;
      if (runtime === "pyodide") {
        output = await runPyodideCell(pyodideRef.current, cell.code);
      } else {
        const res: any = await api.post<any>(`/labs/sessions/${sessionId}/execute`, { code: cell.code }, token);
        output = res.data ?? res;
      }
      setCells((c) => c.map((cl) => (cl.id === id ? { ...cl, output } : cl)));
    } catch (e: any) {
      setCells((c) => c.map((cl) => (cl.id === id ? { ...cl, output: { stdout: [], stderr: [e?.message ?? "Execution failed"], error: null, results: [] } } : cl)));
    } finally {
      setRunning((r) => ({ ...r, [id]: false }));
    }
  }

  const expiresLabel = access?.expiresAt
    ? new Date(access.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen p-8" style={{ background: "#f5f0eb" }}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push("/labs")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-700 mb-6">
          <ArrowLeft size={15} /> All Labs
        </button>

        <div className="flex items-center gap-2 mb-2">
          <FlaskConical size={22} className="text-navy-700" />
          <h1 className="text-2xl font-display font-black text-navy-900">Playground</h1>
        </div>
        <p className="text-slate-500 mb-6">A blank Python sandbox — not part of any course. Write and run whatever you like.</p>

        {checkout ? (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 bg-navy-900 text-white text-sm font-semibold flex items-center gap-2">
              <Cloud size={15} /> Subscribe to Cloud Sandbox — $200/month, cancel anytime
            </div>
            <EmbeddedCheckoutProvider
              stripe={getStripe(checkout.publishableKey)}
              options={{ clientSecret: checkout.clientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        ) : !sessionId ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
            <p className="text-sm text-slate-500 text-center">Pick how you'd like to run your code:</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={16} className="text-emerald-700" />
                  <span className="font-display font-bold text-navy-900 text-sm">Start in Browser</span>
                </div>
                <p className="text-xs text-slate-500 mb-4 flex-1">
                  Runs Python directly on your device — instant startup, no waiting on a server. Great for scripts, algorithms, data structures, and most exercises.
                </p>
                <button
                  onClick={() => start("pyodide")}
                  disabled={starting !== null}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {starting === "pyodide" ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
                  Start in Browser
                </button>
              </div>

              <div className="rounded-xl border border-navy-200 bg-navy-50/50 p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud size={16} className="text-navy-700" />
                  <span className="font-display font-bold text-navy-900 text-sm">Cloud Sandbox</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">
                    <Sparkles size={9} /> Upgrade
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4 flex-1">
                  A full cloud machine for heavier work: PyTorch, TensorFlow, OpenCV and other large frameworks, more memory, and long-running jobs that outgrow a browser tab.
                </p>
                {access?.hasAccess ? (
                  <>
                    <button
                      onClick={() => start("e2b")}
                      disabled={starting !== null}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-800 text-white font-semibold text-sm hover:bg-navy-900 transition-colors disabled:opacity-50"
                    >
                      {starting === "e2b" ? <Loader2 size={15} className="animate-spin" /> : <Cloud size={15} />}
                      Start Cloud Sandbox
                    </button>
                    {expiresLabel && (
                      <p className="text-[11px] text-slate-400 mt-2 text-center">
                        {access.cancelAtPeriodEnd ? `Cancels on ${expiresLabel}` : `Renews on ${expiresLabel}`}
                      </p>
                    )}
                    <button
                      onClick={access.cancelAtPeriodEnd ? resumeSubscription : cancelSubscription}
                      disabled={updatingSub}
                      className="text-[11px] font-semibold text-slate-400 hover:text-navy-700 mt-1 mx-auto disabled:opacity-50"
                    >
                      {updatingSub ? "Updating…" : access.cancelAtPeriodEnd ? "Resume auto-renewal" : "Cancel auto-renewal"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={unlockSandbox}
                    disabled={unlocking}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-navy-300 bg-white text-navy-800 font-semibold text-sm hover:bg-navy-50 transition-colors disabled:opacity-50"
                  >
                    {unlocking ? <Loader2 size={15} className="animate-spin" /> : <Lock size={13} />}
                    Subscribe — $200/month
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900 text-white">
              <div className="flex items-center gap-2.5 text-sm font-semibold">
                <FlaskConical size={15} />
                {runtime === "pyodide" ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide bg-emerald-400/15 text-emerald-300 px-2 py-0.5 rounded-full">
                    <Globe size={10} /> Browser
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                    <Cloud size={10} /> Cloud sandbox
                  </span>
                )}
              </div>
              <button onClick={stop} className="text-xs font-semibold text-white/70 hover:text-white flex items-center gap-1.5">
                <Square size={12} /> Stop
              </button>
            </div>

            <div className="p-5 space-y-4 bg-slate-50">
              {cells.map((cell, i) => (
                <div key={cell.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
                    <span className="text-[11px] font-mono text-slate-400">In [{i + 1}]</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => runCell(cell.id)}
                        disabled={running[cell.id] || (runtime === "pyodide" && anyCellRunning)}
                        className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900 disabled:opacity-30"
                      >
                        {running[cell.id] ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
                      </button>
                      <button onClick={() => removeCell(cell.id)} className="text-slate-300 hover:text-red-500" title="Remove cell">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <Editor
                    height={Math.max(80, (cell.code.split("\n").length + 1) * 19)}
                    defaultLanguage="python"
                    value={cell.code}
                    onChange={(v) => updateCell(cell.id, v ?? "")}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                  />
                  {cell.output && (
                    <div className="border-t border-slate-200 bg-slate-900 text-slate-100 text-xs font-mono p-3 space-y-1 max-h-64 overflow-auto">
                      {cell.output.stdout.map((line, li) => <div key={`o${li}`} className="whitespace-pre-wrap">{line}</div>)}
                      {cell.output.stderr.map((line, li) => <div key={`e${li}`} className="whitespace-pre-wrap text-red-400">{line}</div>)}
                      {cell.output.error && (
                        <div className="whitespace-pre-wrap text-red-400">{cell.output.error.name}: {cell.output.error.value}</div>
                      )}
                      {cell.output.results.map((r, ri) => (
                        <div key={`r${ri}`}>
                          {r.png && <img src={`data:image/png;base64,${r.png}`} alt="" className="rounded-lg mt-1 max-w-full" />}
                          {r.text && !r.png && <div className="whitespace-pre-wrap">{r.text}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addCell} className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5">
                <Plus size={13} /> Add Cell
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
