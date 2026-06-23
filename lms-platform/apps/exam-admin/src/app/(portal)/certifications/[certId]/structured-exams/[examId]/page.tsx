"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CodeEditor, CODE_LANGUAGES } from "@/components/CodeEditor";

// ─── Types ────────────────────────────────────────────────────────────────────

type QType =
  | "mcq_single" | "mcq_multiple" | "true_false"
  | "open_short" | "open_long" | "essay"
  | "fill_blank" | "matching" | "ordering" | "dropdown" | "code"
  | "html";

interface QOption {
  id?: string;
  text: string;
  is_correct: boolean;
  sort_order: number;
  match_text?: string;
}

interface QImage {
  id: string;
  url: string;
  alt_text?: string | null;
  sort_order: number;
}

interface Question {
  id: string;
  type: QType;
  question_text: string;
  explanation?: string | null;
  points: number;
  sort_order: number;
  is_required: boolean;
  metadata?: any;
  options: QOption[];
  images: QImage[];
}

interface InstructionPage {
  id: string;
  title?: string | null;
  content: string;
  sort_order: number;
}

interface Section {
  id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  time_limit_minutes?: number | null;
  instructions?: string | null;
  is_required: boolean;
  instruction_pages: InstructionPage[];
  questions: Question[];
}

interface StructuredExam {
  id: string;
  title: string;
  description?: string | null;
  status: "draft" | "published" | "archived";
  version?: string | null;
  passing_score: number;
  sections: Section[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const Q_TYPE_LABELS: Record<QType, string> = {
  mcq_single:   "MCQ – Single Answer",
  mcq_multiple: "MCQ – Multiple Answers",
  true_false:   "True / False",
  open_short:   "Short Answer",
  open_long:    "Long Answer",
  essay:        "Essay",
  fill_blank:   "Fill in the Blank",
  matching:     "Matching",
  ordering:     "Ordering",
  dropdown:     "Dropdown",
  code:         "Code",
  html:         "HTML / Interactive",
};

const Q_TYPES_ORDERED: QType[] = [
  "mcq_single", "mcq_multiple", "true_false",
  "open_short", "open_long", "essay",
  "fill_blank", "matching", "ordering", "dropdown", "code", "html",
];

const STATUS_STYLES: Record<string, string> = {
  draft: "badge-amber", published: "badge-green", archived: "badge-slate",
};

const Q_TYPE_COLORS: Record<QType, string> = {
  mcq_single:   "bg-brand-950/60 text-brand-300 border-brand-800/50",
  mcq_multiple: "bg-blue-950/60 text-blue-300 border-blue-800/50",
  true_false:   "bg-violet-950/60 text-violet-300 border-violet-800/50",
  open_short:   "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
  open_long:    "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
  essay:        "bg-teal-950/60 text-teal-300 border-teal-800/50",
  fill_blank:   "bg-amber-950/60 text-amber-300 border-amber-800/50",
  matching:     "bg-orange-950/60 text-orange-300 border-orange-800/50",
  ordering:     "bg-orange-950/60 text-orange-300 border-orange-800/50",
  dropdown:     "bg-amber-950/60 text-amber-300 border-amber-800/50",
  code:         "bg-slate-800/80 text-slate-300 border-slate-700/60",
  html:         "bg-pink-950/60 text-pink-300 border-pink-800/50",
};

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

const AI_ACTIONS = [
  { key: "improve",             label: "Improve Quality" },
  { key: "rewrite",             label: "Rewrite Question" },
  { key: "increase_difficulty", label: "Increase Difficulty" },
  { key: "simplify",            label: "Simplify" },
  { key: "add_distractors",     label: "Better Distractors" },
  { key: "generate_explanation",label: "Write Explanation" },
  { key: "alternative_version", label: "Alternative Version" },
];

function hasOptions(type: QType) {
  return ["mcq_single", "mcq_multiple", "true_false", "matching", "ordering", "dropdown"].includes(type);
}
function isMulti(type: QType) { return type === "mcq_multiple"; }

// ─── Image Zoom Modal ─────────────────────────────────────────────────────────

function ImageZoom({ url, onClose }: { url: string; onClose(): void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="relative max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full bg-slate-800 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={url}
          alt="Zoomed image"
          className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}

// ─── Inline ImageUploader ─────────────────────────────────────────────────────

interface PendingImage { file: File; preview: string; }

function ImageUploader({
  existingImages,
  pendingImages,
  deleteIds,
  onAddFiles,
  onDeleteExisting,
  onDeletePending,
  onZoom,
  uploading,
}: {
  existingImages: QImage[];
  pendingImages: PendingImage[];
  deleteIds: string[];
  onAddFiles(files: File[]): void;
  onDeleteExisting(id: string): void;
  onDeletePending(idx: number): void;
  onZoom(url: string): void;
  uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const valid = Array.from(list).filter((f) => /\.(png|jpg|jpeg|svg|gif|webp)$/i.test(f.name));
    if (valid.length) onAddFiles(valid);
  }

  const visibleExisting = existingImages.filter((img) => !deleteIds.includes(img.id));

  return (
    <div>
      <label className="label">Images</label>
      <div className="flex flex-wrap gap-2">
        {visibleExisting.map((img) => (
          <div key={img.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-white/[0.10]">
            <img src={img.url} alt={img.alt_text ?? ""} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button type="button" onClick={() => onZoom(img.url)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors" title="Zoom">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <button type="button" onClick={() => onDeleteExisting(img.id)} className="p-1.5 rounded-lg bg-red-700/70 hover:bg-red-600 text-white transition-colors" title="Remove">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}

        {pendingImages.map((img, idx) => (
          <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-brand-700/50">
            <img src={img.preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button type="button" onClick={() => onZoom(img.preview)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors" title="Zoom">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <button type="button" onClick={() => onDeletePending(idx)} className="p-1.5 rounded-lg bg-red-700/70 hover:bg-red-600 text-white transition-colors" title="Remove">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-brand-600/70 text-white text-[9px] text-center py-0.5">pending</div>
          </div>
        ))}

        {/* Upload button */}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="w-20 h-20 rounded-xl border-2 border-dashed border-white/[0.15] text-slate-600 hover:text-slate-400 hover:border-white/[0.25] transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-40"
        >
          {uploading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-[9px]">Add image</span>
            </>
          )}
        </button>

        <input
          ref={ref}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.gif,.webp"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>
      <p className="text-slate-700 text-[10px] mt-1.5">PNG, JPG, SVG, GIF, WEBP — max 15 MB each</p>
    </div>
  );
}

// ─── Options Editor ───────────────────────────────────────────────────────────

function OptionsEditor({ type, options, onChange }: { type: QType; options: QOption[]; onChange(opts: QOption[]): void }) {
  function setOpt(i: number, patch: Partial<QOption>) {
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }
  function toggleCorrect(i: number) {
    if (type === "mcq_single" || type === "true_false" || type === "dropdown") {
      onChange(options.map((o, idx) => ({ ...o, is_correct: idx === i })));
    } else {
      onChange(options.map((o, idx) => idx === i ? { ...o, is_correct: !o.is_correct } : o));
    }
  }
  function addOption() { onChange([...options, { text: "", is_correct: false, sort_order: options.length }]); }
  function removeOption(i: number) { onChange(options.filter((_, idx) => idx !== i).map((o, idx) => ({ ...o, sort_order: idx }))); }

  if (type === "true_false") {
    const trueCorrect = options[0]?.is_correct ?? false;
    return (
      <div>
        <label className="label">Correct answer</label>
        <div className="flex gap-3">
          {["True", "False"].map((label, i) => (
            <button key={label} type="button"
              onClick={() => onChange([{ text: "True", is_correct: i === 0, sort_order: 0 }, { text: "False", is_correct: i === 1, sort_order: 1 }])}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                (i === 0 ? trueCorrect : !trueCorrect)
                  ? "border-green-600 bg-green-900/20 text-green-300"
                  : "border-slate-700 bg-slate-800/40 text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >{label}</button>
          ))}
        </div>
      </div>
    );
  }

  if (type === "ordering") {
    return (
      <div>
        <label className="label">Items in correct order (top = first)</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-slate-600 text-xs w-5 text-center font-mono">{i + 1}</span>
              <input className="input flex-1" placeholder={`Item ${i + 1}`} value={opt.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
              <button type="button" onClick={() => removeOption(i)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="btn-ghost text-xs mt-1">+ Add item</button>
        </div>
      </div>
    );
  }

  if (type === "matching") {
    return (
      <div>
        <label className="label">Matching pairs (left → right)</label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input flex-1" placeholder="Left side" value={opt.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
              <span className="text-slate-600 text-sm">→</span>
              <input className="input flex-1" placeholder="Right side (match)" value={opt.match_text ?? ""} onChange={(e) => setOpt(i, { match_text: e.target.value })} />
              <button type="button" onClick={() => removeOption(i)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={addOption} className="btn-ghost text-xs mt-1">+ Add pair</button>
        </div>
      </div>
    );
  }

  const label = type === "mcq_multiple" ? "Options — check all correct" : "Options — select the correct one";
  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${opt.is_correct ? "border-green-700/60 bg-green-900/10" : "border-slate-700/60 bg-slate-900/40"}`}>
            <input
              type={isMulti(type) ? "checkbox" : "radio"}
              name={isMulti(type) ? undefined : "correct"}
              checked={opt.is_correct}
              onChange={() => toggleCorrect(i)}
              className="accent-green-500 shrink-0 w-4 h-4"
            />
            <input className="flex-1 bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none" placeholder={`Option ${i + 1}`} value={opt.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(i)} className="p-1 rounded-lg text-slate-600 hover:text-red-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addOption} className="btn-ghost text-xs">+ Add option</button>
      </div>
    </div>
  );
}

// ─── Question Form ────────────────────────────────────────────────────────────

interface QFormData {
  type: QType;
  question_text: string;
  explanation: string | null;
  points: number;
  options: QOption[];
  metadata?: Record<string, any>;
  pending_images: PendingImage[];
  delete_image_ids: string[];
}

function QuestionForm({
  initial,
  onSave,
  onCancel,
  onZoom,
}: {
  initial?: Partial<Question>;
  onSave(data: QFormData): Promise<void>;
  onCancel(): void;
  onZoom(url: string): void;
}) {
  const [type, setType] = useState<QType>(initial?.type ?? "mcq_single");
  const [text, setText] = useState(initial?.question_text ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [points, setPoints] = useState(String(initial?.points ?? 1));
  const [options, setOptions] = useState<QOption[]>(() => {
    if (initial?.options?.length) return initial.options;
    if (initial?.type === "true_false") return [
      { text: "True", is_correct: true, sort_order: 0 },
      { text: "False", is_correct: false, sort_order: 1 },
    ];
    return [
      { text: "", is_correct: true, sort_order: 0 },
      { text: "", is_correct: false, sort_order: 1 },
      { text: "", is_correct: false, sort_order: 2 },
      { text: "", is_correct: false, sort_order: 3 },
    ];
  });
  const [language, setLanguage]       = useState<string>(initial?.metadata?.language ?? "python");
  const [starterCode, setStarterCode] = useState<string>(initial?.metadata?.starter_code ?? "");
  const [htmlContent, setHtmlContent] = useState<string>(initial?.metadata?.html_content ?? "");
  const [htmlAnswerMode, setHtmlAnswerMode] = useState<"box" | "inline">(initial?.metadata?.answer_mode ?? "box");
  const [htmlBoxType, setHtmlBoxType] = useState<"textarea" | "text">(initial?.metadata?.box_type ?? "textarea");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function handleTypeChange(newType: QType) {
    setType(newType);
    if (newType === "true_false") {
      setOptions([{ text: "True", is_correct: true, sort_order: 0 }, { text: "False", is_correct: false, sort_order: 1 }]);
    } else if (!hasOptions(newType)) {
      setOptions([]);
    } else if (options.length === 0) {
      setOptions([
        { text: "", is_correct: true, sort_order: 0 }, { text: "", is_correct: false, sort_order: 1 },
        { text: "", is_correct: false, sort_order: 2 }, { text: "", is_correct: false, sort_order: 3 },
      ]);
    }
  }

  function addPendingFiles(files: File[]) {
    const previews = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPendingImages((prev) => [...prev, ...previews]);
  }

  function removePendingImage(idx: number) {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const plainText = text.replace(/<[^>]*>/g, "").trim();
    if (type !== "html" && !plainText) { setErr("Question text is required."); return; }
    if (type === "html" && !htmlContent.trim()) { setErr("HTML content is required."); return; }
    if (hasOptions(type) && type !== "true_false" && options.length < 2) {
      setErr("Add at least 2 options."); return;
    }
    if ((type === "mcq_single" || type === "true_false" || type === "dropdown") && !options.some(o => o.is_correct)) {
      setErr("Select the correct answer."); return;
    }
    setSaving(true);
    setErr("");
    try {
      await onSave({
        type,
        question_text: text || "<p>HTML Question</p>",
        explanation: explanation.trim() || null,
        points: parseInt(points) || 1,
        options: hasOptions(type) ? options : [],
        metadata: type === "code"
          ? { language, starter_code: starterCode }
          : type === "html"
          ? { html_content: htmlContent, answer_mode: htmlAnswerMode, box_type: htmlBoxType }
          : undefined,
        pending_images: pendingImages,
        delete_image_ids: deleteImageIds,
      });
    } catch (ex: any) {
      setErr(ex.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const existingImages: QImage[] = (initial?.images as QImage[]) ?? [];

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Type */}
      <div>
        <label className="label">Question type</label>
        <select className="input" value={type} onChange={(e) => handleTypeChange(e.target.value as QType)}>
          {Q_TYPES_ORDERED.map((t) => <option key={t} value={t}>{Q_TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Question text — hidden for html type since the HTML content IS the question */}
      {type !== "html" && (
        <div>
          <label className="label">Question text</label>
          <RichTextEditor
            key={initial?.id ?? "new"}
            initialValue={text}
            onChange={setText}
            placeholder="Enter your question here. Supports formatting, tables, code blocks…"
          />
        </div>
      )}

      {/* Images — hidden for html type */}
      {type !== "html" && (
        <ImageUploader
          existingImages={existingImages}
          pendingImages={pendingImages}
          deleteIds={deleteImageIds}
          onAddFiles={addPendingFiles}
          onDeleteExisting={(id) => setDeleteImageIds((prev) => [...prev, id])}
          onDeletePending={removePendingImage}
          onZoom={onZoom}
        />
      )}

      {/* Options (MCQ / TF / etc.) */}
      {hasOptions(type) && <OptionsEditor type={type} options={options} onChange={setOptions} />}

      {/* Code-specific fields */}
      {type === "code" && (
        <div className="rounded-xl border border-slate-700/50 p-4 space-y-4" style={{ background: "rgba(15,23,42,0.6)" }}>
          <p className="text-slate-400 text-xs">Students will write code directly in the exam. Their submission will need manual review.</p>
          <CodeEditor
            language={language}
            onLanguageChange={setLanguage}
            starterCode={starterCode}
            onStarterCodeChange={setStarterCode}
          />
        </div>
      )}

      {/* HTML question fields */}
      {type === "html" && (
        <div className="rounded-xl border border-pink-800/40 p-4 space-y-4" style={{ background: "rgba(20,8,24,0.6)" }}>
          <p className="text-pink-300/70 text-xs">Write the HTML that will be shown to the student. You can include text, images, tables, forms with input fields, etc.</p>

          {/* HTML editor + live preview split pane */}
          <div>
            <label className="label">HTML Content</label>
            <div className="flex rounded-xl overflow-hidden border border-white/[0.12]" style={{ background: "rgba(10,10,20,0.8)", minHeight: 200 }}>
              <textarea
                className="flex-1 bg-transparent text-slate-300 font-mono text-xs px-3 py-2.5 focus:outline-none resize-none border-r border-white/[0.08]"
                style={{ minHeight: 200 }}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                spellCheck={false}
                placeholder={"<p>Your question content here…</p>\n<table>…</table>\n<form>\n  <input name=\"answer\" placeholder=\"Type here\" />\n</form>"}
              />
              <div className="flex-1 px-3 py-2.5 overflow-auto">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Live Preview</p>
                <div className="text-slate-200 text-sm" dangerouslySetInnerHTML={{ __html: htmlContent || "<p class='text-slate-600 italic'>Nothing yet…</p>" }} />
              </div>
            </div>
          </div>

          {/* Answer mode */}
          <div>
            <label className="label">How should the answer be collected?</label>
            <div className="flex gap-3 flex-wrap">
              {([["box", "Answer box below HTML", "Student types their response in a text box below the HTML content."],
                 ["inline", "Collect from HTML inputs", "Student fills in <input>, <select>, or <textarea> fields inside your HTML. Values are captured automatically."]] as const).map(([val, label, desc]) => (
                <label key={val} className={`flex-1 min-w-48 flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${htmlAnswerMode === val ? "border-pink-600 bg-pink-950/40" : "border-slate-700 bg-slate-800/30 hover:border-slate-600"}`}>
                  <input type="radio" name="htmlAnswerMode" value={val} checked={htmlAnswerMode === val} onChange={() => setHtmlAnswerMode(val)} className="mt-0.5 accent-pink-500" />
                  <div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Box type (only for "box" mode) */}
          {htmlAnswerMode === "box" && (
            <div>
              <label className="label">Answer box style</label>
              <div className="flex gap-3">
                {([["text", "Single-line input"], ["textarea", "Multi-line textarea"]] as const).map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${htmlBoxType === val ? "border-pink-600 bg-pink-950/40 text-white" : "border-slate-700 text-slate-400 hover:border-slate-600"}`}>
                    <input type="radio" name="htmlBoxType" value={val} checked={htmlBoxType === val} onChange={() => setHtmlBoxType(val)} className="accent-pink-500" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {htmlAnswerMode === "inline" && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-2.5 text-slate-500 text-xs">
              Make sure your HTML form inputs have a <code className="text-pink-300 font-mono">name</code> attribute (e.g. <code className="text-pink-300 font-mono">&lt;input name="q1"&gt;</code>) — that's how answers are identified.
            </div>
          )}
        </div>
      )}

      {/* Open-type hints */}
      {["open_short", "open_long", "essay", "fill_blank"].includes(type) && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3 text-slate-500 text-xs">
          {type === "essay" || type === "open_long"
            ? "Students write a long-form response. Manual grading required."
            : type === "fill_blank"
            ? "Students fill in the blank. Provide the expected answer in the explanation field."
            : "Students type a short text answer."}
        </div>
      )}

      {/* Points + Explanation */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Points</label>
          <input type="number" min={1} max={100} className="input" value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
        <div>
          <label className="label">Explanation (optional)</label>
          <input className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Shown after submission…" />
        </div>
      </div>

      {err && <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/50 rounded-xl px-3 py-2.5">{err}</div>}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : initial?.id ? "Save Changes" : "Add Question"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
      </div>
    </form>
  );
}

// ─── AI Generate Panel ────────────────────────────────────────────────────────

function AiGeneratePanel({
  sectionId, accessToken, onQuestionsAdded, onClose, examTitle, sectionTitle,
}: {
  sectionId: string; accessToken: string; onQuestionsAdded(): void; onClose(): void;
  examTitle?: string; sectionTitle?: string;
}) {
  const [customPrompt, setCustomPrompt]     = useState("");
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [topic, setTopic]                   = useState("");
  const [difficulty, setDifficulty]         = useState("intermediate");
  const [numQs, setNumQs]                   = useState("5");
  const [selectedTypes, setSelectedTypes]   = useState<string[]>(ALL_AI_Q_TYPES);
  const [objectives, setObjectives]         = useState("");
  const [generating, setGenerating]         = useState(false);
  const [generatedQs, setGeneratedQs]       = useState<any[]>([]);
  const [addingIdx, setAddingIdx]           = useState<Set<number>>(new Set());
  const [addedIdx, setAddedIdx]             = useState<Set<number>>(new Set());
  const [addingAll, setAddingAll]           = useState(false);
  const [error, setError]                   = useState("");

  function toggleType(t: string) {
    setSelectedTypes((prev) =>
      prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]
    );
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!customPrompt.trim() && !topic.trim()) return;
    setGenerating(true); setError(""); setGeneratedQs([]); setAddedIdx(new Set());
    try {
      const res = await api.post<any>("/ai/generate-exam-questions", {
        topic:          showAdvanced && topic.trim() ? topic.trim() : undefined,
        difficulty:     showAdvanced ? difficulty    : undefined,
        num_questions:  showAdvanced ? Math.min(20, Math.max(1, parseInt(numQs) || 5)) : undefined,
        question_types: showAdvanced ? selectedTypes : undefined,
        cert_name: examTitle || undefined,
        learning_objectives: showAdvanced && objectives.trim() ? objectives.trim() : undefined,
        section_title: sectionTitle || undefined,
        custom_prompt: customPrompt.trim() || undefined,
      }, accessToken);
      const d = res.data ?? res;
      setGeneratedQs(d.questions ?? (Array.isArray(d) ? d : []));
    } catch (ex: any) { setError(ex.message ?? "AI generation failed. Check your OpenAI API key."); }
    setGenerating(false);
  }

  async function addOne(q: any, idx: number) {
    setAddingIdx((p) => new Set(p).add(idx));
    try {
      await api.post<any>(`/exams/admin/sections/${sectionId}/questions`, {
        type: q.type, question_text: q.question_text,
        explanation: q.explanation || null, points: q.points || 1,
        options: q.options || [], metadata: q.metadata,
      }, accessToken);
      setAddedIdx((p) => new Set(p).add(idx));
      onQuestionsAdded();
    } catch {}
    setAddingIdx((p) => { const s = new Set(p); s.delete(idx); return s; });
  }

  async function addAll() {
    setAddingAll(true);
    const newAdded = new Set(addedIdx);
    for (let i = 0; i < generatedQs.length; i++) {
      if (addedIdx.has(i)) continue;
      try {
        const q = generatedQs[i];
        await api.post<any>(`/exams/admin/sections/${sectionId}/questions`, {
          type: q.type, question_text: q.question_text,
          explanation: q.explanation || null, points: q.points || 1,
          options: q.options || [], metadata: q.metadata,
        }, accessToken);
        newAdded.add(i);
      } catch {}
    }
    setAddedIdx(newAdded); setAddingAll(false); onQuestionsAdded();
  }

  const pendingCount = generatedQs.filter((_, i) => !addedIdx.has(i)).length;

  return (
    <div className="rounded-2xl border border-brand-800/40 overflow-hidden mb-4" style={{ background: "rgba(12,14,36,0.95)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-brand-800/30"
           style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(30,27,80,0.25) 100%)" }}>
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-brand-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
          <span className="text-white text-sm font-semibold">Generate Questions with AI</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.08] transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={generate} className="p-4 space-y-4">
        <div>
          <label className="label">Describe what you want</label>
          <textarea
            autoFocus
            className="input resize-none h-20 text-xs leading-relaxed"
            placeholder={`e.g. "5 tricky MCQ + 2 true/false on EU AI Act prohibited practices — biometric surveillance and social scoring edge cases. Advanced difficulty."`}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
          <p className="text-slate-700 text-[10px] mt-1">Specify types, count, topic, and difficulty in your description.</p>
        </div>

        <div className="border-t border-brand-800/20 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced options
            <span className="text-slate-700">(override defaults)</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="label">Topic <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                <input className="input" placeholder="e.g. AI Ethics…" value={topic} onChange={(e) => setTopic(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="label">Count <span className="text-slate-600 font-normal normal-case">(fallback)</span></label>
                  <input type="number" min={1} max={20} className="input" value={numQs} onChange={(e) => setNumQs(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Restrict types <span className="text-slate-600 font-normal normal-case">(all = AI chooses)</span></label>
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
                <textarea className="input resize-none h-10 text-xs" placeholder="e.g. Students understand GDPR compliance…" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">{error}</p>}
        <button type="submit" disabled={generating || (!customPrompt.trim() && !topic.trim())} className="btn-primary w-full">
          {generating ? (
            <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Generating…</>
          ) : "Generate Questions"}
        </button>
      </form>

      {generatedQs.length > 0 && (
        <div className="border-t border-brand-800/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white text-xs font-semibold">{generatedQs.length} questions generated</p>
            {pendingCount > 0 && (
              <button onClick={addAll} disabled={addingAll} className="btn-primary text-xs">
                {addingAll ? "Adding…" : `Add All (${pendingCount})`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {generatedQs.map((q, idx) => (
              <div key={idx} className={`rounded-xl border p-3 transition-colors ${addedIdx.has(idx) ? "border-green-800/40 bg-green-900/10" : "border-white/[0.07] bg-white/[0.02]"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge text-[10px] ${Q_TYPE_COLORS[q.type as QType] ?? "badge-slate"}`}>{Q_TYPE_LABELS[q.type as QType] ?? q.type}</span>
                      <span className="text-slate-600 text-[10px]">{q.points || 1} pt</span>
                    </div>
                    <div className="rte-view text-xs line-clamp-2" dangerouslySetInnerHTML={{ __html: q.question_text }} />
                    {q.options?.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {(q.options as any[]).slice(0, 3).map((opt, oi: number) => (
                          <div key={oi} className={`text-[11px] px-2 py-0.5 rounded ${opt.is_correct ? "text-green-400 bg-green-900/20" : "text-slate-600"}`}>
                            {opt.is_correct && "✓ "}{opt.text}
                          </div>
                        ))}
                        {q.options.length > 3 && <div className="text-[10px] text-slate-700">+{q.options.length - 3} more…</div>}
                      </div>
                    )}
                    {q.explanation && <p className="mt-1.5 text-slate-600 text-[10px] italic line-clamp-1">{q.explanation}</p>}
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {addedIdx.has(idx) ? (
                      <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Added
                      </span>
                    ) : (
                      <button onClick={() => addOne(q, idx)} disabled={addingIdx.has(idx)} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40">
                        {addingIdx.has(idx) ? "…" : "Add"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Section Panel ─────────────────────────────────────────────────────────

const ALL_AI_Q_TYPES = AI_Q_TYPES.map((t) => t.value);

function AiSectionPanel({
  examId, examTitle, accessToken, onDone, onClose,
}: {
  examId: string; examTitle?: string; accessToken: string;
  onDone(newSectionId: string): void; onClose(): void;
}) {
  const [customPrompt, setCustomPrompt]   = useState("");
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [topic, setTopic]                 = useState("");
  const [difficulty, setDifficulty]       = useState("intermediate");
  const [numQs, setNumQs]                 = useState("5");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ALL_AI_Q_TYPES);
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
    if (!customPrompt.trim() && !topic.trim()) return;
    setGenerating(true); setError(""); setStatus("Generating section…");
    try {
      const aiRes = await api.post<any>("/ai/generate-section", {
        topic:          showAdvanced && topic.trim() ? topic.trim() : undefined,
        difficulty:     showAdvanced ? difficulty    : undefined,
        num_questions:  showAdvanced ? Math.min(20, Math.max(1, parseInt(numQs) || 5)) : undefined,
        question_types: showAdvanced ? selectedTypes : undefined,
        cert_name: examTitle || undefined,
        learning_objectives: showAdvanced && objectives.trim() ? objectives.trim() : undefined,
        custom_prompt: customPrompt.trim() || undefined,
      }, accessToken);
      const sec = (aiRes.data ?? aiRes).section;
      if (!sec) throw new Error("AI returned unexpected format.");

      setStatus(`Creating section "${sec.title}"…`);
      const secRes = await api.post<any>(`/exams/admin/structured-exams/${examId}/sections`, {
        title: sec.title,
        description: sec.description || undefined,
      }, accessToken);
      const sectionId = (secRes.data ?? secRes).id;

      if (sec.questions?.length) {
        setStatus(`Adding ${sec.questions.length} questions…`);
        for (const q of sec.questions) {
          await api.post<any>(`/exams/admin/sections/${sectionId}/questions`, {
            type: q.type, question_text: q.question_text,
            explanation: q.explanation || null, points: q.points || 1,
            options: q.options || [],
          }, accessToken);
        }
      }

      onDone(sectionId);
    } catch (ex: any) {
      setError(ex.message ?? "Failed to generate section.");
      setGenerating(false);
      setStatus(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
            <h2 className="section-title">Generate Section with AI</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.07] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={generate} className="space-y-4">
          <div>
            <label className="label">Describe this section</label>
            <textarea
              autoFocus
              className="input resize-none h-24 text-sm leading-relaxed"
              placeholder={`e.g. "5 MCQ questions on EU AI Act risk categories, plus 2 true/false on prohibited practices. Intermediate difficulty."`}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
            <p className="text-slate-600 text-[11px] mt-1">Specify topic, question types, count, and difficulty right in your description.</p>
          </div>

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
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">Topic <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                  <input className="input" placeholder="e.g. AI Ethics…" value={topic} onChange={(e) => setTopic(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                    <label className="label">Questions <span className="text-slate-600 font-normal normal-case">(fallback)</span></label>
                    <input type="number" min={1} max={20} className="input" value={numQs} onChange={(e) => setNumQs(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Restrict types <span className="text-slate-600 font-normal normal-case">(all = AI chooses)</span></label>
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
                  <textarea className="input resize-none h-12 text-xs" placeholder="e.g. Students understand GDPR compliance…" value={objectives} onChange={(e) => setObjectives(e.target.value)} />
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

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={generating || (!customPrompt.trim() && !topic.trim())} className="btn-primary flex-1">
              {generating ? "Generating…" : "Generate Section"}
            </button>
            <button type="button" onClick={onClose} disabled={generating} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Section Panel ────────────────────────────────────────────────────────────

function SectionPanel({
  section, accessToken, onReload, examTitle,
}: {
  section: Section; accessToken: string; onReload(): void; examTitle?: string;
}) {
  const [tab, setTab] = useState<"questions" | "instructions" | "settings">("questions");
  const [addingQ, setAddingQ] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [deletingQId, setDeletingQId] = useState<string | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [sectionTitle, setSectionTitle]     = useState(section.title);
  const [sectionDesc, setSectionDesc]       = useState(section.description ?? "");
  const [timeLimitStr, setTimeLimitStr]     = useState(String(section.time_limit_minutes ?? ""));
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg]       = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pageTitle, setPageTitle]           = useState("");
  const [pageContent, setPageContent]       = useState("");
  const [editPageTitle, setEditPageTitle]   = useState("");
  const [editPageContent, setEditPageContent] = useState("");
  const [savingPage, setSavingPage]         = useState(false);
  const [zoomUrl, setZoomUrl]               = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  // AI state
  const [showAiPanel, setShowAiPanel]           = useState(false);
  const [aiDropdownQId, setAiDropdownQId]       = useState<string | null>(null);
  const [aiImprovingQId, setAiImprovingQId]     = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion]         = useState<{ qId: string; data: any; action: string } | null>(null);
  const [applyingAi, setApplyingAi]             = useState(false);

  async function uploadImageFiles(files: PendingImage[], questionId: string) {
    for (const { file } of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ url: string }>("/exams/admin/upload/exam-image", fd, accessToken);
      await api.post<any>(`/exams/admin/questions/${questionId}/images`, { url: res.url }, accessToken);
    }
  }

  async function handleAddQuestion(data: QFormData) {
    const { pending_images, delete_image_ids, metadata, options, ...rest } = data;
    setUploadingImages(pending_images.length > 0);
    const created = await api.post<any>(`/exams/admin/sections/${section.id}/questions`, {
      ...rest,
      metadata,
      options: hasOptions(data.type) ? options : [],
    }, accessToken);
    const questionId = (created.data ?? created).id;
    if (pending_images.length && questionId) {
      await uploadImageFiles(pending_images, questionId);
    }
    setUploadingImages(false);
    setAddingQ(false);
    onReload();
  }

  async function handleEditQuestion(qId: string, data: QFormData) {
    const { pending_images, delete_image_ids, options, metadata, ...rest } = data;
    await api.patch<any>(`/exams/admin/questions/${qId}`, { ...rest, metadata }, accessToken);
    if (options !== undefined) {
      await api.put<any>(`/exams/admin/questions/${qId}/options`, { options }, accessToken);
    }
    for (const imgId of delete_image_ids) {
      await api.delete<any>(`/exams/admin/questions/${qId}/images/${imgId}`, accessToken);
    }
    if (pending_images.length) {
      setUploadingImages(true);
      await uploadImageFiles(pending_images, qId);
      setUploadingImages(false);
    }
    setEditingQId(null);
    onReload();
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm("Delete this question?")) return;
    setDeletingQId(qId);
    try { await api.delete<any>(`/exams/admin/questions/${qId}`, accessToken); onReload(); } catch {}
    setDeletingQId(null);
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMsg(null);
    try {
      await api.patch<any>(`/exams/admin/sections/${section.id}`, {
        title: sectionTitle,
        description: sectionDesc || null,
        time_limit_minutes: timeLimitStr ? parseInt(timeLimitStr) : null,
      }, accessToken);
      setSettingsMsg({ type: "ok", text: "Saved." });
      onReload();
    } catch (ex: any) {
      setSettingsMsg({ type: "err", text: ex.message ?? "Failed." });
    } finally { setSavingSettings(false); }
  }

  async function handleAddPage(e: React.FormEvent) {
    e.preventDefault();
    if (!pageContent.trim() && !pageContent.replace(/<[^>]*>/g, "").trim()) return;
    setSavingPage(true);
    try {
      await api.post<any>(`/exams/admin/sections/${section.id}/instruction-pages`, {
        title: pageTitle || null, content: pageContent,
      }, accessToken);
      setPageTitle(""); setPageContent(""); setAddingPage(false); onReload();
    } catch {}
    setSavingPage(false);
  }

  async function handleEditPage(pageId: string) {
    setSavingPage(true);
    try {
      await api.patch<any>(`/exams/admin/instruction-pages/${pageId}`, {
        title: editPageTitle || null, content: editPageContent,
      }, accessToken);
      setEditingPageId(null); onReload();
    } catch {}
    setSavingPage(false);
  }

  async function handleDeletePage(pageId: string) {
    if (!confirm("Delete this instruction page?")) return;
    await api.delete<any>(`/exams/admin/instruction-pages/${pageId}`, accessToken);
    onReload();
  }

  function startEditPage(page: InstructionPage) {
    setEditPageTitle(page.title ?? "");
    setEditPageContent(page.content);
    setEditingPageId(page.id);
  }

  async function handleAiAction(q: Question, action: string) {
    setAiDropdownQId(null);
    setAiImprovingQId(q.id);
    setAiSuggestion(null);
    try {
      const res = await api.post<any>("/ai/improve-question", {
        question: { type: q.type, question_text: q.question_text, explanation: q.explanation, points: q.points, options: q.options },
        action,
        cert_name: examTitle,
      }, accessToken);
      const d = res.data ?? res;
      setAiSuggestion({ qId: q.id, data: d.question ?? d, action });
    } catch (ex: any) {
      alert(ex.message ?? "AI improvement failed");
    } finally {
      setAiImprovingQId(null);
    }
  }

  async function handleApplyAiSuggestion(qId: string, data: any) {
    setApplyingAi(true);
    try {
      await api.patch<any>(`/exams/admin/questions/${qId}`, {
        question_text: data.question_text,
        explanation: data.explanation || null,
        points: data.points || 1,
      }, accessToken);
      if (data.options?.length) {
        await api.put<any>(`/exams/admin/questions/${qId}/options`, {
          options: (data.options as any[]).map((opt, idx) => ({
            text: opt.text, is_correct: opt.is_correct,
            match_text: opt.match_text, sort_order: idx,
          })),
        }, accessToken);
      }
      setAiSuggestion(null);
      onReload();
    } catch (ex: any) {
      alert(ex.message ?? "Failed to apply suggestion");
    } finally {
      setApplyingAi(false);
    }
  }

  const totalPoints = section.questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="flex flex-col h-full">
      {zoomUrl && <ImageZoom url={zoomUrl} onClose={() => setZoomUrl(null)} />}

      {/* Section header */}
      <div className="px-5 pt-4 pb-3.5 border-b border-white/[0.06]"
           style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)" }}>
        <h2 className="text-white font-bold text-[15px] tracking-tight">{section.title}</h2>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-800/60 border border-white/[0.06] rounded-lg px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {section.questions.length} question{section.questions.length !== 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-800/60 border border-white/[0.06] rounded-lg px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            {totalPoints} pt{totalPoints !== 1 ? "s" : ""}
          </span>
          {section.time_limit_minutes && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/80 bg-amber-950/40 border border-amber-800/40 rounded-lg px-2 py-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {section.time_limit_minutes} min
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <div className="tabs-segment">
          {(["questions", "instructions", "settings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`tab-segment-item capitalize ${tab === t ? "active" : ""}`}>
              {t === "questions" && (
                <span className={`inline-block w-4 h-4 rounded-md text-[10px] font-bold mr-1.5 align-middle leading-4 text-center ${tab === t ? "bg-brand-600 text-white" : "bg-slate-700 text-slate-400"}`}>
                  {section.questions.length}
                </span>
              )}
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* ── Questions ── */}
        {tab === "questions" && (
          <>
            {/* AI generate panel toggle */}
            <div className="flex justify-end mb-1">
              <button
                onClick={() => { setShowAiPanel(!showAiPanel); setAddingQ(false); setEditingQId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors ${showAiPanel ? "border-brand-600 bg-brand-900/40 text-brand-300" : "border-slate-700 bg-slate-800/30 text-slate-500 hover:border-brand-700 hover:text-brand-400"}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                Generate with AI
              </button>
            </div>

            {showAiPanel && (
              <AiGeneratePanel
                sectionId={section.id}
                accessToken={accessToken}
                onQuestionsAdded={() => { onReload(); }}
                onClose={() => setShowAiPanel(false)}
                examTitle={examTitle}
                sectionTitle={section.title}
              />
            )}

            {section.questions.map((q, idx) => (
              <div key={q.id} className="card p-4">
                {editingQId === q.id ? (
                  <QuestionForm
                    initial={q}
                    onSave={(data) => handleEditQuestion(q.id, data)}
                    onCancel={() => setEditingQId(null)}
                    onZoom={setZoomUrl}
                  />
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-slate-700 text-[11px] font-bold font-mono">Q{idx + 1}</span>
                          <span className={`badge text-[10px] ${Q_TYPE_COLORS[q.type]}`}>{Q_TYPE_LABELS[q.type]}</span>
                          <span className="text-slate-600 text-[11px]">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                          {q.type === "code" && q.metadata?.language && (
                            <span className="badge badge-slate text-[10px]">{CODE_LANGUAGES.find(l => l.value === q.metadata.language)?.label ?? q.metadata.language}</span>
                          )}
                          {q.type === "html" && q.metadata?.answer_mode && (
                            <span className="badge badge-slate text-[10px]">{q.metadata.answer_mode === "inline" ? "Inline inputs" : q.metadata.box_type === "text" ? "Text box" : "Textarea box"}</span>
                          )}
                          {q.images.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800/60 border border-white/[0.06] rounded px-1.5 py-0.5">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              {q.images.length}
                            </span>
                          )}
                        </div>
                        {/* Render HTML content */}
                        <div className="rte-view" dangerouslySetInnerHTML={{ __html: q.question_text }} />

                        {/* Image thumbnails */}
                        {q.images.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {q.images.map((img) => (
                              <button key={img.id} type="button" onClick={() => setZoomUrl(img.url)}
                                className="w-14 h-14 rounded-lg overflow-hidden border border-white/[0.10] hover:border-brand-500/50 transition-colors"
                                title="Click to zoom">
                                <img src={img.url} alt={img.alt_text ?? ""} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* AI improve button */}
                        <div className="relative">
                          <button
                            onClick={() => setAiDropdownQId(aiDropdownQId === q.id ? null : q.id)}
                            disabled={aiImprovingQId === q.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-400 hover:bg-brand-900/20 transition-colors disabled:opacity-40"
                            title="AI improvements"
                          >
                            {aiImprovingQId === q.id ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                            )}
                          </button>
                          {aiDropdownQId === q.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setAiDropdownQId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border border-white/[0.10] shadow-2xl overflow-hidden py-1" style={{ background: "rgba(15,18,40,0.98)" }}>
                                {AI_ACTIONS.map((a) => (
                                  <button key={a.key}
                                    onClick={() => handleAiAction(q, a.key)}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-brand-900/40 transition-colors">
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <button onClick={() => { setEditingQId(q.id); setAddingQ(false); setAiSuggestion(null); }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteQuestion(q.id)} disabled={deletingQId === q.id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    {q.options.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-2 gap-1">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${opt.is_correct ? "bg-green-900/25 text-green-300 border border-green-800/50" : "text-slate-500 bg-slate-800/40"}`}>
                            {opt.is_correct && <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                            <span className="truncate">{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.explanation && <p className="mt-2 text-slate-500 text-xs italic">{q.explanation}</p>}

                    {/* AI suggestion panel */}
                    {aiSuggestion?.qId === q.id && (
                      <div className="mt-3 rounded-xl border border-brand-700/40 p-3 space-y-2" style={{ background: "rgba(20,16,60,0.6)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-brand-300 text-xs font-semibold flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
                            AI Suggestion — {AI_ACTIONS.find(a => a.key === aiSuggestion.action)?.label ?? aiSuggestion.action.replace(/_/g, " ")}
                          </span>
                          <button onClick={() => setAiSuggestion(null)} className="text-slate-600 hover:text-white transition-colors p-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div className="rte-view text-xs" dangerouslySetInnerHTML={{ __html: aiSuggestion.data.question_text }} />
                        {aiSuggestion.data.options?.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {(aiSuggestion.data.options as any[]).map((opt, oi) => (
                              <div key={oi} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${opt.is_correct ? "bg-green-900/25 text-green-300 border border-green-800/50" : "text-slate-500 bg-slate-800/40"}`}>
                                {opt.is_correct && <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                <span className="truncate">{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {aiSuggestion.data.explanation && (
                          <p className="text-slate-400 text-xs italic">{aiSuggestion.data.explanation}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleApplyAiSuggestion(q.id, aiSuggestion.data)} disabled={applyingAi} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40">
                            {applyingAi ? "Applying…" : "Apply"}
                          </button>
                          <button onClick={() => setAiSuggestion(null)} className="btn-ghost text-xs px-3 py-1.5">Dismiss</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {section.questions.length === 0 && !addingQ && (
              <div className="text-center py-10 text-slate-500 text-sm">No questions yet. Add the first one below.</div>
            )}

            {addingQ ? (
              <div className="card p-5">
                <h4 className="section-title mb-4">New Question</h4>
                <QuestionForm onSave={handleAddQuestion} onCancel={() => setAddingQ(false)} onZoom={setZoomUrl} />
              </div>
            ) : (
              <button onClick={() => { setAddingQ(true); setEditingQId(null); }} className="btn-ghost w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Question
              </button>
            )}
          </>
        )}

        {/* ── Instructions ── */}
        {tab === "instructions" && (
          <>
            <p className="text-slate-500 text-xs">Instruction pages are shown to students before they start this section.</p>

            {section.instruction_pages.map((page) => (
              <div key={page.id} className="card p-4">
                {editingPageId === page.id ? (
                  <div className="space-y-3">
                    <input className="input" placeholder="Page title (optional)" value={editPageTitle} onChange={(e) => setEditPageTitle(e.target.value)} />
                    <RichTextEditor
                      key={`edit-${page.id}`}
                      initialValue={editPageContent}
                      onChange={setEditPageContent}
                      placeholder="Write instructions for students…"
                      minHeight={140}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditPage(page.id)} disabled={savingPage} className="btn-primary text-xs">Save</button>
                      <button onClick={() => setEditingPageId(null)} className="btn-ghost text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {page.title && <p className="text-white text-sm font-medium mb-1">{page.title}</p>}
                        <div className="rte-view text-xs" dangerouslySetInnerHTML={{ __html: page.content }} />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditPage(page)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeletePage(page.id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {addingPage ? (
              <form onSubmit={handleAddPage} className="card p-4 space-y-3">
                <input className="input" placeholder="Page title (optional)" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} />
                <RichTextEditor
                  key="new-page"
                  initialValue={pageContent}
                  onChange={setPageContent}
                  placeholder="Write instructions for students…"
                  minHeight={140}
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingPage} className="btn-primary text-xs">Add Page</button>
                  <button type="button" onClick={() => setAddingPage(false)} className="btn-ghost text-xs">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setAddingPage(true)} className="btn-ghost w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Instruction Page
              </button>
            )}
          </>
        )}

        {/* ── Settings ── */}
        {tab === "settings" && (
          <form onSubmit={saveSettings} className="space-y-4">
            <div>
              <label className="label">Section title</label>
              <input className="input" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} required />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input resize-none h-20" value={sectionDesc} onChange={(e) => setSectionDesc(e.target.value)} placeholder="Shown to students before starting…" />
            </div>
            <div>
              <label className="label">Time limit (minutes)</label>
              <input type="number" min={1} max={480} className="input" value={timeLimitStr} onChange={(e) => setTimeLimitStr(e.target.value)} placeholder="Leave blank for no limit" />
              <p className="text-slate-600 text-xs mt-1">Leave blank for no per-section time limit.</p>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <button type="submit" disabled={savingSettings} className="btn-primary">{savingSettings ? "Saving…" : "Save Settings"}</button>
              {settingsMsg && <span className={`text-xs ${settingsMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>{settingsMsg.text}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StructuredExamBuilderPage() {
  const { certId, examId } = useParams<{ certId: string; examId: string }>();
  const { accessToken } = useAuthStore();

  const [exam, setExam]                         = useState<StructuredExam | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [activeSectionId, setActiveSectionId]   = useState<string | null>(null);
  const [addingSection, setAddingSection]       = useState(false);
  const [newSectionTitle, setNewSectionTitle]   = useState("");
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [savingSection, setSavingSection]       = useState(false);
  const [examStatus, setExamStatus]             = useState<"draft" | "published" | "archived">("draft");
  const [savingStatus, setSavingStatus]         = useState(false);
  const [previewingExam, setPreviewingExam]     = useState(false);
  const [showAiSectionPanel, setShowAiSectionPanel] = useState(false);

  const loadExam = useCallback(async () => {
    try {
      const res = await api.get<any>(`/exams/admin/structured-exams/${examId}`, accessToken!);
      const data: StructuredExam = res.data ?? res;
      setExam(data);
      setExamStatus(data.status);
      if (data.sections.length > 0 && !activeSectionId) {
        setActiveSectionId(data.sections[0].id);
      }
    } catch {}
    setLoading(false);
  }, [examId, accessToken, activeSectionId]);

  useEffect(() => { loadExam(); }, []);

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    setSavingSection(true);
    try {
      const res = await api.post<any>(`/exams/admin/structured-exams/${examId}/sections`, { title: newSectionTitle.trim() }, accessToken!);
      const newSection = res.data ?? res;
      setNewSectionTitle(""); setAddingSection(false);
      await loadExam();
      setActiveSectionId(newSection.id);
    } catch {}
    setSavingSection(false);
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("Delete this section and all its questions?")) return;
    setDeletingSectionId(sectionId);
    try {
      await api.delete<any>(`/exams/admin/sections/${sectionId}`, accessToken!);
      if (activeSectionId === sectionId) setActiveSectionId(null);
      await loadExam();
    } catch {}
    setDeletingSectionId(null);
  }

  async function handleStatusChange(newStatus: "draft" | "published" | "archived") {
    setSavingStatus(true);
    try {
      await api.patch<any>(`/exams/admin/structured-exams/${examId}`, { status: newStatus }, accessToken!);
      setExamStatus(newStatus);
      setExam((prev) => prev ? { ...prev, status: newStatus } : prev);
    } catch {}
    setSavingStatus(false);
  }

  async function handlePreviewExam() {
    setPreviewingExam(true);
    try {
      const res = await api.post<any>("/auth/structured-exam-preview-link", { exam_id: examId }, accessToken!);
      const url: string = res?.data?.preview_url ?? res?.preview_url;
      if (url) window.open(url, "_blank");
      else alert("No preview URL returned from server");
    } catch (ex: any) {
      alert(ex.message ?? "Failed to generate preview link");
    } finally {
      setPreviewingExam(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] gap-0">
        <div className="w-72 border-r border-slate-800 p-4 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-64 bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-40 bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center">
        <p className="text-slate-400">Exam not found.</p>
        <Link href={`/certifications/${certId}`} className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
          ← Back to certification
        </Link>
      </div>
    );
  }

  const activeSection = exam.sections.find((s) => s.id === activeSectionId) ?? null;
  const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalPoints    = exam.sections.reduce((sum, s) => sum + s.questions.reduce((ss, q) => ss + q.points, 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.06] shrink-0"
           style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)" }}>
        <Link href={`/certifications/${certId}`} className="text-slate-600 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.07] shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-white font-bold text-sm tracking-tight truncate">{exam.title}</h1>
            {exam.version && <span className="badge badge-slate">{exam.version}</span>}
            <span className={`badge ${STATUS_STYLES[exam.status]}`}>{exam.status}</span>
          </div>
          <p className="text-slate-600 text-[11px] mt-0.5 tracking-wide">
            {exam.sections.length} section{exam.sections.length !== 1 ? "s" : ""}
            <span className="mx-1.5 text-slate-800">·</span>
            {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
            <span className="mx-1.5 text-slate-800">·</span>
            {totalPoints} pts
            <span className="mx-1.5 text-slate-800">·</span>
            Pass {exam.passing_score}%
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePreviewExam}
            disabled={previewingExam}
            className="btn-ghost text-xs px-3 py-1.5 disabled:opacity-40"
            title="Preview exam in paiiexams"
          >
            {previewingExam ? (
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
          {exam.status === "draft" && (
            <button onClick={() => handleStatusChange("published")} disabled={savingStatus || totalQuestions === 0}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40" title={totalQuestions === 0 ? "Add questions before publishing" : ""}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {savingStatus ? "Saving…" : "Publish"}
            </button>
          )}
          {exam.status === "published" && (
            <button onClick={() => handleStatusChange("draft")} disabled={savingStatus} className="btn-ghost text-xs px-3 py-1.5">Unpublish</button>
          )}
          {exam.status !== "archived" && (
            <button onClick={() => handleStatusChange("archived")} disabled={savingStatus}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.07] transition-colors" title="Archive exam">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sections sidebar */}
        <div className="w-64 border-r border-white/[0.06] flex flex-col shrink-0"
             style={{ background: "linear-gradient(180deg, rgba(10,16,32,0.6) 0%, transparent 100%)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.12em]">Sections · {exam.sections.length}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowAiSectionPanel(true); setAddingSection(false); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-brand-400 hover:bg-brand-900/30 transition-all"
                title="Generate section with AI"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" /></svg>
              </button>
              <button onClick={() => { setAddingSection(true); setShowAiSectionPanel(false); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-white hover:bg-white/[0.08] transition-all" title="Add section">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2">
            {exam.sections.map((section, idx) => {
              const isActive = activeSectionId === section.id;
              return (
                <div key={section.id}
                  className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-0.5 ${isActive ? "text-white" : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"}`}
                  style={isActive ? { background: "linear-gradient(135deg, rgba(79,70,229,0.15) 0%, rgba(61,82,145,0.10) 100%)", boxShadow: "inset 0 0 0 1px rgba(99,102,232,0.15)" } : {}}
                  onClick={() => setActiveSectionId(section.id)}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${isActive ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-500"}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate leading-tight ${isActive ? "text-white" : ""}`}>{section.title}</p>
                    <p className={`text-[11px] mt-0.5 ${isActive ? "text-brand-300/70" : "text-slate-700"}`}>{section.questions.length} question{section.questions.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                    disabled={deletingSectionId === section.id}
                    className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-40 shrink-0"
                    title="Delete section"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })}

            {exam.sections.length === 0 && !addingSection && (
              <div className="px-3 py-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8M4 18h4" /></svg>
                </div>
                <p className="text-slate-700 text-xs">No sections yet.</p>
                <button onClick={() => setAddingSection(true)} className="text-brand-500 hover:text-brand-400 text-xs mt-1.5 transition-colors font-medium">Add first section →</button>
              </div>
            )}

            {addingSection && (
              <form onSubmit={handleAddSection} className="p-2 space-y-2">
                <input autoFocus className="input text-xs py-2" placeholder="Section title…" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} />
                <div className="flex gap-1.5">
                  <button type="submit" disabled={savingSection} className="btn-primary text-xs py-1.5 flex-1">{savingSection ? "Adding…" : "Add"}</button>
                  <button type="button" onClick={() => { setAddingSection(false); setNewSectionTitle(""); }} className="btn-ghost text-xs py-1.5">✕</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Section detail */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {showAiSectionPanel ? (
            <AiSectionPanel
              examId={examId}
              examTitle={exam.title}
              accessToken={accessToken!}
              onDone={(newSectionId) => { setShowAiSectionPanel(false); setActiveSectionId(newSectionId); loadExam(); }}
              onClose={() => setShowAiSectionPanel(false)}
            />
          ) : activeSection ? (
            <SectionPanel key={activeSection.id} section={activeSection} accessToken={accessToken!} onReload={loadExam} examTitle={exam.title} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-white/[0.06] flex items-center justify-center">
                <svg className="w-7 h-7 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8M4 18h4" /></svg>
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">{exam.sections.length === 0 ? "No sections yet" : "Select a section"}</p>
                <p className="text-slate-700 text-xs mt-0.5">{exam.sections.length === 0 ? "Add a section from the left panel to start building." : "Click a section in the sidebar to edit it."}</p>
              </div>
              {exam.sections.length === 0 && (
                <button onClick={() => setAddingSection(true)} className="btn-primary text-xs px-4 py-2 mt-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add First Section
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
