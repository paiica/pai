"use client";

import {
  useEffect, useRef, useState, useCallback, Suspense,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Shield, Camera, CameraOff, Mic, MicOff, Maximize, AlertTriangle,
  ChevronLeft, ChevronRight, Clock, CheckCircle, Loader2, Eye, Volume2,
  XCircle, Flag,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SNAPSHOT_INTERVAL_MS = 90_000; // every 90 seconds
const AUDIO_CHECK_INTERVAL_MS = 5_000;
const NOISE_THRESHOLD = 0.15; // 0-1 RMS level

// ── Helpers ────────────────────────────────────────────────────────────────────

function cn(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }

function fmtTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

// Upload a canvas blob as a snapshot, return URL
async function uploadSnapshot(blob: Blob, token: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("file", blob, `snapshot-${Date.now()}.jpg`);
    const res = await fetch(`${API_BASE}/uploads/local`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.url ?? data?.data?.url ?? null;
  } catch { return null; }
}

// ── Proctor Camera ────────────────────────────────────────────────────────────

interface ProctorCameraProps {
  onSnapshot: (url: string, faceDetected: boolean) => void;
  onNoFace: () => void;
  token: string;
  attemptId: string;
}

function ProctorCamera({ onSnapshot, onNoFace, token, attemptId }: ProctorCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<any>(null);
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState("");
  const [faceStatus, setFaceStatus] = useState<"ok" | "missing" | "multiple" | "unknown">("unknown");

  // Load face-api.js models
  async function loadFaceApi() {
    try {
      const faceapi = await import("face-api.js");
      // Models must be in /public/models/ — tiny-face-detector + landmarks
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      ]);
      faceApiRef.current = faceapi;
    } catch {
      // face-api.js models not present — continue without face detection
    }
  }

  // Detect faces in current video frame
  async function detectFace(): Promise<{ count: number; lookingAway: boolean }> {
    if (!faceApiRef.current || !videoRef.current) return { count: 0, lookingAway: false };
    try {
      const faceapi = faceApiRef.current;
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true);
      if (detections.length === 0) return { count: 0, lookingAway: false };
      if (detections.length > 0) {
        // Rough gaze check via nose-tip vs face center
        const lm = detections[0].landmarks;
        const noseTip = lm.getNose()[3];
        const leftEye = lm.getLeftEye();
        const rightEye = lm.getRightEye();
        const faceCenter = {
          x: (leftEye[0].x + rightEye[3].x) / 2,
          y: (leftEye[0].y + rightEye[3].y) / 2,
        };
        const xDeviation = Math.abs(noseTip.x - faceCenter.x);
        const lookingAway = xDeviation > 40;
        return { count: detections.length, lookingAway };
      }
      return { count: detections.length, lookingAway: false };
    } catch { return { count: 0, lookingAway: false }; }
  }

  async function takeSnapshot() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const { count, lookingAway } = await detectFace();
    let faceDetected = count === 1 && !lookingAway;
    let newStatus: typeof faceStatus = "ok";

    if (count === 0) { newStatus = "missing"; faceDetected = false; onNoFace(); }
    else if (count > 1) { newStatus = "multiple"; faceDetected = false; }
    else if (lookingAway) { newStatus = "missing"; faceDetected = false; }
    else { newStatus = "ok"; }

    setFaceStatus(faceApiRef.current ? newStatus : "unknown");

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const url = await uploadSnapshot(blob, token);
      if (url) onSnapshot(url, faceDetected);
    }, "image/jpeg", 0.6);
  }

  useEffect(() => {
    loadFaceApi();
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamActive(true);
      })
      .catch(() => setCamError("Camera access denied"));

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Periodic snapshots
  useEffect(() => {
    if (!camActive) return;
    const id = setInterval(takeSnapshot, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [camActive]);

  const STATUS_COLOR = { ok: "bg-emerald-500", missing: "bg-red-500", multiple: "bg-amber-500", unknown: "bg-slate-500" };
  const STATUS_LABEL = { ok: "Face OK", missing: "Face not detected", multiple: "Multiple faces", unknown: "Monitoring" };

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-36 object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {camError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <CameraOff size={20} className="text-red-400 mx-auto mb-1" />
            <p className="text-xs text-red-400">{camError}</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", STATUS_COLOR[faceStatus])} />
        <span className="text-[10px] text-white/80">{STATUS_LABEL[faceStatus]}</span>
      </div>
    </div>
  );
}

// ── Noise Detector ────────────────────────────────────────────────────────────

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
      .catch(() => { /* mic denied — skip noise detection */ });

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
        if (noiseCountRef.current >= 3) { // sustained noise
          onNoise();
          noiseCountRef.current = 0;
        }
      } else {
        noiseCountRef.current = 0;
      }
    }, AUDIO_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [micActive, onNoise]);

  return { micActive, level };
}

// ── Violation Banner ──────────────────────────────────────────────────────────

function ViolationBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-red-600 border border-red-400 rounded-2xl shadow-xl animate-pulse">
      <AlertTriangle size={16} className="text-red-100 flex-shrink-0" />
      <p className="text-sm font-semibold text-white">{message}</p>
      <button onClick={onDismiss} className="text-red-200 hover:text-white ml-2"><XCircle size={16} /></button>
    </div>
  );
}

// ── Exam Room ─────────────────────────────────────────────────────────────────

function ExamRoomContent() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { accessToken, user, setSession } = useAuthStore();

  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [violation, setViolation] = useState<string | null>(null);
  const [violations, setViolations] = useState<{ type: string; ts: number }[]>([]);
  const isFullscreen = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth: exchange SSO token if present in URL ──────────────────────────────

  const exchangeToken = params.get("token");

  useEffect(() => {
    if (!exchangeToken) return;
    api.post<any>("/auth/exchange-exam-token", { exam_token: exchangeToken })
      .then((res) => {
        const data = res?.data ?? res;
        setSession(data.access_token, data.user);
      })
      .catch(() => router.replace("/?error=auth"));
  }, []);

  // ── Load attempt ────────────────────────────────────────────────────────────

  useEffect(() => {
    const token = accessToken;
    if (!token || !attemptId) return;
    api.get<any>(`/exams/attempts/${attemptId}`, token)
      .then((res) => {
        const data = res?.data ?? res;
        setAttempt(data);
        const qs: any[] = (data.answers as any)?.questions ?? [];
        setQuestions(qs);
        setTimeLeft(data.time_limit_seconds ?? 3600);
        if (data.status !== "in_progress") {
          setSubmitted(true);
          setResult({ passed: data.passed, score: data.score_percentage, correct_answers: data.correct_answers, total_questions: data.total_questions });
        } else {
          setReady(true);
        }
      })
      .catch(() => router.replace("/"));
  }, [accessToken, attemptId]);

  // ── Timer ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [ready, submitted]);

  // ── Fullscreen ────────────────────────────────────────────────────────────────

  function enterFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {});
  }

  useEffect(() => {
    enterFullscreen();
    function onFsChange() {
      isFullscreen.current = !!document.fullscreenElement;
      if (!document.fullscreenElement && ready && !submitted) {
        logViolation("fullscreen_exit", "critical", { msg: "Exited fullscreen" });
        setViolation("You exited fullscreen! Return immediately or your exam may be flagged.");
        setTimeout(enterFullscreen, 2000);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [ready, submitted]);

  // ── Tab / focus detection ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready || submitted) return;
    function onBlur() {
      logViolation("focus_lost", "warning", { msg: "Window lost focus" });
      setViolation("Tab switching detected! Stay on this page during the exam.");
    }
    function onVisibility() {
      if (document.hidden) {
        logViolation("tab_switch", "critical", { msg: "Tab hidden" });
        setViolation("You switched tabs! This violation has been recorded.");
      }
    }
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ready, submitted]);

  // ── Copy/paste/right-click ────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready || submitted) return;
    function block(e: Event) { e.preventDefault(); }
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    function blockKeys(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a", "p"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        logViolation("copy_paste", "warning", { key: e.key });
      }
    }
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
    };
  }, [ready, submitted]);

  // ── Proctoring helpers ────────────────────────────────────────────────────────

  function logViolation(type: string, severity: string, detail?: any) {
    const token = accessToken;
    if (!token || !attemptId) return;
    setViolations((v) => [...v, { type, ts: Date.now() }]);
    api.post(`/exams/attempts/${attemptId}/proctor-events`, { event_type: type, severity, detail }, token)
      .catch(() => {});
  }

  function handleSnapshot(url: string, faceDetected: boolean) {
    const token = accessToken;
    if (!token || !attemptId) return;
    api.post(`/exams/attempts/${attemptId}/snapshots`, { snapshot_url: url, face_detected: faceDetected }, token)
      .catch(() => {});
    if (!faceDetected) {
      logViolation("face_missing", "critical", { snapshot_url: url });
      setViolation("Face not detected! Please ensure you are visible on camera.");
    }
  }

  const handleNoFace = useCallback(() => {
    setViolation("Face not detected in your webcam — please reposition.");
    logViolation("face_missing", "warning", {});
  }, [attemptId, accessToken]);

  const handleNoise = useCallback(() => {
    setViolation("Background noise detected. Please ensure a quiet environment.");
    logViolation("noise_detected", "warning", {});
  }, [attemptId, accessToken]);

  const { micActive, level: audioLevel } = useNoiseDetector(handleNoise);

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      const token = accessToken;
      const res = await api.post<any>(
        `/exams/attempts/${attemptId}/submit`,
        { answers },
        token ?? undefined,
      );
      const data = res?.data ?? res;
      setResult(data);
      setSubmitted(true);
      clearInterval(timerRef.current!);
      document.exitFullscreen().catch(() => {});
    } catch (e: any) {
      alert(e?.message ?? "Submit failed — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Results screen ────────────────────────────────────────────────────────────

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className={cn("inline-flex items-center justify-center w-24 h-24 rounded-full", result.passed ? "bg-emerald-900 border-2 border-emerald-500" : "bg-red-900 border-2 border-red-500")}>
            {result.passed
              ? <CheckCircle size={44} className="text-emerald-400" />
              : <XCircle size={44} className="text-red-400" />}
          </div>
          <div>
            <h1 className={cn("text-4xl font-black", result.passed ? "text-emerald-400" : "text-red-400")}>
              {result.passed ? "Congratulations!" : "Not Passed"}
            </h1>
            <p className="text-slate-300 mt-2">
              Score: <span className="font-bold text-white text-xl">{result.score_percentage ?? result.score}%</span>
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {result.correct_answers} / {result.total_questions} correct
            </p>
          </div>
          {result.passed && (
            <p className="text-emerald-300 text-sm">Your certificate will be issued automatically.</p>
          )}
          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                window.location.href = (process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3001") + "/dashboard";
              }
            }}
            className="px-6 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-semibold transition-colors"
          >
            Close & Return to Portal
          </button>
          {violations.length > 0 && (
            <p className="text-xs text-slate-500">{violations.length} proctoring event(s) recorded.</p>
          )}
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-navy-400" />
      </div>
    );
  }

  const q = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const pct = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
  const urgent = timeLeft < 300;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none">
      {/* Violation banner */}
      {violation && <ViolationBanner message={violation} onDismiss={() => setViolation(null)} />}

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-navy-400" />
          <span className="text-white font-black text-sm">paiiexams</span>
          <span className="text-slate-500 text-xs">·</span>
          <span className="text-slate-400 text-xs">{attempt?.enrollment?.certification?.acronym ?? "Exam"}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Audio level */}
          <div className="flex items-center gap-1.5">
            {micActive ? <Mic size={13} className="text-slate-400" /> : <MicOff size={13} className="text-red-400" />}
            <div className="flex gap-0.5 items-end h-3">
              {[0.05, 0.1, 0.15, 0.2].map((threshold, i) => (
                <div key={i} className={cn("w-1 rounded-sm", audioLevel > threshold ? "bg-emerald-500" : "bg-slate-700")}
                  style={{ height: `${40 + i * 15}%` }} />
              ))}
            </div>
          </div>
          {/* Timer */}
          <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono font-bold text-sm",
            urgent ? "bg-red-900 text-red-300 animate-pulse" : "bg-slate-800 text-white")}>
            <Clock size={13} className={urgent ? "text-red-400" : "text-slate-400"} />
            {fmtTimer(timeLeft)}
          </div>
          {/* Fullscreen */}
          <button onClick={enterFullscreen} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — proctor panel */}
        <div className="w-52 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 p-3 gap-3">
          <ProctorCamera onSnapshot={handleSnapshot} onNoFace={handleNoFace} token={accessToken ?? ""} attemptId={attemptId} />

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Progress</span>
              <span>{answered}/{questions.length}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-navy-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Violations log */}
          {violations.length > 0 && (
            <div className="mt-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Flag size={9} /> {violations.length} Event{violations.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {violations.slice(-5).map((v, i) => (
                  <p key={i} className="text-[9px] text-red-400 truncate">{v.type}</p>
                ))}
              </div>
            </div>
          )}

          {/* Question navigator */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Questions</p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    "w-full aspect-square rounded text-[10px] font-bold transition-colors",
                    i === currentIdx ? "bg-navy-600 text-white" :
                    answers[questions[i]?.id] !== undefined ? "bg-emerald-800 text-emerald-300" :
                    "bg-slate-800 text-slate-400 hover:bg-slate-700",
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main question area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {q ? (
            <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-8">
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2">
                  Question {currentIdx + 1} of {questions.length}
                  {q.topic_tag && <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{q.topic_tag}</span>}
                </p>
                <p className="text-lg font-semibold text-white leading-relaxed">{q.question_text}</p>
              </div>

              <div className="space-y-3">
                {(Array.isArray(q.options) ? q.options : []).map((opt: string, oi: number) => {
                  const selected = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border text-left text-sm transition-all",
                        selected
                          ? "border-navy-500 bg-navy-900 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800",
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0",
                        selected ? "bg-navy-500 text-white" : "bg-slate-800 text-slate-400",
                      )}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No question available
            </div>
          )}

          {/* Navigation footer */}
          <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-t border-slate-800 bg-slate-900">
            <button
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm font-medium transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => {
                  const unanswered = questions.length - answered;
                  const msg = unanswered > 0
                    ? `You have ${unanswered} unanswered question(s). Submit anyway?`
                    : "Submit your exam? You cannot change answers after submission.";
                  if (confirm(msg)) handleSubmit();
                }}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-bold transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Submit Exam
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    }>
      <ExamRoomContent />
    </Suspense>
  );
}
