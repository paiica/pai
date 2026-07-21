"use client";

import { useEffect, useRef, useState } from "react";
import { GraduationCap, X, Send, Loader2, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = [
  "Explain this in simpler terms",
  "Give me a real-world example",
  "Quiz me on this",
];

// Floating corner chat widget a student can open while viewing a lesson to
// ask an AI to explain concepts/theories and give examples grounded in the
// lesson they're currently on. One component serves both player tracks —
// apiBasePath is the only thing that differs between them ("/learn" for
// certification-track, "/prep-courses/learn" for prep-course-track).
export default function AiProfessorWidget({
  enrollmentId, lessonId, lessonTitle, courseTitle, apiBasePath,
}: {
  enrollmentId: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  apiBasePath: "/learn" | "/prep-courses/learn";
}) {
  const token = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Fresh conversation per lesson — the chat isn't persisted, so switching
  // lessons should start clean rather than carrying over stale context.
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError("");
  }, [lessonId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending || !token) return;
    setError("");
    const history = messages;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const res = await api.post<any>(
        `${apiBasePath}/${enrollmentId}/lesson/${lessonId}/ai-professor`,
        { message: trimmed, history },
        token,
      );
      const reply = (res?.data ?? res)?.reply ?? "Sorry, I didn't catch that — could you try again?";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setError(err?.message ?? "The AI Professor is unavailable right now.");
      setMessages(history); // roll back the optimistic user message on failure
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[520px] max-h-[75vh] rounded-2xl shadow-2xl bg-white border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 bg-[#171527] flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={16} className="text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">AI Professor</p>
              <p className="text-white/40 text-[11px] truncate">{lessonTitle}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-teal-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-slate-700 max-w-[85%]">
                    Hi! I'm your AI Professor for <span className="font-semibold">{courseTitle}</span>. Ask me to
                    explain any concept from this lesson, or request an example.
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-8">
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 rounded-full px-3 py-1.5 transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={cn("flex items-start gap-2", m.role === "user" && "justify-end")}>
                  {m.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={12} className="text-teal-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-[#171527] text-white rounded-2xl rounded-tr-sm"
                        : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-teal-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this lesson…"
              disabled={sending}
              className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="w-9 h-9 rounded-xl bg-[#171527] hover:bg-[#2d2b43] disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all",
          open ? "bg-slate-700 hover:bg-slate-800" : "bg-teal-600 hover:bg-teal-500"
        )}
        title="Ask the AI Professor"
      >
        {open ? <X size={22} className="text-white" /> : <GraduationCap size={22} className="text-white" />}
      </button>
    </>
  );
}
