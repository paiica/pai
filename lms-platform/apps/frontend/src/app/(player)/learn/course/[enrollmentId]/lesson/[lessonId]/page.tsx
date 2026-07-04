"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CheckCircle, Download, ExternalLink, Loader2, XCircle, RotateCcw, Award, Upload, AlertCircle, Clock } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

function isHTML(text: string) {
  return (text ?? "").trim().startsWith("<");
}

function VideoLesson({ lesson }: { lesson: any }) {
  const isYouTube = lesson.video_url?.includes("youtube.com") || lesson.video_url?.includes("youtu.be");
  const isVimeo   = lesson.video_url?.includes("vimeo.com");
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
          isHTML(lesson.content_body)
            ? <div className="prose prose-slate prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
            : <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{lesson.content_body}</p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {lesson.video_url ? (
        <div className="aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
          <video src={lesson.video_url} controls className="w-full h-full" />
        </div>
      ) : (
        <div className="aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
          Video URL not configured
        </div>
      )}
      {lesson.content_body && (
        isHTML(lesson.content_body)
          ? <div className="prose prose-slate prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
          : <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{lesson.content_body}</p>
      )}
    </div>
  );
}

function ReadingLesson({ lesson }: { lesson: any }) {
  return lesson.content_body ? (
    isHTML(lesson.content_body)
      ? <div className="prose prose-slate prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
      : <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{lesson.content_body}</p>
  ) : (
    <div className="p-8 bg-slate-50 rounded-xl text-slate-500 text-sm text-center">Content not available.</div>
  );
}

function QuizLesson({ lesson }: { lesson: any }) {
  const questions: any[] = lesson.questions ?? [];
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!questions.length) {
    return (
      <div className="p-8 bg-slate-50 rounded-xl text-slate-500 text-sm text-center">
        No questions have been added to this quiz yet.
      </div>
    );
  }

  const score = submitted
    ? questions.reduce((acc, q, i) => acc + (selected[i] === q.correct_index ? (q.points ?? 1) : 0), 0)
    : 0;
  const total = questions.reduce((acc, q) => acc + (q.points ?? 1), 0);
  const passing = lesson.passing_score ?? 70;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= passing;

  function reset() {
    setSelected({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-6">
      {submitted && (
        <div className={cn(
          "flex items-center justify-between p-5 rounded-2xl",
          passed ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
        )}>
          <div className="flex items-center gap-3">
            {passed
              ? <Award size={20} className="text-emerald-600" />
              : <XCircle size={20} className="text-red-500" />}
            <div>
              <p className={cn("font-bold text-sm", passed ? "text-emerald-700" : "text-red-700")}>
                {passed ? "Quiz Passed!" : "Quiz Failed"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {score}/{total} points · {pct}% · passing score {passing}%
              </p>
            </div>
          </div>
          <button onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 transition-colors">
            <RotateCcw size={13} /> Retry
          </button>
        </div>
      )}

      {questions.map((q, qi) => {
        const options: string[] = Array.isArray(q.options) ? q.options : JSON.parse(q.options ?? "[]");
        const answered = selected[qi] !== undefined;
        const isCorrect = answered && selected[qi] === q.correct_index;

        return (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className={cn(
                "mt-0.5 flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center",
                !submitted ? "bg-slate-100 text-slate-500"
                  : isCorrect ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600"
              )}>
                {qi + 1}
              </span>
              <p className="text-sm font-semibold text-navy-900 leading-relaxed">{q.question_text}</p>
            </div>

            <div className="space-y-2 pl-9">
              {options.map((opt, oi) => {
                const isSelected = selected[qi] === oi;
                const isRight = oi === q.correct_index;
                let optStyle = "border-slate-200 text-slate-700 hover:border-navy-400 hover:bg-slate-50";
                if (submitted) {
                  if (isRight) optStyle = "border-emerald-400 bg-emerald-50 text-emerald-800";
                  else if (isSelected && !isRight) optStyle = "border-red-400 bg-red-50 text-red-700";
                  else optStyle = "border-slate-100 text-slate-400";
                } else if (isSelected) {
                  optStyle = "border-navy-600 bg-navy-50 text-navy-900";
                }

                return (
                  <button
                    key={oi}
                    disabled={submitted}
                    onClick={() => !submitted && setSelected((s) => ({ ...s, [qi]: oi }))}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all flex items-center gap-3",
                      optStyle,
                      !submitted && "cursor-pointer"
                    )}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                      isSelected && !submitted ? "border-navy-600 bg-navy-600" : "border-current"
                    )}>
                      {isSelected && !submitted && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      {submitted && isRight && <CheckCircle size={14} className="text-emerald-600" />}
                      {submitted && isSelected && !isRight && <XCircle size={14} className="text-red-500" />}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {submitted && q.explanation && (
              <div className="pl-9 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 leading-relaxed">
                <span className="font-semibold">Explanation: </span>{q.explanation}
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <button
          disabled={Object.keys(selected).length < questions.length}
          onClick={() => setSubmitted(true)}
          className="w-full py-3.5 bg-navy-900 hover:bg-navy-700 disabled:opacity-40 text-white font-bold text-sm rounded-2xl transition-all"
        >
          Submit Quiz ({Object.keys(selected).length}/{questions.length} answered)
        </button>
      )}
    </div>
  );
}

function AssignmentLesson({
  lesson, enrollmentId, token, onComplete,
}: { lesson: any; enrollmentId: string; token: string; onComplete: () => void }) {
  const submission = lesson.submission;
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
  const isGraded = submission?.grade !== null && submission?.grade !== undefined;
  const MAX_ATTEMPTS = 2;
  const attemptsUsed = submission?.attempt_count ?? 0;
  const canResubmit = attemptsUsed < MAX_ATTEMPTS;

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
        `/prep-courses/learn/${enrollmentId}/lesson/${lesson.id}/assignment/submit`,
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

  return (
    <div className="space-y-5">
      {(lesson.content_body || lesson.description) && (
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="font-semibold text-amber-800 text-sm mb-2">Instructions</p>
          {(() => {
            const body: string = lesson.content_body || lesson.description || "";
            return isHTML(body) ? (
              <div className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
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
          <AlertCircle size={14} /> Maximum submissions reached ({attemptsUsed}/{MAX_ATTEMPTS}) — awaiting review by your instructor
        </div>
      ) : submission ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <CheckCircle size={14} /> Submitted — awaiting review by your instructor
          <span className="text-blue-500">· attempt {attemptsUsed}/{MAX_ATTEMPTS}</span>
        </div>
      ) : null}

      {!isGraded && canResubmit && (
        <>
          {allowText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700">
                  Written Response <span className="text-slate-400 font-normal">(optional if file attached)</span>
                </label>
                {wordLimit != null && (
                  <span className={cn("text-xs font-medium tabular-nums", overLimit ? "text-red-600" : "text-slate-400")}>
                    {wordCount} / {wordLimit} words
                  </span>
                )}
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Write your response here…"
                className={cn("w-full h-40 border border-slate-200 rounded-xl p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-navy-200", overLimit && "border-red-400 focus:ring-red-300")}
              />
              {overLimit && (
                <p className="text-xs text-red-600 mt-1">
                  Over limit by {wordCount - wordLimit!} word{wordCount - wordLimit! !== 1 ? "s" : ""}. Please shorten your response.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Attach File <span className="text-slate-400 font-normal">(optional if text provided)</span>
            </label>
            {uploadedFile ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Download size={16} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 flex-1 truncate">{uploadedFile.name}</span>
                <button onClick={() => setUploadedFile(null)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Remove
                </button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                uploading ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-navy-300 hover:bg-slate-50"
              )}>
                {uploading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Upload size={20} className="text-slate-400" />}
                <span className="text-sm text-slate-500">{uploading ? "Uploading…" : "Click to upload PDF, Word, or other file"}</span>
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
            className="w-full inline-flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {submission ? "Resubmit Assignment" : "Submit Assignment"}
          </button>
        </>
      )}
    </div>
  );
}

function DownloadLesson({ lesson }: { lesson: any }) {
  return (
    <div className="space-y-5">
      {lesson.content_body && (
        <div className="p-5 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed">
          {isHTML(lesson.content_body)
            ? <div dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
            : lesson.content_body}
        </div>
      )}
      <div className="flex gap-3">
        {lesson.download_url && (
          <a href={lesson.download_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-navy-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-700 transition-colors">
            <Download size={15} /> Download File
          </a>
        )}
        {lesson.external_url && (
          <a href={lesson.external_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 border border-navy-900/20 text-navy-900 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy-50 transition-colors">
            <ExternalLink size={15} /> Open Resource
          </a>
        )}
      </div>
    </div>
  );
}

export default function CoursePrepLessonPage() {
  const { enrollmentId, lessonId } = useParams<{ enrollmentId: string; lessonId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;

  const { data: lesson, isLoading, mutate } = useSWR(
    token && enrollmentId && lessonId
      ? [`/prep-courses/learn/${enrollmentId}/lesson/${lessonId}`, token]
      : null,
    ([url, t]) => fetcher(url, t)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href={`/learn/course/${enrollmentId}`} className="hover:text-navy-700 transition-colors">
          Course Overview
        </Link>
        <span>/</span>
        <span className="text-slate-600">{lesson.module_title}</span>
        <span>/</span>
        <span className="text-navy-900 font-medium">{lesson.title}</span>
      </div>

      {/* Lesson title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">
            {lesson.type}
          </span>
          {lesson.duration_minutes > 0 && (
            <span className="text-xs text-slate-400">{lesson.duration_minutes} min</span>
          )}
        </div>
        <h1 className="text-xl font-display font-black text-navy-900">{lesson.title}</h1>
      </div>

      {/* Lesson content */}
      <div className="mb-8">
        {lesson.type === "video" && <VideoLesson lesson={lesson} />}
        {(lesson.type === "reading" || lesson.type === "html") && <ReadingLesson lesson={lesson} />}
        {lesson.type === "download" && <DownloadLesson lesson={lesson} />}
        {lesson.type === "assignment" && (
          <AssignmentLesson lesson={lesson} enrollmentId={enrollmentId} token={token} onComplete={() => mutate()} />
        )}
        {lesson.type === "quiz" && <QuizLesson lesson={lesson} />}
        {!["video", "reading", "html", "download", "assignment", "quiz"].includes(lesson.type) && (
          lesson.content_body ? (
            isHTML(lesson.content_body)
              ? <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content_body }} />
              : <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{lesson.content_body}</p>
          ) : (
            <div className="p-8 bg-slate-50 rounded-xl text-slate-500 text-sm text-center">No content available for this lesson.</div>
          )
        )}
      </div>

      {/* Done indicator */}
      <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium p-4 bg-emerald-50 rounded-xl">
        <CheckCircle size={16} />
        You're viewing this lesson
      </div>
    </div>
  );
}
