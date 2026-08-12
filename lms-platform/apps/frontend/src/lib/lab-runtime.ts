// Packages Pyodide (Python-in-the-browser via WebAssembly) cannot run, or
// that are pointless without a real backend/GPU — labs importing any of
// these need the E2B cloud sandbox. Everything else (numpy, matplotlib,
// pandas, scikit-learn, stdlib) runs fine in Pyodide for free.
const HEAVY_PACKAGE_PATTERNS = [
  /\btorch\b/, /\btorchvision\b/, /\btorchtext\b/,
  /\btensorflow\b/, /\bkeras\b/,
  /\bcv2\b/, /\bopencv\b/,
  /\bgym\b/, /\bgymnasium\b/,
  /\btransformers\b/, /\bhuggingface\b/,
  /\bnltk\b/,
];

export type LabRuntime = "pyodide" | "e2b";

export type CellOutput = {
  stdout: string[];
  stderr: string[];
  error: { name: string; value: string; traceback: string } | null;
  results: { text?: string; html?: string; png?: string; jpeg?: string }[];
};

// A lesson's own code cells fully determine which runtime it needs — no
// per-lesson field to keep in sync. If an admin later adds a `torch` cell
// to a currently-light lesson, it starts requiring E2B automatically.
export function detectLabRuntime(cells: { type: string; content: string }[]): LabRuntime {
  const allCode = cells.filter((c) => c.type === "code").map((c) => c.content).join("\n");
  const needsHeavy = HEAVY_PACKAGE_PATTERNS.some((re) => re.test(allCode));
  return needsHeavy ? "e2b" : "pyodide";
}

// Pyodide ships a fixed set of pre-built packages (loaded via
// `pyodide.loadPackage`); anything else pure-Python installs via micropip
// from PyPI instead. Only load what a lesson's cells actually import —
// scikit-learn (and its scipy dependency) is a meaningfully large download,
// no reason to fetch it for a lesson that never imports it.
const PYODIDE_BUILTIN_PACKAGES: Record<string, string> = {
  numpy: "numpy", matplotlib: "matplotlib", pylab: "matplotlib",
  pandas: "pandas", sklearn: "scikit-learn", scipy: "scipy",
  sympy: "sympy", networkx: "networkx", PIL: "pillow",
};
const STDLIB_MODULES = new Set([
  "sys", "os", "re", "io", "json", "math", "random", "time", "datetime", "collections",
  "itertools", "functools", "typing", "dataclasses", "pickle", "gzip", "base64", "copy",
  "abc", "enum", "warnings", "logging", "textwrap", "string", "operator", "heapq", "bisect",
]);

function detectImportedModules(cells: { type: string; content: string }[]): string[] {
  const allCode = cells.filter((c) => c.type === "code").map((c) => c.content).join("\n");
  const names = new Set<string>();
  for (const m of allCode.matchAll(/^\s*(?:import|from)\s+([a-zA-Z_][\w]*)/gm)) names.add(m[1]);
  return [...names];
}

// Splits a lesson's imports into ones Pyodide ships pre-built (fast, always
// safe) and ones worth a best-effort micropip install (e.g. a pure-Python
// PyPI package like `experta`) — anything stdlib is skipped entirely.
function resolvePackagesForCells(cells: { type: string; content: string }[]): { builtin: string[]; micropip: string[] } {
  const modules = detectImportedModules(cells);
  const builtin = new Set<string>(["numpy", "matplotlib"]); // always loaded — needed by the figure-capture prelude
  const micropip: string[] = [];
  for (const mod of modules) {
    if (STDLIB_MODULES.has(mod)) continue;
    const pyodideName = PYODIDE_BUILTIN_PACKAGES[mod];
    if (pyodideName) builtin.add(pyodideName);
    else micropip.push(mod);
  }
  return { builtin: [...builtin], micropip };
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<any>;
    __paiiPyodideScriptPromise?: Promise<void>;
  }
}

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Memoized on `window` so navigating between multiple Pyodide lessons in the
// same browser session doesn't re-inject/re-fetch the loader script.
function loadPyodideScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Pyodide requires a browser"));
  if (window.loadPyodide) return Promise.resolve();
  if (window.__paiiPyodideScriptPromise) return window.__paiiPyodideScriptPromise;
  window.__paiiPyodideScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN_BASE}pyodide.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Python runtime"));
    document.head.appendChild(script);
  });
  return window.__paiiPyodideScriptPromise;
}

// A fresh interpreter per lesson (not reused across different lessons) —
// avoids cross-lesson variable leakage and mirrors E2B's fresh-sandbox-per-
// lesson behavior. The browser's own HTTP cache keeps repeat loads fast
// after the first time in a session. The matplotlib prelude runs once so
// figure capture works regardless of what the lesson's own cells import.
// Only loads the packages this specific lesson's cells actually import —
// e.g. Genetic Algorithms never pulls in scikit-learn/scipy.
export async function createPyodideInterpreter(cells: { type: string; content: string }[]): Promise<any> {
  await loadPyodideScript();
  const pyodide = await window.loadPyodide!({ indexURL: PYODIDE_CDN_BASE });

  const { builtin, micropip } = resolvePackagesForCells(cells);
  await pyodide.loadPackage(builtin);

  if (micropip.length) {
    await pyodide.loadPackage("micropip");
    const micropipModule = pyodide.pyimport("micropip");
    for (const pkg of micropip) {
      try {
        await micropipModule.install(pkg);
      } catch {
        // Best-effort — not every PyPI package has a pure-Python/WASM-
        // compatible wheel. If it fails, the cell that imports it will
        // surface a normal ImportError when run, same as a real missing
        // dependency would.
      }
    }
  }

  await pyodide.runPythonAsync(
    'import matplotlib\nmatplotlib.use("Agg")\nimport matplotlib.pyplot as plt\n'
  );
  return pyodide;
}

// Jupyter/IPython "magic" commands (`%timeit ...`, `%%time`, `%matplotlib
// inline`, ...) only exist inside a real IPython kernel — E2B's sandbox has
// one, Pyodide's plain `runPythonAsync` does not, and would otherwise throw
// a raw SyntaxError. Comment out magic lines instead of pretending they ran;
// any real code elsewhere in the same cell still executes normally.
function stripJupyterMagics(code: string): { code: string; skipped: string[] } {
  const skipped: string[] = [];
  const cleaned = code
    .split("\n")
    .map((line) => {
      if (/^\s*%{1,2}\S/.test(line)) {
        skipped.push(line.trim());
        return `# (skipped in browser mode — Jupyter magic: ${line.trim()})`;
      }
      return line;
    })
    .join("\n");
  return { code: cleaned, skipped };
}

export async function runPyodideCell(pyodide: any, code: string): Promise<CellOutput> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  pyodide.setStdout({ batched: (s: string) => stdout.push(s) });
  pyodide.setStderr({ batched: (s: string) => stderr.push(s) });

  const { code: cleanedCode, skipped } = stripJupyterMagics(code);
  if (skipped.length) stdout.push(`ℹ Jupyter magic command(s) not available in browser mode, skipped: ${skipped.join(", ")}`);

  let error: CellOutput["error"] = null;
  try {
    await pyodide.runPythonAsync(cleanedCode);
  } catch (e: any) {
    error = { name: "PythonError", value: String(e?.message ?? e), traceback: String(e?.message ?? e) };
  }

  const results: CellOutput["results"] = [];
  try {
    const pngsRaw = await pyodide.runPythonAsync(`
import io, base64
_paii_pngs = []
for _paii_fignum in plt.get_fignums():
    _paii_fig = plt.figure(_paii_fignum)
    _paii_buf = io.BytesIO()
    _paii_fig.savefig(_paii_buf, format="png", bbox_inches="tight")
    _paii_buf.seek(0)
    _paii_pngs.append(base64.b64encode(_paii_buf.read()).decode())
plt.close("all")
_paii_pngs
`.trim());
    const pngs: string[] = pngsRaw?.toJs ? pngsRaw.toJs() : (pngsRaw ?? []);
    for (const png of pngs) results.push({ png });
  } catch {
    // figure export is best-effort — a cell erroring shouldn't also break output rendering
  }

  return { stdout, stderr, error, results };
}
