"use client";
import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

interface Props {
  initialValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function Btn({
  active, onClick, title, children, danger,
}: {
  active?: boolean; onClick(): void; title: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors leading-none ${
        active
          ? "bg-brand-600 text-white"
          : danger
          ? "text-red-400 hover:text-white hover:bg-red-600/30"
          : "text-slate-400 hover:text-white hover:bg-white/[0.08]"
      }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-3.5 bg-white/[0.10] mx-0.5 shrink-0" />;
}

export function RichTextEditor({ initialValue = "", onChange, placeholder, minHeight = 120 }: Props) {
  const [htmlMode, setHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(initialValue);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Write question content here…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialValue,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "rte-content focus:outline-none",
        style: `min-height:${minHeight}px`,
      },
    },
  });

  if (!editor) return null;

  function addLink() {
    const url = window.prompt("Enter URL:");
    if (url) editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function handleClear() {
    if (!confirm("Clear all content?")) return;
    editor?.commands.clearContent(true);
    setRawHtml("");
    onChange("");
  }

  function enterHtmlMode() {
    setRawHtml(editor.getHTML());
    setHtmlMode(true);
  }

  function exitHtmlMode() {
    editor.commands.setContent(rawHtml);
    onChange(rawHtml);
    setHtmlMode(false);
  }

  function handleRawChange(val: string) {
    setRawHtml(val);
    onChange(val);
  }

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/[0.12]"
      style={{ background: "rgba(15,23,42,0.7)" }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/[0.08]"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {htmlMode ? (
          <>
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-widest px-1">HTML Source</span>
            <div className="flex-1" />
            <Btn active={false} onClick={exitHtmlMode} title="Back to visual editor">← Visual</Btn>
            <Sep />
            <Btn active={false} danger onClick={handleClear} title="Clear all content">Clear</Btn>
          </>
        ) : (
          <>
            {/* Format */}
            <Btn active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}      title="Bold"><b>B</b></Btn>
            <Btn active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="Italic"><i>I</i></Btn>
            <Btn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></Btn>
            <Btn active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}    title="Strikethrough"><s>S</s></Btn>
            <Sep />
            {/* Headings */}
            <Btn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</Btn>
            <Btn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</Btn>
            <Btn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</Btn>
            <Sep />
            {/* Lists */}
            <Btn active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list">• List</Btn>
            <Btn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</Btn>
            <Sep />
            {/* Code */}
            <Btn active={editor.isActive("code")}      onClick={() => editor.chain().focus().toggleCode().run()}      title="Inline code">{"`cd`"}</Btn>
            <Btn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">{"```"}</Btn>
            <Btn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">"</Btn>
            <Sep />
            {/* Align */}
            <Btn active={editor.isActive({ textAlign: "left" })}   onClick={() => editor.chain().focus().setTextAlign("left").run()}   title="Left">←</Btn>
            <Btn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Center">↔</Btn>
            <Btn active={editor.isActive({ textAlign: "right" })}  onClick={() => editor.chain().focus().setTextAlign("right").run()}  title="Right">→</Btn>
            <Sep />
            {/* Link + Table */}
            <Btn active={editor.isActive("link")} onClick={addLink}     title="Add link">Link</Btn>
            <Btn active={false}                   onClick={insertTable}  title="Insert table">Table</Btn>
            <Sep />
            {/* HTML source toggle */}
            <Btn active={false} onClick={enterHtmlMode} title="Edit raw HTML source">&lt;/&gt;</Btn>
            <Sep />
            {/* Clear */}
            <Btn active={false} danger onClick={handleClear} title="Clear all content">Clear</Btn>
          </>
        )}
      </div>

      {/* ── Content area ────────────────────────────────────────────────── */}
      {htmlMode ? (
        <div className="flex gap-0" style={{ minHeight: minHeight + 40 }}>
          {/* Raw HTML textarea */}
          <textarea
            className="flex-1 bg-transparent text-slate-300 font-mono text-xs px-3 py-2.5 focus:outline-none resize-none border-r border-white/[0.08]"
            style={{ minHeight: minHeight + 40 }}
            value={rawHtml}
            onChange={(e) => handleRawChange(e.target.value)}
            spellCheck={false}
            placeholder="<p>Enter HTML here…</p>"
          />
          {/* Live preview */}
          <div className="flex-1 px-3 py-2.5 overflow-auto">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Preview</p>
            <div
              className="rte-content text-sm"
              dangerouslySetInnerHTML={{ __html: rawHtml }}
            />
          </div>
        </div>
      ) : (
        <div className="px-3 py-2.5">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
