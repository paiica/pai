"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Shield, Camera, CameraOff, Mic, MicOff, Maximize, AlertTriangle,
  ChevronLeft, ChevronRight, Clock, CheckCircle, Loader2,
  XCircle, Flag, FlaskConical,
} from "lucide-react";

const SNAPSHOT_INTERVAL_MS = 90_000;
const AUDIO_CHECK_INTERVAL_MS = 5_000;
const NOISE_THRESHOLD = 0.15;

const MOCK_QUESTIONS = [
  { id: "q1", question_text: "What does AI stand for?", options: ["Automated Intelligence", "Artificial Intelligence", "Applied Intelligence", "Advanced Integration"], correct_index: 1, topic_tag: "Fundamentals" },
  { id: "q2", question_text: "Which of the following is a machine learning technique?", options: ["SQL queries", "Neural networks", "HTTP requests", "CSS styling"], correct_index: 1, topic_tag: "ML" },
  { id: "q3", question_text: "What is the primary purpose of a training dataset?", options: ["To test the model", "To deploy the model", "To teach the model patterns", "To visualize results"], correct_index: 2, topic_tag: "ML" },
  { id: "q4", question_text: "Which programming language is most commonly used in AI development?", options: ["PHP", "COBOL", "Python", "Perl"], correct_index: 2, topic_tag: "Tools" },
  { id: "q5", question_text: "What does NLP stand for?", options: ["Natural Language Processing", "Neural Layer Protocol", "Numeric Logic Programming", "Network Learning Pipeline"], correct_index: 0, topic_tag: "NLP" },
];

function cn(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }

function fmtTimer(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function ViolationBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-red-600 border border-red-400 rounded-2xl shadow-xl">
      <AlertTriangle size={16} className="text-red-100 flex-shrink-0" />
      <p className="text-sm font-semibold text-white">{message}</p>
      <button onClick={onDismiss} className="text-red-200 hover:text-white ml-2"><XCircle size={16} /></button>
    </div>
  );
}

function ProctorCamera({ onNoFace }: { onNoFace: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camActive, setCamActive] = useState(false);
  const [camError, setCamError] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

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

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-36 object-cover" />
      {camError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <CameraOff size={20} className="text-red-400 mx-auto mb-1" />
            <p className="text-[10px] text-red-400">{camError}</p>
          </div>
        </div>
      )}
      {camActive && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-white/80">Camera active</span>
        </div>
      )}
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

export default function DemoExamPage() {
  const questions = MOCK_QUESTIONS;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 min demo
  const [submitted, setSubmitted] = useState(false);
  const [violation, setViolation] = useState<string | null>(null);
  const [violations, setViolations] = useState<{ type: string }[]>([]);

  function logViolation(type: string, message: string) {
    setViolations(v => [...v, { type }]);
    setViolation(message);
  }

  const handleNoise = useCallback(() => {
    logViolation("noise_detected", "Background noise detected. Please ensure a quiet environment.");
  }, []);

  const { micActive, level: audioLevel } = useNoiseDetector(handleNoise);

  // Timer
  useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [submitted]);

  // Fullscreen
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

  // Tab detection
  useEffect(() => {
    if (submitted) return;
    function onVisibility() {
      if (document.hidden) logViolation("tab_switch", "Tab switching detected! This violation has been recorded.");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [submitted]);

  // Copy/paste block
  useEffect(() => {
    if (submitted) return;
    function block(e: Event) { e.preventDefault(); }
    document.addEventListener("copy", block);
    document.addEventListener("contextmenu", block);
    return () => { document.removeEventListener("copy", block); document.removeEventListener("contextmenu", block); };
  }, [submitted]);

  function handleSubmit() {
    if (!confirm("Submit demo exam?")) return;
    setSubmitted(true);
    document.exitFullscreen().catch(() => {});
  }

  if (submitted) {
    const correct = questions.filter(q => answers[q.id] === q.correct_index).length;
    const score = Math.round((correct / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className={cn("inline-flex items-center justify-center w-24 h-24 rounded-full", score >= 70 ? "bg-emerald-900 border-2 border-emerald-500" : "bg-red-900 border-2 border-red-500")}>
            {score >= 70 ? <CheckCircle size={44} className="text-emerald-400" /> : <XCircle size={44} className="text-red-400" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-900/50 border border-amber-700 rounded-full text-amber-400 text-xs font-semibold mb-3">
              <FlaskConical size={12} /> Demo Mode
            </div>
            <h1 className={cn("text-4xl font-black", score >= 70 ? "text-emerald-400" : "text-red-400")}>
              {score >= 70 ? "Demo Passed!" : "Demo Complete"}
            </h1>
            <p className="text-slate-300 mt-2">Score: <span className="font-bold text-white text-xl">{score}%</span></p>
            <p className="text-slate-400 text-sm mt-1">{correct} / {questions.length} correct</p>
          </div>
          {violations.length > 0 && (
            <p className="text-xs text-slate-500">{violations.length} proctoring event(s) recorded (demo — not saved).</p>
          )}
          <a href="/" className="inline-block px-6 py-3 bg-navy-700 hover:bg-navy-600 text-white rounded-xl font-semibold transition-colors">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const urgent = timeLeft < 300;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col select-none">
      {violation && <ViolationBanner message={violation} onDismiss={() => setViolation(null)} />}

      {/* Demo banner */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 py-1.5 bg-amber-900/40 border-b border-amber-800 text-amber-400 text-xs font-semibold">
        <FlaskConical size={12} /> Demo Mode — proctoring is active but answers are not saved
      </div>

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-navy-400" />
          <span className="text-white font-black text-sm">paiiexams</span>
          <span className="text-slate-500 text-xs">· Demo Exam</span>
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
          <ProctorCamera onNoFace={() => logViolation("face_missing", "Face not detected — please reposition.")} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Progress</span><span>{answered}/{questions.length}</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-navy-500 rounded-full transition-all" style={{ width: `${Math.round((answered / questions.length) * 100)}%` }} />
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
              {questions.map((_, i) => (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  className={cn("w-full aspect-square rounded text-[10px] font-bold transition-colors",
                    i === currentIdx ? "bg-navy-600 text-white" :
                    answers[questions[i].id] !== undefined ? "bg-emerald-800 text-emerald-300" :
                    "bg-slate-800 text-slate-400 hover:bg-slate-700")}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 max-w-3xl mx-auto w-full px-8 py-8">
            <div className="mb-6">
              <p className="text-xs text-slate-500 mb-2">
                Question {currentIdx + 1} of {questions.length}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{q.topic_tag}</span>
              </p>
              <p className="text-lg font-semibold text-white leading-relaxed">{q.question_text}</p>
            </div>
            <div className="space-y-3">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <button key={oi} onClick={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                    className={cn("w-full flex items-center gap-4 p-4 rounded-xl border text-left text-sm transition-all",
                      selected ? "border-navy-500 bg-navy-900 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:bg-slate-800")}>
                    <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0",
                      selected ? "bg-navy-500 text-white" : "bg-slate-800 text-slate-400")}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
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
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors">
                <CheckCircle size={14} /> Submit Demo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
