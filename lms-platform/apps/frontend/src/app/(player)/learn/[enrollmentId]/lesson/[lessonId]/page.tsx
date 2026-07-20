"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  CheckCircle, Clock, Download, ExternalLink,
  AlertCircle, Loader2, RotateCcw, Upload,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { enhanceSortingExercises } from "@/lib/interactive-content";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data);
}

// ─── Video ────────────────────────────────────────────────────────────────────

function VideoLesson({
  lesson, enrollmentId, token, onComplete,
}: { lesson: any; enrollmentId: string; token: string; onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [completed, setCompleted] = useState(false);

  async function markComplete() {
    await api.post<any>(`/learn/${enrollmentId}/lesson/${lesson.id}/complete`, {
      watch_seconds: Math.round(videoRef.current?.currentTime ?? 0),
    }, token);
    setCompleted(true);
    onComplete();
  }

  function handleTimeUpdate() {
    if (!videoRef.current || completed) return;
    const pct = videoRef.current.currentTime / videoRef.current.duration;
    if (pct >= 0.9) markComplete();
  }

  const isYouTube = lesson.video_url?.includes("youtube.com") || lesson.video_url?.includes("youtu.be");
  const isVimeo = lesson.video_url?.includes("vimeo.com");

  const isHTML = (lesson.content_body ?? "").trim().startsWith("<");

  if (isYouTube || isVimeo) {
    const ytId = isYouTube
      ? (lesson.video_url?.split("v=")[1]?.split("&")[0] ?? lesson.video_url?.split("/").pop())
      : null;
    const embedUrl = isYouTube
      ? `https://www.youtube.com/embed/${ytId}?rel=0`
      : `https://player.vimeo.com/video/${lesson.video_url?.split("/").pop()}`;

    return (
      <div className="space-y-4">
        <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen title={lesson.title} />
        </div>
        {lesson.content_body && (
          isHTML ? (
            <div className="prose prose-slate prose-sm max-w-none pt-2" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
          ) : (
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap pt-2">{lesson.content_body}</p>
          )
        )}
        <button onClick={markComplete} className="btn-primary w-full justify-center">
          <CheckCircle size={16} /> Mark as Completed
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lesson.video_url ? (
        <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
          <video
            ref={videoRef}
            src={lesson.video_url}
            controls
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      ) : (
        <div className="aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
          Video URL not configured
        </div>
      )}
      {lesson.content_body && (
        isHTML ? (
          <div
            className="prose prose-slate prose-sm max-w-none pt-2"
            dangerouslySetInnerHTML={{ __html: lesson.content_body }}
          />
        ) : (
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap pt-2">
            {lesson.content_body}
          </p>
        )
      )}
      {!completed && (
        <button onClick={markComplete} className="btn-outline w-full justify-center">
          <CheckCircle size={16} /> Mark as Watched
        </button>
      )}
    </div>
  );
}

// ─── Reading ──────────────────────────────────────────────────────────────────

function ReadingLesson({
  lesson, enrollmentId, token, onComplete,
}: { lesson: any; enrollmentId: string; token: string; onComplete: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!contentRef.current) return;
    return enhanceSortingExercises(contentRef.current);
  }, [lesson.content_body]);

  async function complete() {
    await toast.promise(
      api.post<any>(`/learn/${enrollmentId}/lesson/${lesson.id}/complete`, {}, token).then(onComplete),
      { loading: "Saving…", success: "Marked complete!", error: "Failed" }
    );
  }

  return (
    <div className="space-y-6">
      {lesson.content_body ? (
        <div
          ref={contentRef}
          className="prose prose-slate prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: lesson.content_body }}
        />
      ) : (
        <div className="p-8 bg-slate-50 rounded-xl text-slate-500 text-sm text-center">
          Content not available.
        </div>
      )}
      <button onClick={complete} className="btn-primary w-full justify-center">
        <CheckCircle size={16} /> Mark as Read
      </button>
    </div>
  );
}

// ─── Download / Resource ──────────────────────────────────────────────────────

function DownloadLesson({
  lesson, enrollmentId, token, onComplete,
}: { lesson: any; enrollmentId: string; token: string; onComplete: () => void }) {
  async function complete() {
    await api.post<any>(`/learn/${enrollmentId}/lesson/${lesson.id}/complete`, {}, token);
    onComplete();
  }

  return (
    <div className="space-y-5">
      {lesson.content_body && (
        <div className="p-5 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed">
          {lesson.content_body}
        </div>
      )}
      <div className="flex justify-center">
        {lesson.download_url ? (
          <a
            href={lesson.download_url}
            target="_blank"
            rel="noreferrer"
            onClick={complete}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Download size={16} /> Download File
          </a>
        ) : lesson.external_url ? (
          <a
            href={lesson.external_url}
            target="_blank"
            rel="noreferrer"
            onClick={complete}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ExternalLink size={16} /> Open Resource
          </a>
        ) : (
          <p className="text-slate-400 text-sm">No resource URL configured.</p>
        )}
      </div>
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizLesson({
  lesson, enrollmentId, token, progress, onComplete,
}: { lesson: any; enrollmentId: string; token: string; progress: any; onComplete: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const maxAttempts = lesson.max_attempts ?? 3;
  const attemptsUsed = progress?.quiz_attempts ?? 0;
  const canAttempt = attemptsUsed < maxAttempts;
  const questions = lesson.quiz_questions ?? [];

  async function submit() {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Answer all questions before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<any>(
        `/learn/${enrollmentId}/lesson/${lesson.id}/quiz/submit`,
        { answers },
        token
      );
      const r = (res as any).data ?? res;
      setResult(r);
      if (r.passed) onComplete();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canAttempt && !result) {
    return (
      <div className="p-8 bg-red-50 rounded-xl text-center">
        <AlertCircle size={36} className="mx-auto mb-3 text-red-400" />
        <p className="font-semibold text-red-800">Maximum attempts reached ({maxAttempts})</p>
        <p className="text-sm text-red-600 mt-1">
          {progress?.quiz_passed
            ? `You passed with ${progress.quiz_score}%`
            : "Contact your instructor for assistance."}
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <div className={cn(
        "p-8 rounded-xl text-center",
        result.passed
          ? "bg-emerald-50 border border-emerald-200"
          : "bg-red-50 border border-red-200"
      )}>
        <div className={cn("text-6xl font-black mb-2", result.passed ? "text-emerald-600" : "text-red-500")}>
          {result.score}%
        </div>
        <p className={cn("text-xl font-bold mb-1", result.passed ? "text-emerald-800" : "text-red-700")}>
          {result.passed ? "You passed!" : "Not quite — keep trying!"}
        </p>
        <p className="text-sm text-slate-500">
          Passing score: {result.passing_score}% · Attempts: {result.attempts_used}/{result.max_attempts}
        </p>
        {!result.passed && result.attempts_used < result.max_attempts && (
          <button
            onClick={() => { setAnswers({}); setResult(null); }}
            className="mt-5 btn-outline mx-auto inline-flex items-center gap-2"
          >
            <RotateCcw size={14} /> Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {attemptsUsed > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Previous score: {progress?.quiz_score}% · {maxAttempts - attemptsUsed} attempt{maxAttempts - attemptsUsed !== 1 ? "s" : ""} remaining
        </div>
      )}

      {questions.map((q: any, qi: number) => (
        <div key={q.id} className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
            <p className="font-semibold text-navy-900 text-sm">
              {qi + 1}. {q.question_text}
              {q.points > 1 && <span className="ml-2 text-xs text-slate-400 font-normal">({q.points} pts)</span>}
            </p>
          </div>
          <div className="p-4 space-y-2">
            {(q.options as string[]).map((opt, oi) => (
              <label
                key={oi}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  answers[q.id] === oi
                    ? "border-navy-500 bg-navy-50"
                    : "border-slate-100 hover:border-navy-200 hover:bg-slate-50"
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={oi}
                  checked={answers[q.id] === oi}
                  onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                  className="accent-navy-600"
                />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={submit}
        disabled={submitting || Object.keys(answers).length < questions.length}
        className="btn-primary w-full justify-center disabled:opacity-50"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
        Submit Quiz
      </button>
    </div>
  );
}

// ─── HTML Page ────────────────────────────────────────────────────────────────

function HtmlLesson({
  lesson, enrollmentId, token, onComplete,
}: { lesson: any; enrollmentId: string; token: string; onComplete: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function complete() {
    await api.post<any>(`/learn/${enrollmentId}/lesson/${lesson.id}/complete`, {}, token);
    onComplete();
  }

  // SCORM packages carry a bridge script (injected at import time) that
  // implements window.API in-memory and reports out via postMessage, since
  // the SCO is hosted cross-origin on R2 and can't read window.parent.API
  // directly. Only messages from this exact iframe's contentWindow are
  // trusted — anything else on the page could otherwise spoof progress.
  useEffect(() => {
    function onScormMessage(event: MessageEvent) {
      if (event.data?.type !== "scorm-event") return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const cmi = event.data.cmi ?? {};
      const status = cmi["cmi.core.lesson_status"];
      const completed = status === "completed" || status === "passed";
      const rawScore = cmi["cmi.core.score.raw"];
      const score = rawScore !== undefined && rawScore !== "" && !Number.isNaN(Number(rawScore))
        ? Number(rawScore)
        : undefined;
      api.post<any>(
        `/learn/${enrollmentId}/lesson/${lesson.id}/scorm-progress`,
        { completed, score, cmi_snapshot: cmi },
        token
      ).then(() => { if (completed) onComplete(); }).catch(() => {});
    }
    window.addEventListener("message", onScormMessage);
    return () => window.removeEventListener("message", onScormMessage);
  }, [enrollmentId, lesson.id, token]);

  // "Preserve Original Design" imports set external_url instead of shipping
  // content_body — a real navigation (not innerHTML injection) so the
  // hosted course's own relative asset paths resolve correctly. Fills the
  // page's html-type container (see the parent page's width={100%} branch
  // that skips the max-w-3xl reading column for this lesson type) rather
  // than a 100vw viewport hack, which overshoots/undershoots depending on
  // the sidebar's open/collapsed width.
  // key={lesson.id} forces a fresh <iframe> DOM node per lesson — since
  // this component returns different JSX depending on external_url, React
  // can otherwise reuse the same underlying iframe element across lesson
  // switches, and `sandbox` doesn't reliably re-apply on a reused element
  // that's already mid-navigation: the hosted Rise app would throw
  // "sandboxed and lacks the allow-same-origin flag" reading
  // document.cookie and never boot, even with the correct attribute value.
  if (lesson.external_url) {
    return (
      <div key={lesson.id} style={{ width: "100%", height: "calc(100vh - 180px)", minHeight: 500 }}>
        <iframe
          key={lesson.id}
          ref={iframeRef}
          src={lesson.external_url}
          className="w-full h-full border-0"
          title={lesson.title}
          sandbox="allow-scripts allow-same-origin"
          onLoad={complete}
        />
      </div>
    );
  }

  return (
    <div key={lesson.id} className="flex flex-col" style={{ width: "100%", height: "calc(100vh - 220px)", minHeight: 400 }}>
      {lesson.content_body ? (
        <iframe
          key={lesson.id}
          srcDoc={lesson.content_body}
          className="flex-1 w-full rounded-xl border border-slate-200"
          title={lesson.title}
          style={{ border: "none" }}
          sandbox="allow-scripts"
          onLoad={complete}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          No HTML content added yet.
        </div>
      )}
    </div>
  );
}

// ─── Assignment ───────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function AssignmentLesson({
  lesson, enrollmentId, token, submission, onComplete,
}: { lesson: any; enrollmentId: string; token: string; submission: any; onComplete: () => void }) {
  const [textContent, setTextContent] = useState(submission?.text_content ?? "");
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string; size: number } | null>(
    submission?.file_url ? { url: submission.file_url, name: submission.file_name ?? "file", size: 0 } : null
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTextContent(submission?.text_content ?? "");
    setUploadedFile(submission?.file_url ? { url: submission.file_url, name: submission.file_name ?? "file", size: 0 } : null);
  }, [submission?.updated_at]);

  const allowText = lesson.allow_text_response !== false;
  const wordLimit = lesson.text_word_limit as number | undefined;
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const overLimit = allowText && wordLimit != null && wordCount > wordLimit;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/uploads/local`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      const url: string = data?.url ?? data?.data?.url;
      if (!url) throw new Error("No URL in upload response");
      setUploadedFile({ url, name: file.name, size: file.size });
      toast.success("File ready — click Submit to send your assignment");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!textContent.trim() && !uploadedFile) {
      toast.error("Add a text response or upload a file before submitting.");
      return;
    }
    if (overLimit) {
      toast.error(`Response exceeds the ${wordLimit}-word limit (${wordCount} words).`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post<any>(
        `/learn/${enrollmentId}/lesson/${lesson.id}/assignment/submit`,
        {
          text_content: textContent || undefined,
          file_url: uploadedFile?.url,
          file_name: uploadedFile?.name,
          file_size: uploadedFile?.size,
        },
        token
      );
      toast.success("Assignment submitted!");
      onComplete();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const isGraded = submission?.grade !== null && submission?.grade !== undefined;
  const MAX_ATTEMPTS = 2;
  const attemptsUsed = submission?.attempt_count ?? 0;
  const canResubmit = attemptsUsed < MAX_ATTEMPTS;

  return (
    <div className="space-y-5">
      {/* Instructions */}
      {(lesson.content_body || lesson.description) && (
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="font-semibold text-amber-800 text-sm mb-2">Instructions</p>
          {(() => {
            const body: string = lesson.content_body || lesson.description || "";
            return body.trim().startsWith("<") ? (
              <div
                className="text-sm text-slate-700 leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-1 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : (
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{body}</div>
            );
          })()}
        </div>
      )}

      {lesson.due_date && (
        <p className="text-sm text-amber-600 font-medium flex items-center gap-1.5">
          <Clock size={13} /> Due: {new Date(lesson.due_date).toLocaleDateString("en-CA", { dateStyle: "long" })}
        </p>
      )}

      {/* Grade / status banner */}
      {isGraded ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
          <p className="font-semibold text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle size={15} /> Graded: {submission.grade} / {lesson.max_score ?? 100}
          </p>
          {submission.feedback && (
            <p className="text-sm text-slate-700 leading-relaxed border-t border-emerald-200 pt-2 mt-2">{submission.feedback}</p>
          )}
          <p className="text-xs text-emerald-700/70 pt-1">This assignment has been graded and can no longer be resubmitted.</p>
        </div>
      ) : submission && !canResubmit ? (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <AlertCircle size={14} /> Maximum submissions reached ({attemptsUsed}/{MAX_ATTEMPTS}) — awaiting review by your professor
        </div>
      ) : submission ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <CheckCircle size={14} /> Submitted — awaiting review by your professor
          <span className="text-blue-500">· attempt {attemptsUsed}/{MAX_ATTEMPTS}</span>
        </div>
      ) : null}

      {!isGraded && canResubmit && (
        <>
          {/* Text response */}
          {allowText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  Written Response <span className="text-slate-400 font-normal">(optional if file attached)</span>
                </label>
                {wordLimit != null && (
                  <span className={cn(
                    "text-xs font-medium tabular-nums",
                    overLimit ? "text-red-600" : "text-slate-400"
                  )}>
                    {wordCount} / {wordLimit} words
                  </span>
                )}
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write your response here…"
                className={cn("input-base h-40 resize-y", overLimit && "border-red-400 focus:ring-red-300")}
              />
              {overLimit && (
                <p className="text-xs text-red-600 mt-1">
                  Over limit by {wordCount - wordLimit!} word{wordCount - wordLimit! !== 1 ? "s" : ""}. Please shorten your response.
                </p>
              )}
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Attach File <span className="text-slate-400 font-normal">(optional if text provided)</span>
            </label>
            {uploadedFile ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Download size={16} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 flex-1 truncate">{uploadedFile.name}</span>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                uploading ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-navy-300 hover:bg-slate-50"
              )}>
                {uploading
                  ? <Loader2 size={20} className="animate-spin text-blue-500" />
                  : <Upload size={20} className="text-slate-400" />}
                <span className="text-sm text-slate-500">
                  {uploading ? "Uploading…" : "Click to upload PDF, Word, or other file"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <button
            onClick={submit}
            disabled={submitting || uploading || overLimit}
            className="btn-primary w-full justify-center disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {submission ? "Resubmit Assignment" : "Submit Assignment"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const { enrollmentId, lessonId } = useParams<{ enrollmentId: string; lessonId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data, mutate } = useSWR(
    token ? [`/learn/${enrollmentId}/lesson/${lessonId}`, token] as const : null,
    ([url, t]) => fetcher(url, t)
  );

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-navy-400" />
      </div>
    );
  }

  const { lesson, progress, submission } = data;

  const isHtmlLesson = lesson.type === "html";

  return (
    <div className="px-6 py-8">
      {/* Lesson header */}
      <div className={cn("mb-7", !isHtmlLesson && "max-w-3xl mx-auto")}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="badge bg-slate-100 text-slate-600 capitalize">{lesson.type.replace("_", " ")}</span>
          <span className="text-sm text-slate-400 flex items-center gap-1">
            <Clock size={12} /> {lesson.duration_minutes}m
          </span>
          {progress?.completed && (
            <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <CheckCircle size={11} /> Completed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-display font-black text-navy-900 leading-tight">
          {lesson.title}
        </h1>
        {lesson.description && (
          <p className="text-slate-500 mt-1.5 text-sm leading-relaxed">{lesson.description}</p>
        )}
      </div>

      {/* Content */}
      <div className={cn("mb-8", !isHtmlLesson && "max-w-3xl mx-auto")}>
        {lesson.type === "video" && (
          <VideoLesson lesson={lesson} enrollmentId={enrollmentId} token={token} onComplete={() => mutate()} />
        )}
        {lesson.type === "reading" && (
          <ReadingLesson lesson={lesson} enrollmentId={enrollmentId} token={token} onComplete={() => mutate()} />
        )}
        {(lesson.type === "download" || lesson.type === "live_session") && (
          <DownloadLesson lesson={lesson} enrollmentId={enrollmentId} token={token} onComplete={() => mutate()} />
        )}
        {lesson.type === "quiz" && (
          <QuizLesson lesson={lesson} enrollmentId={enrollmentId} token={token} progress={progress} onComplete={() => mutate()} />
        )}
        {lesson.type === "html" && (
          <HtmlLesson lesson={lesson} enrollmentId={enrollmentId} token={token} onComplete={() => mutate()} />
        )}
        {lesson.type === "assignment" && (
          <AssignmentLesson lesson={lesson} enrollmentId={enrollmentId} token={token} submission={submission} onComplete={() => mutate()} />
        )}
      </div>

      {/* Resources */}
      {lesson.resources?.length > 0 && (
        <div className={cn("rounded-xl border border-slate-100 p-4", !isHtmlLesson && "max-w-3xl mx-auto")}>
          <p className="text-sm font-semibold text-navy-800 mb-3">Resources</p>
          <div className="space-y-2">
            {lesson.resources.map((r: any) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-800"
              >
                <Download size={13} /> {r.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
