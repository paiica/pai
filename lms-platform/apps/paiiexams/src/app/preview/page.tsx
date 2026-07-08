"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Shield, Camera, CameraOff, Mic, MicOff, Maximize, AlertTriangle,
  ChevronLeft, ChevronRight, Clock, CheckCircle, Loader2,
  XCircle, Flag, Eye,
} from "lucide-react";
import { api } from "@/lib/api";

const AUDIO_CHECK_INTERVAL_MS = 5_000;
const NOISE_THRESHOLD = 0.15;

function cn(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }
function fmtTimer(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function ViolationBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-red-600 border border-red-400 rounded-2xl shadow-xl">
      <AlertTriangle size={16} className="text-red-100 shrink-0" />
      <p className="text-sm font-semibold text-white">{message}</p>
      <button onClick={onDismiss} className="text-red-200 hover:text-white ml-2"><XCircle size={16} /></button>
    </div>
  );
}

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
const FACE_CHECK_INTERVAL_MS = 400;          // run detection 2.5× per second
const GAZE_THRESHOLD = 0.12;                 // sensitive — catches slight lateral turns
const VIOLATION_COOLDOWN_MS = 2_000;         // minimum gap between repeated events of same type

type GazeDir = "center" | "left" | "right" | "up" | "down";

function GazeCompass({ dir, faceDetected }: { dir: GazeDir; faceDetected: boolean | null }) {
  // 3×3 grid but only 5 active cells (no diagonals)
  type Cell = { d: GazeDir | null; label: string };
  const rows: Cell[][] = [
    [{ d: null, label: "" },     { d: "up",     label: "↑" }, { d: null, label: "" }],
    [{ d: "left", label: "←" }, { d: "center", label: "·" }, { d: "right", label: "→" }],
    [{ d: null, label: "" },     { d: "down",   label: "↓" }, { d: null, label: "" }],
  ];
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">Gaze</p>
      <div className="grid grid-cols-3 gap-0.5 w-full">
        {rows.flat().map(({ d, label }, i) => {
          const active = d !== null && faceDetected && dir === d;
          return (
            <div key={i} className={cn(
              "flex items-center justify-center rounded text-[11px] font-bold py-0.5",
              !d ? "bg-transparent" :
              active && d === "center" ? "bg-emerald-700 text-emerald-200" :
              active ? "bg-amber-700 text-amber-200" :
              "bg-slate-800 text-slate-600"
            )}>{label}</div>
          );
        })}
      </div>
      {faceDetected === false && <p className="text-[9px] text-red-400 mt-1 font-semibold">No face!</p>}
      {faceDetected && dir !== "center" && <p className="text-[9px] text-amber-400 mt-1 font-semibold">Looking {dir}!</p>}
    </div>
  );
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  _result: any,
  _faceapi: any,
  _faceOk: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function ProctorCamera({
  onNoFace, onGazeAway,
}: {
  onNoFace: () => void;
  onGazeAway: (dir: GazeDir) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null);
  const [gazeDir, setGazeDir] = useState<GazeDir>("center");
  const streamRef = useRef<MediaStream | null>(null);
  const lastViolationRef = useRef<Record<string, number>>({});

  // Load face-api models
  useEffect(() => {
    import("face-api.js").then((faceapi) => {
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]).then(() => setModelsReady(true)).catch(() => {});
    });
  }, []);

  // Start camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamActive(true);
      })
      .catch(() => setCamError("Camera access denied"));
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Face + gaze detection loop
  const onNoFaceRef = useRef(onNoFace);
  const onGazeAwayRef = useRef(onGazeAway);
  useEffect(() => { onNoFaceRef.current = onNoFace; }, [onNoFace]);
  useEffect(() => { onGazeAwayRef.current = onGazeAway; }, [onGazeAway]);

  useEffect(() => {
    if (!modelsReady || !camActive) return;
    let alive = true;

    const detect = async () => {
      if (!alive || !videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const faceapi = await import("face-api.js");
        const result = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks(true);

        const fire = (key: string, cb: () => void) => {
          const now = Date.now();
          if ((now - (lastViolationRef.current[key] ?? 0)) >= VIOLATION_COOLDOWN_MS) {
            lastViolationRef.current[key] = now;
            cb();
          }
        };

        if (!result) {
          setFaceDetected(false);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          fire("no_face", () => onNoFaceRef.current());
          return;
        }

        setFaceDetected(true);

        // Gaze heuristics using facial landmarks
        const pts = result.landmarks.positions;
        const leftOuter  = pts[36]; // left eye outer corner
        const rightOuter = pts[45]; // right eye outer corner
        const noseTip    = pts[30];
        const chinBottom = pts[8];
        // Brow midpoints (pts 19 = left inner brow, pts 24 = right inner brow)
        const browMidY   = (pts[19].y + pts[24].y) / 2;

        // Horizontal: nose tip offset vs eye midpoint — reliable for left/right turns
        const eyeMidX = (leftOuter.x + rightOuter.x) / 2;
        const faceWidth = Math.abs(rightOuter.x - leftOuter.x);
        const horzDev = (noseTip.x - eyeMidX) / (faceWidth || 1);

        // Vertical: where nose sits between brows and chin
        // Forward gaze ~0.45–0.55; looking down (at phone) >0.62; looking up <0.35
        const vertSpan = (chinBottom.y - browMidY) || 1;
        const vertRatio = (noseTip.y - browMidY) / vertSpan;

        let dir: GazeDir = "center";
        if (Math.abs(horzDev) > GAZE_THRESHOLD) {
          dir = horzDev > 0 ? "left" : "right";
        } else if (vertRatio > 0.58) {
          dir = "down"; // head tilted down — looking at phone/notes
        } else if (vertRatio < 0.38) {
          dir = "up";
        }

        setGazeDir(dir);

        // Draw overlay
        if (canvasRef.current && videoRef.current) {
          drawOverlay(canvasRef.current, videoRef.current, result, faceapi, dir === "center");
        }

        if (dir !== "center") {
          fire(`gaze_${dir}`, () => onGazeAwayRef.current(dir));
        }
      } catch {}
    };

    const id = setInterval(detect, FACE_CHECK_INTERVAL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [modelsReady, camActive]);

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-36 object-cover" />
        {/* Detection overlay canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {camError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center">
              <CameraOff size={20} className="text-red-400 mx-auto mb-1" />
              <p className="text-[10px] text-red-400">{camError}</p>
            </div>
          </div>
        ) : (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", camActive ? "bg-emerald-500" : "bg-slate-600")} />
              <span className="text-[9px] text-white/70">Camera</span>
            </div>
            {modelsReady && faceDetected !== null && (
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold",
                faceDetected ? "bg-emerald-900/80 text-emerald-300" : "bg-red-900/80 text-red-300 animate-pulse"
              )}>
                {faceDetected ? "Face ✓" : "No face!"}
              </div>
            )}
            {!modelsReady && camActive && (
              <span className="text-[9px] text-slate-500">Loading AI…</span>
            )}
          </div>
        )}
        {/* Red overlay when no face */}
        {faceDetected === false && (
          <div className="absolute inset-0 border-2 border-red-500 rounded-xl pointer-events-none animate-pulse" />
        )}
      </div>
      {modelsReady && <GazeCompass dir={gazeDir} faceDetected={faceDetected} />}
    </div>
  );
}

function useNoiseDetector(onNoise: () => void) {
  const [micActive, setMicActive] = useState(false);
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noiseCountRef = useRef(0);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {
        streamRef.current = stream;
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        setMicActive(true);
      })
      .catch(() => {});
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  useEffect(() => {
    if (!micActive) return;
    const id = setInterval(() => {
      const analyser = analyserRef.current;
      if (!analyser) return;
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v / 128 - 1) ** 2;
      const rms = Math.sqrt(sum / buf.length);
      setLevel(rms);
      if (rms > NOISE_THRESHOLD) {
        noiseCountRef.current++;
        if (noiseCountRef.current >= 3) { onNoise(); noiseCountRef.current = 0; }
      } else { noiseCountRef.current = 0; }
    }, AUDIO_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [micActive, onNoise]);

  return { micActive, level };
}

// ─── HTML inline question ─────────────────────────────────────────────────────

function HtmlInlineQuestion({ htmlContent, answer, onAnswer }: {
  htmlContent: string;
  answer: Answer;
  onAnswer: (a: Answer) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onAnswerRef = useRef(onAnswer);
  useEffect(() => { onAnswerRef.current = onAnswer; }, [onAnswer]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous content
    while (container.firstChild) container.removeChild(container.firstChild);

    // Use createContextualFragment so <script> tags inside the HTML actually execute
    try {
      const fragment = document.createRange().createContextualFragment(htmlContent);
      container.appendChild(fragment);
    } catch {
      container.innerHTML = htmlContent;
    }

    // Restore previously saved answer (handles both old plain-fields format and new snapshot format)
    if (typeof answer === "string" && answer) {
      try {
        const saved = JSON.parse(answer);
        const fields: Record<string, string> = saved.fields ?? saved;
        const inputs = container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
        inputs.forEach((el) => {
          const val = fields[el.name];
          if (!el.name || val === undefined) return;
          if ((el as HTMLInputElement).type === "checkbox") {
            (el as HTMLInputElement).checked = val === "true";
          } else if ((el as HTMLInputElement).type === "radio") {
            (el as HTMLInputElement).checked = el.value === val;
          } else {
            el.value = val;
          }
        });
      } catch {}
    }

    function collect() {
      if (!container) return;
      // Collect named field values
      const fields: Record<string, string> = {};
      const inputs = container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
      inputs.forEach((el) => {
        if (!el.name) return;
        if ((el as HTMLInputElement).type === "checkbox") {
          fields[el.name] = (el as HTMLInputElement).checked ? "true" : "false";
        } else if ((el as HTMLInputElement).type === "radio") {
          if ((el as HTMLInputElement).checked) fields[el.name] = el.value;
        } else {
          fields[el.name] = el.value;
        }
      });
      // Full DOM snapshot so the admin can re-render exactly what the student saw
      const snapshot = container.innerHTML;
      onAnswerRef.current(JSON.stringify({ type: "html_snapshot", snapshot, fields }));
    }

    container.addEventListener("input", collect);
    container.addEventListener("change", collect);
    return () => {
      container.removeEventListener("input", collect);
      container.removeEventListener("change", collect);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlContent]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="bg-white text-slate-900 rounded-xl p-5 text-sm leading-relaxed"
      />
      <p className="text-xs text-slate-500">Fill in the fields above — your responses are captured automatically.</p>
    </div>
  );
}

// ─── Question renderer ────────────────────────────────────────────────────────

type Answer = string | string[] | null;

function QuestionBody({
  q, answer, onAnswer,
}: {
  q: any;
  answer: Answer;
  onAnswer: (a: Answer) => void;
}) {
  const type: string = q.type ?? "mcq_single";
  const options: { id: string; text: string; is_correct: boolean }[] = q.options ?? [];

  function toggleMulti(id: string) {
    const cur = Array.isArray(answer) ? answer : [];
    onAnswer(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  // MCQ single / true-false / dropdown
  if (["mcq_single", "true_false", "dropdown"].includes(type)) {
    return (
      <div className="space-y-3">
        {options.map((opt) => {
          const selected = answer === opt.id;
          return (
            <button key={opt.id} onClick={() => onAnswer(opt.id)}
              className={cn("w-full flex items-center gap-4 p-4 rounded-xl border text-left text-sm transition-all",
                selected ? "border-blue-500 bg-blue-900/30 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800")}>
              <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                selected ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400")}>
                {String.fromCharCode(65 + options.indexOf(opt))}
              </span>
              <span dangerouslySetInnerHTML={{ __html: opt.text }} />
            </button>
          );
        })}
      </div>
    );
  }

  // MCQ multiple
  if (type === "mcq_multiple") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-slate-500 mb-1">Select all that apply</p>
        {options.map((opt) => {
          const selected = Array.isArray(answer) && answer.includes(opt.id);
          return (
            <button key={opt.id} onClick={() => toggleMulti(opt.id)}
              className={cn("w-full flex items-center gap-4 p-4 rounded-xl border text-left text-sm transition-all",
                selected ? "border-blue-500 bg-blue-900/30 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800")}>
              <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border-2",
                selected ? "bg-blue-500 border-blue-400 text-white" : "bg-slate-800 border-slate-600 text-slate-400")}>
                {selected ? "✓" : ""}
              </span>
              <span dangerouslySetInnerHTML={{ __html: opt.text }} />
            </button>
          );
        })}
      </div>
    );
  }

  // Ordering
  if (type === "ordering") {
    const order: string[] = Array.isArray(answer) ? answer : options.map(o => o.id);
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500 mb-1">Drag to reorder (preview — static)</p>
        {order.map((id, i) => {
          const opt = options.find(o => o.id === id);
          return (
            <div key={id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-sm">
              <span className="w-6 h-6 rounded-md bg-slate-700 text-slate-400 text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              {opt?.text ?? id}
            </div>
          );
        })}
      </div>
    );
  }

  // Matching
  if (type === "matching") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500 mb-2">Match each item on the left to the correct answer on the right (preview — static)</p>
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900 text-sm">
            <span className="flex-1 text-slate-300">{opt.text}</span>
            <span className="text-slate-500">→</span>
            <span className="flex-1 text-slate-400 italic">{(opt as any).match_text ?? "—"}</span>
          </div>
        ))}
      </div>
    );
  }

  // Fill in the blank / short / long / essay
  if (["fill_blank", "open_short", "open_long", "essay"].includes(type)) {
    const isLong = ["open_long", "essay"].includes(type);
    return isLong ? (
      <textarea
        className="w-full bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm p-4 focus:outline-none focus:border-blue-500 resize-none"
        rows={6}
        placeholder="Type your answer here…"
        value={typeof answer === "string" ? answer : ""}
        onChange={(e) => onAnswer(e.target.value)}
      />
    ) : (
      <input
        className="w-full bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm px-4 py-3 focus:outline-none focus:border-blue-500"
        placeholder="Type your answer here…"
        value={typeof answer === "string" ? answer : ""}
        onChange={(e) => onAnswer(e.target.value)}
      />
    );
  }

  // HTML / Interactive
  if (type === "html") {
    const htmlContent: string = q.metadata?.html_content ?? "";
    const answerMode: string = q.metadata?.answer_mode ?? "box";
    const boxType: string = q.metadata?.box_type ?? "textarea";

    return (
      <div className="space-y-4">
        {answerMode === "inline" ? (
          <HtmlInlineQuestion htmlContent={htmlContent} answer={answer} onAnswer={onAnswer} />
        ) : (
          <>
            <div
              className="bg-white text-slate-900 rounded-xl p-5 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
            {boxType === "textarea" ? (
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm p-4 focus:outline-none focus:border-blue-500 resize-none"
                rows={5}
                placeholder="Type your answer here…"
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => onAnswer(e.target.value)}
              />
            ) : (
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm px-4 py-3 focus:outline-none focus:border-blue-500"
                placeholder="Type your answer here…"
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => onAnswer(e.target.value)}
              />
            )}
          </>
        )}
      </div>
    );
  }

  // Code
  if (type === "code") {
    const lang = q.metadata?.language ?? "code";
    const starter = q.metadata?.starter_code ?? "";
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{lang}</span>
          <span className="text-xs text-slate-600">Write your solution below</span>
        </div>
        <textarea
          className="w-full bg-slate-950 border border-slate-700 rounded-xl text-emerald-300 text-sm p-4 font-mono focus:outline-none focus:border-blue-500 resize-y"
          rows={10}
          value={typeof answer === "string" ? answer : starter}
          onChange={(e) => onAnswer(e.target.value)}
          spellCheck={false}
        />
      </div>
    );
  }

  return <p className="text-slate-500 text-sm italic">Question type "{type}" — no renderer in preview.</p>;
}

// ─── Instructions screen ──────────────────────────────────────────────────────

interface InstructionPage {
  id: string;
  title?: string | null;
  content: string;
  section_title: string;
}

// ─── Camera setup / positioning screen ───────────────────────────────────────

function CameraSetupScreen({ certTitle, sessionTitle, previewToken, onReady }: {
  certTitle: string;
  sessionTitle: string;
  previewToken: string;
  onReady: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState("");
  const [camActive, setCamActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [status, setStatus] = useState<"loading" | "no_cam" | "no_face" | "off_center" | "too_far" | "too_close" | "ready">("loading");
  const [gazeOk, setGazeOk] = useState<boolean | null>(null);

  // Load models
  useEffect(() => {
    import("face-api.js").then((faceapi) => {
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]).then(() => setModelsReady(true)).catch(() => {});
    });
  }, []);

  // Start camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamActive(true);
      })
      .catch(() => { setCamError("Camera access denied"); setStatus("no_cam"); });
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Detection loop + canvas drawing
  useEffect(() => {
    if (!modelsReady || !camActive) return;
    let alive = true;

    const detect = async () => {
      if (!alive || !videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) return;
      const faceapi = await import("face-api.js");
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = video.clientWidth;
      const H = video.clientHeight;
      canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      // Draw guide oval
      const ovalCx = W / 2, ovalCy = H / 2;
      const ovalRx = W * 0.28, ovalRy = H * 0.42;

      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true);

      let newStatus: typeof status = "no_face";
      let ovalColor = "#475569";

      if (result) {
        const resized = faceapi.resizeResults(result, { width: W, height: H });
        const box = resized.detection.box;
        const faceCx = box.x + box.width / 2;
        const faceCy = box.y + box.height / 2;
        const faceArea = box.width * box.height;
        const guideArea = Math.PI * ovalRx * ovalRy;

        const cxOff = Math.abs(faceCx - ovalCx) / ovalRx;
        const cyOff = Math.abs(faceCy - ovalCy) / ovalRy;
        const sizeRatio = faceArea / guideArea;

        if (sizeRatio < 0.25) {
          newStatus = "too_far"; ovalColor = "#92400e";
        } else if (sizeRatio > 1.5) {
          newStatus = "too_close"; ovalColor = "#92400e";
        } else if (cxOff > 0.55 || cyOff > 0.55) {
          newStatus = "off_center"; ovalColor = "#92400e";
        } else {
          newStatus = "ready"; ovalColor = "#166534";
        }

        // Gaze check via nose/eye landmarks
        const pts = resized.landmarks.positions;
        const leftOuter = pts[36], rightOuter = pts[45], noseTip = pts[30];
        const chinBottom = pts[8];
        const browMidY = (pts[19].y + pts[24].y) / 2;
        const eyeMidX = (leftOuter.x + rightOuter.x) / 2;
        const faceWidth = Math.abs(rightOuter.x - leftOuter.x) || 1;
        const horzDev = (noseTip.x - eyeMidX) / faceWidth;
        const vertSpan = (chinBottom.y - browMidY) || 1;
        const vertRatio = (noseTip.y - browMidY) / vertSpan;
        const gazeCenter = Math.abs(horzDev) <= 0.12 && vertRatio >= 0.38 && vertRatio <= 0.58;

        // Draw eye centre dots — green when looking forward, amber when looking away
        const dotColor = gazeCenter ? "#22c55e" : "#f59e0b";
        [[36, 41], [42, 47]].forEach(([from, to]) => {
          const eyePts = pts.slice(from, to + 1);
          const cx = eyePts.reduce((s, p) => s + p.x, 0) / eyePts.length;
          const cy = eyePts.reduce((s, p) => s + p.y, 0) / eyePts.length;
          ctx.beginPath();
          ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.shadowColor = dotColor;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        setGazeOk(gazeCenter);
      } else {
        setGazeOk(null);
      }

      // Draw guide oval (always on top of face box)
      ctx.shadowColor = ovalColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = newStatus === "ready" ? "#22c55e" : newStatus === "no_face" ? "#475569" : "#f59e0b";
      ctx.lineWidth = 2.5;
      ctx.setLineDash(newStatus === "no_face" ? [8, 5] : []);
      ctx.beginPath();
      ctx.ellipse(ovalCx, ovalCy, ovalRx, ovalRy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      setStatus(newStatus);
    };

    setStatus("no_face");
    const id = setInterval(detect, 1000);
    return () => { alive = false; clearInterval(id); };
  }, [modelsReady, camActive]);

  const statusInfo: Record<typeof status, { label: string; color: string }> = {
    loading:    { label: "Loading camera AI…", color: "text-slate-400" },
    no_cam:     { label: "Camera access denied", color: "text-red-400" },
    no_face:    { label: "No face detected — look at the camera", color: "text-slate-400" },
    off_center: { label: "Move your face into the oval guide", color: "text-amber-400" },
    too_far:    { label: "Move closer to the camera", color: "text-amber-400" },
    too_close:  { label: "Move further from the camera", color: "text-amber-400" },
    ready:      { label: "Perfect — face detected and centred!", color: "text-emerald-400" },
  };

  const info = statusInfo[status];
  const canProceed = status === "ready" && gazeOk === true;

  async function handleReady() {
    if (!canProceed || !videoRef.current) return;
    setUploading(true);
    try {
      // Capture current video frame
      const video = videoRef.current;
      const cap = captureCanvasRef.current ?? document.createElement("canvas");
      cap.width = video.videoWidth || 640;
      cap.height = video.videoHeight || 480;
      const ctx = cap.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, cap.width, cap.height);
        const imageData = cap.toDataURL("image/jpeg", 0.85);
        await api.post<any>("/auth/save-student-photo", {
          preview_token: previewToken,
          image: imageData,
        });
        setPhotoSaved(true);
      }
    } catch {
      // Photo save failure shouldn't block the exam
    }
    setUploading(false);
    onReady();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-slate-400" />
          <span className="text-white font-black text-sm">paiiexams</span>
          <span className="text-slate-500 text-xs">· {sessionTitle}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/50 border border-blue-700 rounded-full text-blue-300 text-xs font-semibold">
          <Eye size={12} /> Admin Preview Mode
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full space-y-6">
          {/* Header */}
          <div className="text-center">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{certTitle}</p>
            <h1 className="text-2xl font-black text-white">Camera Setup</h1>
            <p className="text-slate-400 text-sm mt-2">Position your face inside the oval before starting the exam</p>
          </div>

          {/* Hidden canvas for photo capture */}
          <canvas ref={captureCanvasRef} className="hidden" />

          {/* Camera feed */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            {!camActive && !camError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-slate-500" />
              </div>
            )}
            {camError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                <div className="text-center">
                  <CameraOff size={32} className="text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">{camError}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                status === "ready" ? "bg-emerald-500" : status === "no_face" ? "bg-slate-600" : "bg-amber-500 animate-pulse"
              )} />
              <p className={cn("text-sm font-medium", info.color)}>{info.label}</p>
            </div>
            {status !== "no_face" && status !== "loading" && status !== "no_cam" && (
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  gazeOk === true ? "bg-emerald-500" : gazeOk === null ? "bg-slate-600" : "bg-amber-500 animate-pulse"
                )} />
                <p className={cn("text-sm font-medium", gazeOk === true ? "text-emerald-400" : "text-amber-400")}>
                  {gazeOk === true ? "Eyes on screen — gaze detected ✓" : "Look straight at the camera"}
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          <ul className="text-xs text-slate-500 space-y-1.5 bg-slate-900 rounded-xl p-4 border border-slate-800">
            <li className="flex gap-2"><span className="text-slate-600">•</span>Sit about arm's length from your camera</li>
            <li className="flex gap-2"><span className="text-slate-600">•</span>Ensure your face is well-lit from the front</li>
            <li className="flex gap-2"><span className="text-slate-600">•</span>Keep your eyes looking straight at the screen at all times</li>
            <li className="flex gap-2"><span className="text-slate-600">•</span>Keep your face inside the oval throughout the exam</li>
          </ul>

          {/* CTA */}
          <button
            onClick={handleReady}
            disabled={!canProceed || uploading}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
              canProceed && !uploading
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Saving photo…</>
            ) : canProceed ? (
              <><CheckCircle size={16} /> I'm ready — Start Exam</>
            ) : status === "ready" && gazeOk === false ? (
              "Look straight at the camera to continue"
            ) : (
              <><Loader2 size={16} className="opacity-40" /> Waiting for face detection…</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Instructions screen ──────────────────────────────────────────────────────

function InstructionsScreen({
  pages,
  certTitle,
  sessionTitle,
  onStart,
}: {
  pages: InstructionPage[];
  certTitle: string;
  sessionTitle: string;
  onStart: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const page = pages[idx];
  const isLast = idx === pages.length - 1;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-slate-400" />
          <span className="text-white font-black text-sm">paiiexams</span>
          <span className="text-slate-500 text-xs">· {sessionTitle}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/50 border border-blue-700 rounded-full text-blue-300 text-xs font-semibold">
          <Eye size={12} /> Admin Preview Mode
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-8">
        <div className="max-w-2xl w-full space-y-6">
          {/* Header */}
          <div>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{certTitle}</p>
            <h1 className="text-2xl font-black text-white">Exam Instructions</h1>
            {pages.length > 1 && (
              <p className="text-slate-500 text-sm mt-1">Page {idx + 1} of {pages.length}</p>
            )}
          </div>

          {/* Instruction page */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-3">
            {page.section_title && (
              <p className="text-brand-400 text-xs font-semibold uppercase tracking-wide">{page.section_title}</p>
            )}
            {page.title && (
              <h2 className="text-white font-bold text-lg">{page.title}</h2>
            )}
            <div
              className="rte-preview text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-sm font-medium transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            {isLast ? (
              <button
                onClick={onStart}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors"
              >
                <CheckCircle size={16} /> Start Exam
              </button>
            ) : (
              <button
                onClick={() => setIdx(i => i + 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Answer review helpers ────────────────────────────────────────────────────

const Q_TYPE_LABELS: Record<string, string> = {
  mcq_single: "MCQ", mcq_multiple: "MCQ Multiple", true_false: "True / False",
  open_short: "Short Answer", open_long: "Long Answer", essay: "Essay",
  fill_blank: "Fill in Blank", matching: "Matching", ordering: "Ordering",
  dropdown: "Dropdown", code: "Code", html: "HTML / Interactive",
};

const Q_TYPE_COLORS: Record<string, string> = {
  mcq_single: "bg-indigo-950/60 text-indigo-300 border-indigo-800/50",
  mcq_multiple: "bg-blue-950/60 text-blue-300 border-blue-800/50",
  true_false: "bg-violet-950/60 text-violet-300 border-violet-800/50",
  open_short: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
  open_long: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
  essay: "bg-teal-950/60 text-teal-300 border-teal-800/50",
  fill_blank: "bg-amber-950/60 text-amber-300 border-amber-800/50",
  matching: "bg-orange-950/60 text-orange-300 border-orange-800/50",
  ordering: "bg-orange-950/60 text-orange-300 border-orange-800/50",
  dropdown: "bg-amber-950/60 text-amber-300 border-amber-800/50",
  code: "bg-slate-800/80 text-slate-300 border-slate-700/60",
  html: "bg-pink-950/60 text-pink-300 border-pink-800/50",
};

function AnswerPreview({ q, answer }: { q: any; answer: Answer }) {
  const type: string = q.type ?? "";
  const options: { id: string; text: string }[] = q.options ?? [];

  const empty = answer === null || answer === undefined || answer === "" ||
    (Array.isArray(answer) && answer.length === 0);
  if (empty) return <p className="text-slate-600 text-xs italic">Not answered</p>;

  // MCQ single / true-false / dropdown
  if (["mcq_single", "true_false", "dropdown"].includes(type)) {
    const opt = options.find(o => o.id === answer);
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 border border-blue-800/50 rounded-lg text-blue-300 text-sm">
        <CheckCircle size={13} className="shrink-0 text-blue-400" />
        <span dangerouslySetInnerHTML={{ __html: opt?.text ?? String(answer) }} />
      </div>
    );
  }

  // MCQ multiple
  if (type === "mcq_multiple") {
    const ids: string[] = Array.isArray(answer) ? answer : [];
    return (
      <div className="flex flex-wrap gap-2">
        {ids.map(id => {
          const opt = options.find(o => o.id === id);
          return (
            <div key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/30 border border-blue-800/50 rounded-lg text-blue-300 text-xs">
              <CheckCircle size={10} className="text-blue-400" />
              <span dangerouslySetInnerHTML={{ __html: opt?.text ?? id }} />
            </div>
          );
        })}
      </div>
    );
  }

  // Ordering
  if (type === "ordering") {
    const ids: string[] = Array.isArray(answer) ? answer : [];
    return (
      <div className="space-y-1">
        {ids.map((id, i) => {
          const opt = options.find(o => o.id === id);
          return (
            <div key={id} className="flex items-center gap-2 text-slate-300 text-sm">
              <span className="w-5 h-5 rounded bg-slate-800 text-slate-500 text-[10px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
              {opt?.text ?? id}
            </div>
          );
        })}
      </div>
    );
  }

  // Code
  if (type === "code") {
    return (
      <div className="space-y-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{q.metadata?.language ?? "code"}</span>
        <pre className="bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs p-3 rounded-xl overflow-x-auto whitespace-pre-wrap">{String(answer)}</pre>
      </div>
    );
  }

  // HTML
  if (type === "html") {
    const answerMode: string = q.metadata?.answer_mode ?? "box";

    if (answerMode === "inline" && typeof answer === "string") {
      try {
        const parsed = JSON.parse(answer);
        const fields: Record<string, string> = parsed.fields ?? parsed;
        const snapshot: string | null = parsed.snapshot ?? null;
        const hasFields = Object.keys(fields).length > 0;
        return (
          <div className="space-y-3">
            {snapshot && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Student's filled-in view</p>
                <div className="bg-white rounded-xl p-4 text-slate-900 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: snapshot }} />
              </div>
            )}
            {hasFields && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Captured fields</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="pb-1.5 pr-6 text-slate-500 font-semibold">Field name</th>
                      <th className="pb-1.5 text-slate-500 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(fields).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-800/50">
                        <td className="py-1.5 pr-6 font-mono text-pink-300">{k}</td>
                        <td className="py-1.5 text-slate-200">{v || <span className="text-slate-600 italic">empty</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!snapshot && !hasFields && (
              <p className="text-slate-600 text-xs italic">No named fields found — add <code className="text-pink-300">name=</code> attributes to your HTML inputs</p>
            )}
          </div>
        );
      } catch {
        return <div className="bg-slate-800/60 border border-slate-700/50 text-slate-300 p-3 rounded-xl text-xs font-mono">{String(answer)}</div>;
      }
    }

    // box mode — plain text
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 text-slate-200 p-3 rounded-xl text-sm whitespace-pre-wrap leading-relaxed">
        {String(answer)}
      </div>
    );
  }

  // Everything else: open, essay, fill_blank, matching
  if (Array.isArray(answer)) {
    return (
      <div className="space-y-1">
        {(answer as string[]).map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-slate-300 text-sm">
            <span className="w-5 h-5 rounded bg-slate-800 text-slate-500 text-[10px] flex items-center justify-center font-bold shrink-0">{i + 1}</span>
            {options.find(o => o.id === item)?.text ?? item}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 text-slate-200 p-3 rounded-xl text-sm whitespace-pre-wrap leading-relaxed">
      {String(answer)}
    </div>
  );
}

// ─── Main PreviewExam component ───────────────────────────────────────────────

function PreviewExam({ questions, sections, sessionTitle, durationMinutes }: {
  questions: any[];
  sections: { id: string; title: string; time_limit_minutes: number | null; questions: any[] }[];
  sessionTitle: string;
  durationMinutes: number;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [submitted, setSubmitted] = useState(false);
  const [violation, setViolation] = useState<string | null>(null);
  const [violations, setViolations] = useState<{ type: string }[]>([]);

  // Section tracking
  const sectionBoundaries = sections.reduce<{ start: number; end: number; section: typeof sections[0] }[]>(
    (acc, sec) => {
      const start = acc.length ? acc[acc.length - 1].end : 0;
      return [...acc, { start, end: start + sec.questions.length, section: sec }];
    }, []
  );
  const currentBoundary = sectionBoundaries.find(b => currentIdx >= b.start && currentIdx < b.end);
  const currentSection = currentBoundary?.section ?? null;

  // Per-section countdown (only when section has a time limit)
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(
    currentSection?.time_limit_minutes ? currentSection.time_limit_minutes * 60 : null
  );
  const activeSectionRef = useRef(currentSection?.id ?? null);

  useEffect(() => {
    if (!currentSection) return;
    // Reset section timer when entering a new section
    if (currentSection.id !== activeSectionRef.current) {
      activeSectionRef.current = currentSection.id;
      setSectionTimeLeft(currentSection.time_limit_minutes ? currentSection.time_limit_minutes * 60 : null);
    }
  }, [currentSection]);

  useEffect(() => {
    if (submitted || sectionTimeLeft === null || sectionTimeLeft <= 0) return;
    const id = setInterval(() => setSectionTimeLeft(t => (t !== null ? Math.max(0, t - 1) : null)), 1000);
    return () => clearInterval(id);
  }, [submitted, sectionTimeLeft]);

  // Auto-advance to next section when section timer hits 0
  useEffect(() => {
    if (sectionTimeLeft !== 0 || !currentBoundary) return;
    const nextStart = currentBoundary.end;
    if (nextStart < questions.length) {
      setCurrentIdx(nextStart);
      logViolation("section_timeout", `Time expired for "${currentSection?.title}" — moved to next section.`);
    }
  }, [sectionTimeLeft]);

  function logViolation(type: string, message: string) {
    setViolations(v => [...v, { type }]);
    setViolation(message);
  }

  const handleNoise = useCallback(() => {
    logViolation("noise_detected", "Background noise detected. Please ensure a quiet environment.");
  }, []);

  const handleNoFace = useCallback(() => {
    logViolation("face_not_detected", "Face not detected — please look at the screen!");
  }, []);

  const handleGazeAway = useCallback((dir: GazeDir) => {
    logViolation("gaze_away", `Gaze detected ${dir} — please keep your eyes on the screen.`);
  }, []);

  const { micActive, level: audioLevel } = useNoiseDetector(handleNoise);

  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [submitted]);

  function enterFullscreen() { document.documentElement.requestFullscreen().catch(() => {}); }
  useEffect(() => {
    enterFullscreen();
    function onFsChange() {
      if (!document.fullscreenElement && !submitted) {
        logViolation("fullscreen_exit", "You exited fullscreen! Return immediately.");
        setTimeout(enterFullscreen, 2000);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [submitted]);

  useEffect(() => {
    if (submitted) return;
    function onVisibility() {
      if (document.hidden) logViolation("tab_switch", "Tab switching detected! This violation has been recorded.");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [submitted]);

  useEffect(() => {
    if (submitted) return;
    function block(e: Event) { e.preventDefault(); }
    document.addEventListener("copy", block);
    document.addEventListener("contextmenu", block);
    return () => { document.removeEventListener("copy", block); document.removeEventListener("contextmenu", block); };
  }, [submitted]);

  function handleSubmit() {
    if (!confirm("End admin preview?")) return;
    setSubmitted(true);
    document.exitFullscreen().catch(() => {});
  }

  if (submitted) {
    const answeredCount = Object.values(answers).filter(
      a => a !== null && a !== "" && !(Array.isArray(a) && a.length === 0)
    ).length;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-900/50 border border-blue-700 rounded-full text-blue-300 text-xs font-semibold">
              <Eye size={12} /> Admin Preview
            </div>
            <span className="text-white font-black text-sm">Preview Complete</span>
            <span className="text-slate-500 text-xs">{answeredCount} of {questions.length} answered</span>
          </div>
          <button
            onClick={() => { if (window.opener) { window.close(); } else { window.location.href = process.env.NEXT_PUBLIC_ADMIN_URL || "https://exam-admin.paii.ca"; } }}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Close Window
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-6 space-y-4">
          <p className="text-slate-500 text-xs">No results were saved — this was a preview only.</p>

          {violations.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border border-red-800/40 rounded-xl text-red-400 text-xs">
              <Flag size={12} />
              {violations.length} proctoring event{violations.length !== 1 ? "s" : ""} triggered during this preview
            </div>
          )}

          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold pt-2">Answer Review</p>

          {questions.map((q, i) => {
            const answer = answers[q.id] ?? null;
            const hasAnswer = answer !== null && answer !== "" && !(Array.isArray(answer) && answer.length === 0);
            return (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Question header */}
                <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-800">
                  <span className="text-slate-600 text-xs font-mono font-bold mt-0.5 shrink-0">Q{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold ${Q_TYPE_COLORS[q.type] ?? "bg-slate-800 text-slate-300 border-slate-700"}`}>
                        {Q_TYPE_LABELS[q.type] ?? q.type}
                      </span>
                      <span className="text-slate-600 text-[10px]">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                      {hasAnswer
                        ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle size={10} /> Answered</span>
                        : <span className="text-[10px] text-slate-600">— Not answered</span>
                      }
                    </div>
                    <div
                      className="text-sm text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: q.question_text }}
                    />
                  </div>
                </div>
                {/* Answer */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Submitted Answer</p>
                  <AnswerPreview q={q} answer={answer} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const answered = Object.values(answers).filter(a => a !== null && a !== "" && !(Array.isArray(a) && a.length === 0)).length;
  const urgent = timeLeft < 300;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none">
      {violation && <ViolationBanner message={violation} onDismiss={() => setViolation(null)} />}

      {/* Preview banner */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 py-1.5 bg-blue-900/40 border-b border-blue-800 text-blue-300 text-xs font-semibold">
        <Eye size={12} /> Admin Preview Mode — proctoring is active but no results are saved
      </div>

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-slate-400" />
          <span className="text-white font-black text-sm">paiiexams</span>
          <span className="text-slate-500 text-xs">· {sessionTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {micActive ? <Mic size={13} className="text-slate-400" /> : <MicOff size={13} className="text-red-400" />}
            <div className="flex gap-0.5 items-end h-3">
              {[0.05, 0.1, 0.15, 0.2].map((threshold, i) => (
                <div key={i} className={cn("w-1 rounded-sm", audioLevel > threshold ? "bg-emerald-500" : "bg-slate-700")} style={{ height: `${40 + i * 15}%` }} />
              ))}
            </div>
          </div>
          {/* Section timer — only shown when section has a time limit */}
          {currentSection && sectionTimeLeft !== null && (
            <div className={cn(
              "flex flex-col items-center px-3 py-1 rounded-lg border text-xs",
              sectionTimeLeft < 120 ? "border-orange-700 bg-orange-900/30 text-orange-300 animate-pulse" : "border-slate-700 bg-slate-800/50 text-slate-300"
            )}>
              <span className="font-semibold truncate max-w-28 leading-tight">{currentSection.title}</span>
              <span className="font-mono font-bold">{fmtTimer(sectionTimeLeft)}</span>
            </div>
          )}
          {/* Overall exam timer */}
          <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-bold text-sm", urgent ? "bg-red-900 text-red-300 animate-pulse" : "bg-slate-800 text-white")}>
            <Clock size={13} className={urgent ? "text-red-400" : "text-slate-400"} />
            {fmtTimer(timeLeft)}
          </div>
          <button onClick={enterFullscreen} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 p-3 gap-3">
          <ProctorCamera onNoFace={handleNoFace} onGazeAway={handleGazeAway} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Progress</span><span>{answered}/{questions.length}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.round((answered / questions.length) * 100)}%` }} />
            </div>
          </div>

          {violations.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Flag size={9} /> {violations.length} Event{violations.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-0.5 max-h-20 overflow-y-auto">
                {violations.slice(-5).map((v, i) => (
                  <p key={i} className="text-[9px] text-red-400 truncate">{v.type}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Questions</p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_, i) => {
                const a = answers[questions[i].id];
                const isAnswered = a !== undefined && a !== null && a !== "" && !(Array.isArray(a) && a.length === 0);
                return (
                  <button key={i} onClick={() => setCurrentIdx(i)}
                    className={cn("w-full aspect-square rounded text-[10px] font-bold transition-colors",
                      i === currentIdx ? "bg-blue-600 text-white" :
                      isAnswered ? "bg-emerald-800 text-emerald-300" :
                      "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-8">
            <div className="mb-6">
              {currentSection && (
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-1">{currentSection.title}</p>
              )}
              <p className="text-xs text-slate-500 mb-2">
                Question {currentIdx + 1} of {questions.length}
                {currentBoundary && (
                  <span className="ml-1 text-slate-600">
                    · {currentIdx - currentBoundary.start + 1}/{currentBoundary.section.questions.length} in section
                  </span>
                )}
                {q.points && q.points !== 1 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{q.points} pts</span>
                )}
              </p>
              <div
                className="text-base font-medium text-white leading-relaxed rte-preview"
                dangerouslySetInnerHTML={{ __html: q.question_text }}
              />
            </div>
            <QuestionBody
              q={q}
              answer={answers[q.id] ?? null}
              onAnswer={(a) => setAnswers(prev => ({ ...prev, [q.id]: a }))}
            />
          </div>

          <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t border-slate-800 bg-slate-900">
            <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-medium transition-colors">
              <ChevronLeft size={16} /> Previous
            </button>
            {currentIdx < questions.length - 1 ? (
              <button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold transition-colors">
                <CheckCircle size={14} /> End Preview
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Token verifier ───────────────────────────────────────────────────────────

function PreviewContent() {
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "instructions" | "camera_setup" | "exam" | "error">("loading");
  const [error, setError] = useState("");
  const [data, setData] = useState<{ questions: any[]; sections: any[]; instructions: InstructionPage[]; session: any; certification: any; is_admin_preview?: boolean } | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("No preview token found in URL."); setState("error"); return; }

    api.post<any>("/auth/verify-preview-link", { preview_token: token })
      .then((res) => {
        const d = res?.data ?? res;
        setData(d);
        // Admin preview skips camera setup — go straight to instructions or exam
        if (d.is_admin_preview) {
          setState(d.instructions?.length > 0 ? "instructions" : "exam");
        } else {
          setState(d.instructions?.length > 0 ? "instructions" : "camera_setup");
        }
      })
      .catch((e) => { setError(e?.message ?? "Preview link is invalid or expired."); setState("error"); });
  }, []);

  if (state === "error") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-900/40 border border-red-700">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white mb-2">Cannot load preview</h1>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "loading" || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700">
            <Eye size={28} className="text-blue-400" />
          </div>
          <div>
            <Loader2 size={24} className="animate-spin text-blue-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm">Loading exam preview…</p>
          </div>
        </div>
      </div>
    );
  }

  if (data.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertTriangle size={32} className="text-amber-400 mx-auto" />
          <h1 className="text-xl font-black text-white">No questions found</h1>
          <p className="text-slate-400 text-sm">Make sure this session has a published structured exam with questions assigned to it.</p>
        </div>
      </div>
    );
  }

  if (state === "instructions" && data.instructions?.length > 0) {
    return (
      <InstructionsScreen
        pages={data.instructions}
        certTitle={data.certification.title}
        sessionTitle={data.session.title || data.certification.title}
        onStart={() => setState(data.is_admin_preview ? "exam" : "camera_setup")}
      />
    );
  }

  if (state === "camera_setup") {
    return (
      <CameraSetupScreen
        certTitle={data.certification.title}
        sessionTitle={data.session.title || data.certification.title}
        previewToken={params.get("token") ?? ""}
        onReady={() => setState("exam")}
      />
    );
  }

  return (
    <PreviewExam
      questions={data.questions}
      sections={data.sections ?? []}
      sessionTitle={data.session.title || data.certification.title}
      durationMinutes={data.session.duration_minutes}
    />
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
