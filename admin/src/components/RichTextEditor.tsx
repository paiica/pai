"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import UnderlineExt from "@tiptap/extension-underline";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import toast from "react-hot-toast";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered,
  Quote, Link as LinkIcon, Image as ImageIcon, Undo2, Redo2, AlignLeft, AlignCenter, AlignRight,
  Palette, Minus, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

// TipTap's core doesn't ship a font-size mark out of the box — extend
// TextStyle with one (the pattern TipTap's own docs recommend), rendered as
// an inline style so it survives round-tripping through content_body's raw
// HTML the same way color/font-family already do.
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) =>
        chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize: () => ({ chain }) =>
        chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans Serif", value: "ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "ui-serif, Georgia, serif" },
  { label: "Monospace", value: "ui-monospace, monospace" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
];

function ToolbarButton({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
        active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, token }: { editor: Editor; token?: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  // With a token, upload the file (same /uploads/content-image endpoint the
  // block-based lesson builder's Image block already uses) and insert the
  // resulting URL. Without one — e.g. editors nested where a token isn't
  // threaded through yet — fall back to pasting a URL directly, mirroring
  // the Link button above rather than silently having no image support.
  const insertImage = useCallback(async () => {
    if (!token) {
      const url = window.prompt("Image URL", "https://");
      if (url) editor.chain().focus().setImage({ src: url }).run();
      return;
    }
    fileInputRef.current?.click();
  }, [editor, token]);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1"}/uploads/content-image`;
      let activeToken = token;
      let res = await fetch(uploadUrl, { method: "POST", headers: { Authorization: `Bearer ${activeToken}` }, body: formData });
      if (res.status === 401) {
        const refreshed = await useAuthStore.getState().refreshTokens();
        if (!refreshed) throw new Error("Session expired");
        activeToken = useAuthStore.getState().accessToken!;
        res = await fetch(uploadUrl, { method: "POST", headers: { Authorization: `Bearer ${activeToken}` }, body: formData });
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? "Upload failed");
      const url = json?.data?.url ?? json?.url;
      if (!url) throw new Error("No URL in upload response");
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err: any) {
      toast.error(err?.message ?? "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }, [editor, token]);

  return (
    <div className="flex items-center gap-1 flex-wrap p-1.5 border border-slate-200 border-b-0 rounded-t-xl bg-slate-50">
      <select
        className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white text-slate-600 mr-1"
        title="Paragraph style"
        onChange={(e) => {
          const val = e.target.value;
          if (val === "p") editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: Number(val) as 1 | 2 | 3 }).run();
        }}
        value={
          editor.isActive("heading", { level: 1 }) ? "1"
          : editor.isActive("heading", { level: 2 }) ? "2"
          : editor.isActive("heading", { level: 3 }) ? "3"
          : "p"
        }
      >
        <option value="p">Paragraph</option>
        <option value="1">Topic (H1)</option>
        <option value="2">Subtopic (H2)</option>
        <option value="3">Heading (H3)</option>
      </select>

      <select
        className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white text-slate-600 mr-1 max-w-[110px]"
        title="Font family"
        defaultValue=""
        onChange={(e) => {
          const val = e.target.value;
          if (!val) editor.chain().focus().unsetFontFamily().run();
          else editor.chain().focus().setFontFamily(val).run();
        }}
      >
        {FONT_FAMILIES.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>

      <select
        className="text-xs border border-slate-200 rounded-md px-1.5 py-1 bg-white text-slate-600 mr-2"
        title="Font size"
        defaultValue=""
        onChange={(e) => {
          const val = e.target.value;
          if (!val) editor.chain().focus().unsetFontSize().run();
          else editor.chain().focus().setFontSize(val).run();
        }}
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      <ToolbarButton title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={14} />
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={14} />
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      <label className="relative flex items-center justify-center w-7 h-7 rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer" title="Text color">
        <Palette size={14} />
        <input
          type="color"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      <ToolbarButton title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus size={14} />
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon size={14} />
      </ToolbarButton>
      <ToolbarButton title={token ? "Insert image" : "Insert image (by URL)"} disabled={uploadingImage} onClick={insertImage}>
        {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
      </ToolbarButton>
      {token && (
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      )}

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      <ToolbarButton title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft size={14} />
      </ToolbarButton>
      <ToolbarButton title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter size={14} />
      </ToolbarButton>
      <ToolbarButton title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight size={14} />
      </ToolbarButton>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={14} />
      </ToolbarButton>
    </div>
  );
}

// Drop-in replacement for a plain `<textarea>` bound to an HTML string —
// same value/onChange contract, so it slots into existing `content`/
// `setContent` state without touching the surrounding save logic. Output is
// always HTML (even a single unformatted paragraph becomes `<p>...</p>`),
// matching what content_body already expects downstream.
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 280, maxHeight = 500, token }: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  // Enables the image toolbar button to actually upload a file (via the same
  // /uploads/content-image endpoint the block-based lesson builder uses)
  // instead of falling back to a plain "paste a URL" prompt.
  token?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      FontFamily,
      FontSize,
      UnderlineExt,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      LinkExt.configure({ openOnClick: false, autolink: true }),
      ImageExt.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your lesson content here…" }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3",
      },
    },
  });

  // Keep the editor in sync when `value` changes externally — switching to a
  // different lesson, or an AI-generated draft replacing the content.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl">
      <Toolbar editor={editor} token={token} />
      {/* Grows with content between minHeight and maxHeight (a long
          paragraph shouldn't be stuck showing two lines) — past maxHeight
          it switches to an internal scrollbar instead of growing forever
          and pushing everything else off-screen. */}
      <div className="border border-slate-200 rounded-b-xl bg-white overflow-y-auto" style={{ minHeight, maxHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
