"use client";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export const CODE_LANGUAGES = [
  { value: "python",     label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html",       label: "HTML" },
  { value: "css",        label: "CSS" },
  { value: "sql",        label: "SQL" },
  { value: "java",       label: "Java" },
  { value: "cpp",        label: "C++" },
  { value: "csharp",     label: "C#" },
  { value: "go",         label: "Go" },
];

interface Props {
  language: string;
  onLanguageChange: (lang: string) => void;
  starterCode: string;
  onStarterCodeChange: (code: string) => void;
}

export function CodeEditor({ language, onLanguageChange, starterCode, onStarterCodeChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Language</label>
        <select className="input" value={language} onChange={(e) => onLanguageChange(e.target.value)}>
          {CODE_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Starter code <span className="text-slate-600 normal-case font-normal">(optional — shown to student at start)</span></label>
        <div
          className="rounded-xl overflow-hidden border border-white/[0.12]"
          style={{ height: 200 }}
        >
          <MonacoEditor
            height="200px"
            language={language}
            value={starterCode}
            onChange={(val) => onStarterCodeChange(val ?? "")}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              wordWrap: "on",
              renderLineHighlight: "gutter",
              padding: { top: 8, bottom: 8 },
              automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
