"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

const AI_Q_TYPES = [
  { value: "mcq_single",   label: "MCQ Single" },
  { value: "mcq_multiple", label: "MCQ Multiple" },
  { value: "true_false",   label: "True / False" },
  { value: "open_short",   label: "Short Answer" },
  { value: "fill_blank",   label: "Fill in Blank" },
  { value: "matching",     label: "Matching" },
  { value: "ordering",     label: "Ordering" },
  { value: "dropdown",     label: "Dropdown" },
];

const ALL_Q_TYPES = AI_Q_TYPES.map((t) => t.value);

function AiExamGeneratePanel({
  certId, certName, accessToken, onClose,
}: {
  certId: string; certName?: string; accessToken: string; onClose(): void;
}) {
  const [examTitle, setExamTitle]         = useState("");
  const [customPrompt, setCustomPrompt]   = useState("");
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [topic, setTopic]                 = useState("");
  const [difficulty, setDifficulty]       = useState("intermediate");
  const [numSections, setNumSections]     = useState("3");
  const [qPerSection, setQPerSection]     = useState("5");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ALL_Q_TYPES);
  const [objectives, setObjectives]       = useState("");
  const [status, setStatus]               = useState<string | null>(null);
  const [error, setError]                 = useState("");
  const [generating, setGenerating]       = useState(false);

  function toggleType(t: string) {
    setSelectedTypes((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!examTitle.trim()) return;
    setGenerating(true); setError(""); setStatus("Generating exam structure…");
    try {
      const aiRes = await api.post<any>("/ai/generate-exam-structure", {
        exam_title: examTitle.trim(),
        topic:                 showAdvanced && topic.trim()    ? topic.trim()                                   : undefined,
        difficulty:            showAdvanced                    ? difficulty                                     : undefined,
        num_sections:          showAdvanced                    ? Math.max(1, parseInt(numSections) || 3)        : undefined,
        questions_per_section: showAdvanced                    ? Math.max(1, Math.min(20, parseInt(qPerSection) || 5)) : undefined,
        question_types:        showAdvanced                    ? selectedTypes                                  : undefined,
        cert_name: certName || undefined,
        learning_objectives: showAdvanced && objectives.trim() ? objectives.trim()                             : undefined,
        custom_prompt: customPrompt.trim() || undefined,
      }, accessToken);
      const sections: any[] = (aiRes.data ?? aiRes).sections ?? [];

      setStatus("Creating exam…");
      const examRes = await api.post<any>("/exams/admin/structured-exams", {
        certification_id: certId,
        title: examTitle.trim(),
      }, accessToken);
      const examId = (examRes.data ?? examRes).id;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        setStatus(`Creating section ${i + 1} / ${sections.length}: ${sec.title}…`);
        const secRes = await api.post<any>(`/exams/admin/structured-exams/${examId}/sections`, {
          title: sec.title,
          description: sec.description || undefined,
        }, accessToken);
        const sectionId = (secRes.data ?? secRes).id;
        for (const q of sec.questions ?? []) {
          await api.post<any>(`/exams/admin/sections/${sectionId}/questions`, {
            type: q.type, question_text: q.question_text,
            explanation: q.explanation || null, points: q.points || 1,
            options: q.options || [],
          }, accessToken);
        }
      }

      setStatus("Done! Opening builder…");
      window.location.href = `/certifications/${certId}/structured-exams/${examId}`;
    } catch (ex: any) {
      setError(ex.message ?? "Failed to generate exam.");
      setGenerating(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={generate} className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
          </svg>
          <h3 className="section-title">Generate Exam with AI</h3>
        </div>
        <button type="button" onClick={onClose} className="text-slate-600 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.07] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Exam title — only required field */}
      <div>
        <label className="label">Exam title *</label>
        <input className="input" placeholder="e.g. CAIP Exam A — Foundation Level" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required />
      </div>

      {/* Prompt — primary driver */}
      <div>
        <label className="label">Describe your exam</label>
        <textarea
          autoFocus
          className="input resize-none h-28 text-sm leading-relaxed"
          placeholder={`Describe the exam and the AI will handle the rest.\ne.g. "3 sections on AI governance — section 1: 5 MCQ on EU AI Act basics, section 2: 4 true/false + 2 MCQ on risk categories, section 3: 3 short-answer on audit requirements. Intermediate difficulty."`}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
        <p className="text-slate-600 text-[11px] mt-1">Specify sections, question counts, types, topics, and difficulty right in your description. The AI will follow it.</p>
      </div>

      {/* Advanced options — collapsed by default */}
      <div className="border-t border-slate-800/50 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced options
          <span className="text-slate-700">(override AI defaults)</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Topic / Subject <span className="text-slate-600 font-normal normal-case">(optional — AI infers from description)</span></label>
                <input className="input" placeholder="e.g. AI Ethics, Cloud Security Architecture…" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div>
                <label className="label">Difficulty <span className="text-slate-600 font-normal normal-case">(fallback)</span></label>
                <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className="label">Sections <span className="text-slate-600 font-normal normal-case">(fallback)</span></label>
                <input type="number" min={1} max={10} className="input" value={numSections} onChange={(e) => setNumSections(e.target.value)} />
              </div>
              <div>
                <label className="label">Questions / section <span className="text-slate-600 font-normal normal-case">(fallback)</span></label>
                <input type="number" min={1} max={20} className="input" value={qPerSection} onChange={(e) => setQPerSection(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Restrict to question types <span className="text-slate-600 font-normal normal-case">(all selected = AI chooses freely)</span></label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AI_Q_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => toggleType(t.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${selectedTypes.includes(t.value) ? "border-brand-600 bg-brand-900/50 text-brand-300" : "border-slate-700 bg-slate-800/40 text-slate-500 hover:border-slate-600"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Learning objectives <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
              <textarea className="input resize-none h-14 text-xs" placeholder="e.g. Students understand GDPR compliance and data minimization…" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">{error}</p>}

      {status && !error && (
        <div className="flex items-center gap-2 text-brand-300 text-xs bg-brand-900/20 border border-brand-800/30 rounded-xl px-3 py-2">
          <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          {status}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={generating || !examTitle.trim()} className="btn-primary flex-1">
          {generating ? "Generating…" : "Generate Exam"}
        </button>
        <button type="button" onClick={onClose} disabled={generating} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

interface StructuredExam {
  id: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "archived";
  version?: string | null;
  passing_score: number;
  sections: Array<{ id: string; _count: { questions: number } }>;
}

interface Cert {
  id: string;
  title: string;
  exam_questions_count: number;
  exam_duration_minutes: number;
  passing_score: number;
  marketing_meta?: any;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CertDetailPage() {
  const { certId } = useParams<{ certId: string }>();
  const { accessToken } = useAuthStore();

  const [cert, setCert] = useState<Cert | null>(null);
  const [structuredExams, setStructuredExams] = useState<StructuredExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingStructured, setCreatingStructured] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [savingNewExam, setSavingNewExam] = useState(false);
  const [deletingStructuredId, setDeletingStructuredId] = useState<string | null>(null);
  const [previewingExamId, setPreviewingExamId] = useState<string | null>(null);
  const [showAiExamPanel, setShowAiExamPanel] = useState(false);

  // Cert settings state
  const [examQuestions, setExamQuestions] = useState("");
  const [examMins, setExamMins] = useState("");
  const [passingScore, setPassingScore] = useState("");
  const [graceMins, setGraceMins] = useState("30");
  const [registrationValidityDays, setRegistrationValidityDays] = useState("365");
  const [retakeWindowDays, setRetakeWindowDays] = useState("60");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function loadAll() {
    try {
      const [cRes, seRes] = await Promise.all([
        api.get<any>(`/admin/certifications/${certId}`, accessToken!),
        api.get<any>(`/exams/admin/structured-exams?certification_id=${certId}`, accessToken!),
      ]);
      const c = cRes.data ?? cRes;
      setCert(c);
      setExamQuestions(String(c.exam_questions_count ?? 60));
      setExamMins(String(c.exam_duration_minutes ?? 90));
      setPassingScore(String(c.passing_score ?? 70));
      setGraceMins(String(c.marketing_meta?.link_grace_minutes ?? 30));
      setRegistrationValidityDays(String(c.registration_validity_days ?? 365));
      setRetakeWindowDays(String(c.retake_window_days ?? 60));
      setStructuredExams(seRes.data ?? seRes);
    } catch {}
    setLoading(false);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      await api.patch<any>(`/admin/certifications/${certId}`, {
        exam_questions_count: parseInt(examQuestions),
        exam_duration_minutes: parseInt(examMins),
        passing_score: parseInt(passingScore),
        link_grace_minutes: parseInt(graceMins),
        registration_validity_days: parseInt(registrationValidityDays),
        retake_window_days: parseInt(retakeWindowDays),
      }, accessToken!);
      setSettingsMsg({ type: "ok", text: "Settings saved." });
      loadAll();
    } catch (ex: any) {
      setSettingsMsg({ type: "err", text: ex.message ?? "Failed to save." });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCreateStructuredExam(e: React.FormEvent) {
    e.preventDefault();
    if (!newExamTitle.trim()) return;
    setSavingNewExam(true);
    try {
      const res = await api.post<any>("/exams/admin/structured-exams", {
        certification_id: certId,
        title: newExamTitle.trim(),
      }, accessToken!);
      const created = res.data ?? res;
      setNewExamTitle("");
      setCreatingStructured(false);
      await loadAll();
      window.location.href = `/certifications/${certId}/structured-exams/${created.id}`;
    } catch {}
    setSavingNewExam(false);
  }

  async function handlePreviewStructuredExam(id: string) {
    setPreviewingExamId(id);
    try {
      const res = await api.post<any>("/auth/structured-exam-preview-link", { exam_id: id }, accessToken!);
      const url: string = res?.data?.preview_url ?? res?.preview_url;
      if (url) window.open(url, "_blank");
      else alert("No preview URL returned from server");
    } catch (ex: any) {
      alert(ex.message ?? "Failed to generate preview link");
    } finally {
      setPreviewingExamId(null);
    }
  }

  async function handleDeleteStructuredExam(id: string) {
    if (!confirm("Delete this structured exam and all its sections/questions?")) return;
    setDeletingStructuredId(id);
    try {
      await api.delete<any>(`/exams/admin/structured-exams/${id}`, accessToken!);
      setStructuredExams((prev) => prev.filter((e) => e.id !== id));
    } catch {}
    setDeletingStructuredId(null);
  }

  useEffect(() => { loadAll(); }, [certId, accessToken]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="h-8 w-56 bg-slate-800 rounded-xl animate-pulse" />
        <div className="card h-40 animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "badge-amber",
    published: "badge-green",
    archived: "badge-slate",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href="/certifications" className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{cert?.title ?? "Certification"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge badge-blue">
              {structuredExams.length} exam{structuredExams.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Exam Settings */}
      <div className="card p-6">
        <h2 className="section-title mb-5">Exam Settings</h2>
        <form onSubmit={saveSettings}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="label">Questions per exam</label>
              <input
                type="number"
                min={1}
                max={500}
                value={examQuestions}
                onChange={(e) => setExamQuestions(e.target.value)}
                className="input"
              />
              <p className="text-slate-600 text-xs mt-1.5">Sampled per session</p>
            </div>
            <div>
              <label className="label">Time limit (minutes)</label>
              <input
                type="number"
                min={10}
                max={480}
                value={examMins}
                onChange={(e) => setExamMins(e.target.value)}
                className="input"
              />
              <p className="text-slate-600 text-xs mt-1.5">
                {Math.floor(parseInt(examMins || "0") / 60) > 0
                  ? `${Math.floor(parseInt(examMins) / 60)}h ${parseInt(examMins) % 60}m`
                  : `${examMins || 0} min`}
              </p>
            </div>
            <div>
              <label className="label">Passing score (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
                className="input"
              />
              <p className="text-slate-600 text-xs mt-1.5">Minimum to pass</p>
            </div>
            <div>
              <label className="label">Link grace period (min)</label>
              <input
                type="number"
                min={0}
                max={120}
                value={graceMins}
                onChange={(e) => setGraceMins(e.target.value)}
                className="input"
              />
              <p className="text-slate-600 text-xs mt-1.5">Extra time after exam ends</p>
            </div>
            <div>
              <label className="label">Registration validity (days)</label>
              <input
                type="number"
                min={1}
                max={3650}
                value={registrationValidityDays}
                onChange={(e) => setRegistrationValidityDays(e.target.value)}
                className="input"
              />
              <p className="text-slate-600 text-xs mt-1.5">Time to book/sit the exam after registering, default 365</p>
            </div>
            <div>
              <label className="label">Retake window (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={retakeWindowDays}
                onChange={(e) => setRetakeWindowDays(e.target.value)}
                className="input"
              />
              <p className="text-slate-600 text-xs mt-1.5">Time to use the included retake after failing, default 60</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-5 pt-5 border-t border-slate-800">
            <button type="submit" disabled={savingSettings} className="btn-primary">
              {savingSettings ? "Saving…" : "Save Settings"}
            </button>
            {settingsMsg && (
              <span className={`text-xs ${settingsMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {settingsMsg.text}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Structured Exams */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Exams</h2>
            <p className="text-slate-500 text-xs mt-0.5">Multi-section exams with per-section timers, instruction pages, and rich question types.</p>
          </div>
          {!creatingStructured && !showAiExamPanel && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAiExamPanel(true)} className="btn-ghost text-xs flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
                Generate with AI
              </button>
              <button onClick={() => setCreatingStructured(true)} className="btn-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Exam
              </button>
            </div>
          )}
        </div>

        {showAiExamPanel && (
          <AiExamGeneratePanel
            certId={certId}
            certName={cert?.title}
            accessToken={accessToken!}
            onClose={() => setShowAiExamPanel(false)}
          />
        )}

        {creatingStructured && (
          <form onSubmit={handleCreateStructuredExam} className="card p-5 space-y-4">
            <h3 className="section-title">New Exam</h3>
            <div>
              <label className="label">Exam title *</label>
              <input
                autoFocus
                className="input"
                placeholder="e.g. CAIP Exam A"
                value={newExamTitle}
                onChange={(e) => setNewExamTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={savingNewExam} className="btn-primary">
                {savingNewExam ? "Creating…" : "Create & Open Builder"}
              </button>
              <button type="button" onClick={() => { setCreatingStructured(false); setNewExamTitle(""); }} className="btn-ghost">Cancel</button>
            </div>
          </form>
        )}

        {structuredExams.length === 0 && !creatingStructured && (
          <div className="card p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8M4 18h4" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No exams yet.</p>
            <button onClick={() => setCreatingStructured(true)} className="inline-flex items-center gap-1.5 mt-3 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
              Create first exam →
            </button>
          </div>
        )}

        {structuredExams.map((se) => {
          const totalQ = se.sections.reduce((s, sec) => s + sec._count.questions, 0);
          return (
            <div key={se.id} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{se.title}</p>
                    {se.version && <span className="badge badge-slate text-xs">{se.version}</span>}
                    <span className={`badge ${statusColors[se.status]}`}>{se.status}</span>
                  </div>
                  {se.description && (
                    <p className="text-slate-500 text-xs mt-0.5 truncate">{se.description}</p>
                  )}
                  <p className="text-slate-600 text-xs mt-1">
                    {se.sections.length} section{se.sections.length !== 1 ? "s" : ""} · {totalQ} question{totalQ !== 1 ? "s" : ""} · Pass: {se.passing_score}%
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/certifications/${certId}/structured-exams/${se.id}`}
                    className="btn-primary text-xs"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Build
                  </Link>
                  <button
                    onClick={() => handlePreviewStructuredExam(se.id)}
                    disabled={previewingExamId === se.id}
                    className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
                    title="Preview exam"
                  >
                    {previewingExamId === se.id ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    Preview
                  </button>
                  <button
                    onClick={() => handleDeleteStructuredExam(se.id)}
                    disabled={deletingStructuredId === se.id}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    title="Delete exam"
                  >
                    {deletingStructuredId === se.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
