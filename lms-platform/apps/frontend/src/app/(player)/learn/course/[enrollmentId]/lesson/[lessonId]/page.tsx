"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { CheckCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

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

  const { data: lesson, isLoading } = useSWR(
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
        {(lesson.type === "download" || lesson.type === "assignment") && <DownloadLesson lesson={lesson} />}
        {!["video", "reading", "html", "download", "assignment"].includes(lesson.type) && (
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
