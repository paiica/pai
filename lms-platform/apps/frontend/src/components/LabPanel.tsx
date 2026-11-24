"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { Play, Square, Loader2, Terminal, Globe, Cloud, CheckCircle2, XCircle, Lightbulb, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { detectLabRuntime, createPyodideInterpreter, runPyodideCell, type CellOutput } from "@/lib/lab-runtime";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type LabCell = {
  type: "markdown" | "code" | "exercise";
  content: string;
  runnable?: boolean;
  skip_reason?: string;
  prompt?: string; // exercise only — test_code is never sent to the browser
};

type ExerciseState = { passed: boolean; attempts: number };
type CheckResult = { passed: boolean; results: { name: string; passed: boolean }[]; stderr: string[]; labCompleted?: boolean };

const SAVE_DEBOUNCE_MS = 1200;

// Light in-cell markdown for lab cells only (headers/bold/code/links) — the
// real per-lesson prose already goes through `marked` server-side in the
// enrichment scripts; this just needs to render short notebook cell captions.
function renderMarkdownLite(src: string): string {
  return src
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h3>$1</h3>")
    .replace(/^# (.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, "<br/><br/>");
}

export default function LabPanel({
  lesson, enrollmentId, token,
}: { lesson: any; enrollmentId: string; token: string }) {
  const initialCells: LabCell[] = Array.isArray(lesson.lab_cells_json) ? lesson.lab_cells_json : [];
  const runtime = useMemo(() => detectLabRuntime(initialCells), [initialCells]);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState<Record<number, string>>(() =>
    Object.fromEntries(initialCells.map((c, i) => [i, c.content]))
  );
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const [outputs, setOutputs] = useState<Record<number, CellOutput>>({});
  const pyodideRef = useRef<any>(null);

  // Persistence — loaded once on mount, regardless of runtime (Pyodide labs
  // never talk to the backend to run code, so this is the only place either
  // runtime learns what the student already did here).
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [labCompleted, setLabCompleted] = useState(false);
  const [exerciseState, setExerciseState] = useState<Record<number, ExerciseState>>({});
  const [checkResults, setCheckResults] = useState<Record<number, CheckResult>>({});
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const [hints, setHints] = useState<Record<number, string>>({});
  const [hintLoading, setHintLoading] = useState<Record<number, boolean>>({});
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Pyodide is a single shared interpreter per lesson — unlike E2B (an
  // independent server request per execute call), overlapping runPythonAsync
  // calls would race on the global setStdout/setStderr hooks and cross-
  // contaminate output between cells. Block starting a second run until the
  // first finishes, in Pyodide mode only.
  const anyCellRunning = Object.values(running).some(Boolean);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await api.get<any>(`/labs/enrollment/${enrollmentId}/lesson/${lesson.id}/progress`, token);
        const data = res.data ?? res;
        if (cancelled) return;
        const savedCode = (data.cell_code ?? {}) as Record<string, string>;
        if (Object.keys(savedCode).length) {
          setCode((c) => {
            const next = { ...c };
            for (const [i, v] of Object.entries(savedCode)) next[Number(i)] = v;
            return next;
          });
        }
        setExerciseState(data.exercise_state ?? {});
        setLabCompleted(!!data.completed);
      } catch {
        // Best-effort — a student can still work through the lab without
        // persistence if this fails, they just won't resume where they left off.
      } finally {
        if (!cancelled) setProgressLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, enrollmentId]);

  if (!initialCells.length) return null;

  function queueSave(i: number, value: string) {
    if (!progressLoaded) return; // don't clobber saved progress with authored defaults before it loads
    if (saveTimers.current[i]) clearTimeout(saveTimers.current[i]);
    saveTimers.current[i] = setTimeout(() => {
      api.post(`/labs/enrollment/${enrollmentId}/lesson/${lesson.id}/save`, { cell_index: i, code: value }, token).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }

  function onCodeChange(i: number, value: string) {
    setCode((c) => ({ ...c, [i]: value }));
    queueSave(i, value);
  }

  async function startSession() {
    setStarting(true);
    try {
      if (runtime === "pyodide") {
        pyodideRef.current = await createPyodideInterpreter(initialCells);
        setSessionId("pyodide-local");
        toast.success("Python runtime ready — runs entirely in your browser");
        return;
      }
      const res: any = await api.post<any>(`/labs/enrollment/${enrollmentId}/lesson/${lesson.id}/session`, {}, token);
      const data = res.data ?? res;
      setSessionId(data.sessionId);
      toast.success(data.resumed ? "Resumed your lab sandbox" : "Sandbox ready");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start the lab");
    } finally {
      setStarting(false);
    }
  }

  async function stopSession() {
    if (!sessionId) return;
    if (runtime === "pyodide") {
      pyodideRef.current = null;
      setSessionId(null);
      setOutputs({});
      return;
    }
    try {
      await api.delete<any>(`/labs/sessions/${sessionId}`, token);
    } catch {
      // best-effort — the idle-cleanup job on the backend will reap it anyway
    }
    setSessionId(null);
    setOutputs({});
  }

  async function runCell(i: number) {
    if (!sessionId) return;
    setRunning((r) => ({ ...r, [i]: true }));
    try {
      if (runtime === "pyodide") {
        const output = await runPyodideCell(pyodideRef.current, code[i] ?? "");
        setOutputs((o) => ({ ...o, [i]: output }));
        return;
      }
      const res: any = await api.post<any>(`/labs/sessions/${sessionId}/execute`, { code: code[i] ?? "" }, token);
      setOutputs((o) => ({ ...o, [i]: res.data ?? res }));
    } catch (e: any) {
      setOutputs((o) => ({
        ...o,
        [i]: { stdout: [], stderr: [e?.message ?? "Execution failed"], error: null, results: [] },
      }));
    } finally {
      setRunning((r) => ({ ...r, [i]: false }));
    }
  }

  // Grading always runs server-side in its own short-lived sandbox,
  // independent of whether an interactive session is open — a student can
  // "Check my work" without ever clicking "Start Lab" first.
  async function checkExercise(i: number) {
    setChecking((c) => ({ ...c, [i]: true }));
    try {
      const res: any = await api.post<any>(
        `/labs/enrollment/${enrollmentId}/lesson/${lesson.id}/check`,
        { cell_index: i, code: code[i] ?? "" },
        token,
      );
      const result: CheckResult = res.data ?? res;
      setCheckResults((r) => ({ ...r, [i]: result }));
      setExerciseState((s) => ({
        ...s,
        [i]: { passed: result.passed, attempts: (s[i]?.attempts ?? 0) + 1 },
      }));
      if (result.passed) {
        toast.success("All checks passed! 🎉");
        if (result.labCompleted) setLabCompleted(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't check your work — try again");
    } finally {
      setChecking((c) => ({ ...c, [i]: false }));
    }
  }

  async function getHint(i: number) {
    setHintLoading((h) => ({ ...h, [i]: true }));
    try {
      const res: any = await api.post<any>(
        `/labs/enrollment/${enrollmentId}/lesson/${lesson.id}/hint`,
        { cell_index: i, code: code[i] ?? "" },
        token,
      );
      const data = res.data ?? res;
      setHints((h) => ({ ...h, [i]: data.hint }));
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't get a hint right now");
    } finally {
      setHintLoading((h) => ({ ...h, [i]: false }));
    }
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 bg-navy-900 text-white">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <Terminal size={15} /> Interactive Lab
          {labCompleted && (
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide bg-teal-400/15 text-teal-300 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={10} /> Completed
            </span>
          )}
          {runtime === "pyodide" ? (
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide bg-emerald-400/15 text-emerald-300 px-2 py-0.5 rounded-full">
              <Globe size={10} /> Runs in your browser — free
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
              <Cloud size={10} /> Cloud sandbox
            </span>
          )}
        </div>
        {sessionId ? (
          <button onClick={stopSession} className="text-xs font-semibold text-white/70 hover:text-white flex items-center gap-1.5">
            <Square size={12} /> {runtime === "pyodide" ? "Stop" : "Stop Sandbox"}
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={starting}
            className="text-xs font-semibold bg-white text-navy-900 px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            {starting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {starting ? (runtime === "pyodide" ? "Loading Python…" : "Booting sandbox…") : "Start Lab"}
          </button>
        )}
      </div>

      <div className="p-5 space-y-4 bg-slate-50">
        {!sessionId && (
          <p className="text-sm text-slate-500">
            {runtime === "pyodide"
              ? "Start to load a Python runtime directly in your browser — no install, no cloud sandbox required. First load downloads a few MB and may take a moment. Exercise cells can be checked without starting the lab."
              : "Start the sandbox to run this notebook's code directly in your browser — no install required. Runs on CPU, so heavier training cells may take a while. Exercise cells can be checked without starting the lab."}
          </p>
        )}

        {initialCells.map((cell, i) => {
          if (cell.type === "markdown") {
            return (
              <div
                key={i}
                className="prose prose-slate prose-sm max-w-none px-1"
                dangerouslySetInnerHTML={{ __html: renderMarkdownLite(cell.content) }}
              />
            );
          }

          const isExercise = cell.type === "exercise";
          const state = exerciseState[i];
          const result = checkResults[i];

          return (
            <div key={i} className={`rounded-xl overflow-hidden border bg-white ${isExercise ? "border-navy-200" : "border-slate-200"}`}>
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 border-b border-slate-200">
                <span className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  {isExercise ? (
                    <span className="flex items-center gap-1 font-sans font-semibold text-navy-700">
                      <Sparkles size={11} /> Exercise
                      {state?.passed && <CheckCircle2 size={12} className="text-teal-600" />}
                    </span>
                  ) : (
                    `In [${i + 1}]`
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {cell.runnable === false ? (
                    <span className="text-[11px] text-amber-600">{cell.skip_reason ?? "Not runnable in this sandbox"}</span>
                  ) : (
                    <button
                      onClick={() => runCell(i)}
                      disabled={!sessionId || running[i] || (runtime === "pyodide" && anyCellRunning)}
                      className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900 disabled:opacity-30"
                    >
                      {running[i] ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run
                    </button>
                  )}
                  {isExercise && (
                    <button
                      onClick={() => checkExercise(i)}
                      disabled={checking[i]}
                      className="flex items-center gap-1 text-xs font-semibold text-white bg-navy-700 hover:bg-navy-800 px-2.5 py-1 rounded-lg disabled:opacity-50"
                    >
                      {checking[i] ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Check my work
                    </button>
                  )}
                </div>
              </div>

              {isExercise && cell.prompt && (
                <div className="px-3 py-2.5 bg-navy-50/50 border-b border-slate-200 text-sm text-navy-900">
                  {cell.prompt}
                </div>
              )}

              <Editor
                height={Math.min(320, Math.max(60, (code[i]?.split("\n").length ?? 3) * 19))}
                defaultLanguage="python"
                value={code[i]}
                onChange={(v) => onCodeChange(i, v ?? "")}
                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, readOnly: cell.runnable === false }}
              />

              {outputs[i] && (
                <div className="border-t border-slate-200 bg-slate-900 text-slate-100 text-xs font-mono p-3 space-y-1 max-h-64 overflow-auto">
                  {outputs[i].stdout.map((line, li) => (
                    <div key={`o${li}`} className="whitespace-pre-wrap">{line}</div>
                  ))}
                  {outputs[i].stderr.map((line, li) => (
                    <div key={`e${li}`} className="whitespace-pre-wrap text-red-400">{line}</div>
                  ))}
                  {outputs[i].error && (
                    <div className="whitespace-pre-wrap text-red-400">
                      {outputs[i].error!.name}: {outputs[i].error!.value}
                    </div>
                  )}
                  {outputs[i].results.map((r, ri) => (
                    <div key={`r${ri}`}>
                      {r.png && <img src={`data:image/png;base64,${r.png}`} alt="" className="rounded-lg mt-1 max-w-full" />}
                      {r.text && !r.png && <div className="whitespace-pre-wrap">{r.text}</div>}
                    </div>
                  ))}
                </div>
              )}

              {isExercise && result && (
                <div className="border-t border-slate-200 p-3 space-y-1.5 bg-white">
                  {result.results.map((t, ti) => (
                    <div key={ti} className={`flex items-center gap-1.5 text-xs ${t.passed ? "text-teal-700" : "text-red-600"}`}>
                      {t.passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {t.name}
                    </div>
                  ))}
                  {result.stderr.length > 0 && (
                    <div className="text-xs text-red-600 font-mono whitespace-pre-wrap pt-1">{result.stderr.join("\n")}</div>
                  )}
                </div>
              )}

              {isExercise && (
                <div className="border-t border-slate-100 px-3 py-2 bg-slate-50 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {state?.attempts ? `${state.attempts} attempt${state.attempts === 1 ? "" : "s"}` : "Not attempted yet"}
                  </span>
                  <button
                    onClick={() => getHint(i)}
                    disabled={hintLoading[i]}
                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
                  >
                    {hintLoading[i] ? <Loader2 size={11} className="animate-spin" /> : <Lightbulb size={11} />} Get a hint
                  </button>
                </div>
              )}
              {isExercise && hints[i] && (
                <div className="border-t border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 flex items-start gap-2">
                  <Lightbulb size={13} className="flex-shrink-0 mt-0.5 text-amber-500" />
                  <span>{hints[i]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
