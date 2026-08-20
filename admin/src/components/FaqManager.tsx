"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, GripVertical, Save, X, HelpCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
};

function FaqRow({
  item, token, onMutate, isDragging, isDragOver,
  onDragStart, onDragEnter, onDrop, onDragEnd, existingCategories,
}: {
  item: Faq; token: string; onMutate: () => void;
  isDragging: boolean; isDragOver: boolean;
  onDragStart: () => void; onDragEnter: () => void; onDrop: () => void; onDragEnd: () => void;
  existingCategories: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);
  const [category, setCategory] = useState(item.category);
  const [customCategory, setCustomCategory] = useState(!existingCategories.includes(item.category));

  async function save() {
    try {
      await api.patch(`/faqs/${item.id}`, { question, answer, category }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function togglePublished() {
    try {
      await api.patch(`/faqs/${item.id}`, { is_published: !item.is_published }, token);
      onMutate();
    } catch { toast.error("Failed to update"); }
  }

  async function remove() {
    if (!confirm(`Delete this FAQ?\n\n"${item.question}"`)) return;
    try {
      await api.delete(`/faqs/${item.id}`, token);
      toast.success("Deleted");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div
      className={`transition-opacity ${isDragging ? "opacity-40" : ""}`}
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); onDragStart(); }}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
    >
      <div className={`card p-3 mb-2 transition-colors ${!item.is_published ? "opacity-50" : ""} ${isDragOver && !isDragging ? "!border-navy-300 !bg-navy-50/40" : ""}`}>
        {editing ? (
          <div className="space-y-2">
            {customCategory ? (
              <div className="flex items-center gap-1">
                <input className="input-base !py-1.5 text-xs flex-1" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="New category name" />
                {existingCategories.length > 0 && (
                  <button type="button" onClick={() => setCustomCategory(false)} className="text-[11px] text-slate-400 hover:text-navy-700 flex-shrink-0 whitespace-nowrap">
                    Choose existing
                  </button>
                )}
              </div>
            ) : (
              <select
                className="input-base !py-1.5 text-xs"
                value={category}
                onChange={(e) => { if (e.target.value === "__new__") { setCustomCategory(true); setCategory(""); } else setCategory(e.target.value); }}
              >
                {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ New category…</option>
              </select>
            )}
            <input className="input-base !py-1.5 text-sm" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" />
            <textarea className="input-base !py-1.5 text-sm resize-none h-20" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer — use [link text](/path) for links" />
            <div className="flex gap-2">
              <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
              <button onClick={() => { setEditing(false); setQuestion(item.question); setAnswer(item.answer); setCategory(item.category); setCustomCategory(!existingCategories.includes(item.category)); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="text-slate-300 flex-shrink-0 cursor-grab active:cursor-grabbing mt-0.5" title="Drag to reorder" aria-hidden="true">
              <GripVertical size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-navy-900 text-sm">{item.question}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.answer}</p>
            </div>
            <button onClick={togglePublished} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors flex-shrink-0 ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {item.is_published ? <Eye size={11} /> : <EyeOff size={11} />}
              {item.is_published ? "Published" : "Hidden"}
            </button>
            <button onClick={() => setEditing(true)} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex-shrink-0">Edit</button>
            <button onClick={remove} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddForm({
  newCategory, setNewCategory, newQuestion, setNewQuestion, newAnswer, setNewAnswer,
  existingCategories, adding, onAdd, onCancel,
}: {
  newCategory: string; setNewCategory: (v: string) => void;
  newQuestion: string; setNewQuestion: (v: string) => void;
  newAnswer: string; setNewAnswer: (v: string) => void;
  existingCategories: string[]; adding: boolean; onAdd: () => void; onCancel: () => void;
}) {
  const [customCategory, setCustomCategory] = useState(existingCategories.length === 0);

  return (
    <div className="card p-4 border-2 border-dashed border-slate-200 mt-2 space-y-2">
      {customCategory ? (
        <div className="flex items-center gap-1">
          <input className="input-base !py-1.5 text-xs flex-1" placeholder="New category name (e.g. Eligibility)" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
          {existingCategories.length > 0 && (
            <button type="button" onClick={() => { setCustomCategory(false); setNewCategory(""); }} className="text-[11px] text-slate-400 hover:text-navy-700 flex-shrink-0 whitespace-nowrap">
              Choose existing
            </button>
          )}
        </div>
      ) : (
        <select
          className="input-base !py-1.5 text-xs"
          value={newCategory}
          onChange={(e) => { if (e.target.value === "__new__") { setCustomCategory(true); setNewCategory(""); } else setNewCategory(e.target.value); }}
        >
          <option value="">Choose a category…</option>
          {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__new__">+ New category…</option>
        </select>
      )}
      <input className="input-base !py-1.5 text-sm" placeholder="Question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
      <textarea className="input-base !py-1.5 text-sm resize-none h-20" placeholder="Answer — use [link text](/path) for links" value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={onAdd} disabled={adding} className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60">
          {adding ? "Adding…" : "Add FAQ"}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
      </div>
    </div>
  );
}

// Embedded directly in the Pages editor for the "faq" page (see
// pages/[id]/page.tsx) rather than living on its own Design nav destination —
// question/answer content and the page's hero/blocks used to be two separate
// screens, which was confusing since both describe "the FAQ page."
export default function FaqManager() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/faqs", accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    }
  );

  const items: Faq[] = data?.data ?? data ?? [];
  const existingCategories = Array.from(new Set(items.map((i) => i.category)));

  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [adding, setAdding] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  async function addItem() {
    if (!newCategory || !newQuestion || !newAnswer) { toast.error("Category, question, and answer are required"); return; }
    setAdding(true);
    try {
      await api.post("/faqs", { category: newCategory, question: newQuestion, answer: newAnswer, sort_order: items.length + 1 }, accessToken!);
      toast.success("Added");
      setNewCategory(""); setNewQuestion(""); setNewAnswer(""); setShowAdd(false);
      mutate();
    } catch { toast.error("Failed to add"); }
    setAdding(false);
  }

  async function reorder(from: number, to: number) {
    if (from === to) return;
    const reordered = [...items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    try {
      await Promise.all(reordered.map((it, i) => api.patch(`/faqs/${it.id}`, { sort_order: i + 1 }, accessToken!)));
      mutate();
    } catch { toast.error("Failed to reorder"); }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest flex items-center gap-1.5">
            <HelpCircle size={13} className="text-slate-400" /> FAQ Questions & Answers
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">The categorized question list shown in the accordion below the hero on this page.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-outline !py-1.5 !px-3 !text-xs">
          <Plus size={12} /> Add FAQ
        </button>
      </div>

      {showAdd && (
        <AddForm
          newCategory={newCategory} setNewCategory={setNewCategory}
          newQuestion={newQuestion} setNewQuestion={setNewQuestion}
          newAnswer={newAnswer} setNewAnswer={setNewAnswer}
          existingCategories={existingCategories}
          adding={adding} onAdd={addItem} onCancel={() => { setShowAdd(false); setNewCategory(""); setNewQuestion(""); setNewAnswer(""); }}
        />
      )}

      {isLoading ? (
        <div className="p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load FAQs.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No FAQs yet — add one above.</p>
      ) : (
        <div className="space-y-1 mt-4">
          {items.map((item, idx) => {
            const prevCategory = idx > 0 ? items[idx - 1].category : null;
            const showHeader = item.category !== prevCategory;
            return (
              <div key={item.id}>
                {showHeader && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-navy-600 mb-1.5 mt-4 first:mt-0">{item.category}</p>
                )}
                <FaqRow
                  item={item}
                  token={accessToken!}
                  onMutate={mutate}
                  isDragging={draggedIdx === idx}
                  isDragOver={dragOverIdx === idx}
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragEnter={() => { if (draggedIdx !== null) setDragOverIdx(idx); }}
                  onDrop={() => { if (draggedIdx !== null) reorder(draggedIdx, idx); }}
                  onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                  existingCategories={existingCategories}
                />
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-4">
        Drag to reorder within or across categories. Changes here are separate from Save Page below — each FAQ saves individually.
      </p>
    </div>
  );
}
