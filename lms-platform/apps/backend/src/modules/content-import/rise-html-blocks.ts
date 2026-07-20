// Converts a single Articulate Rise 360 export's item tree into HTML the
// PAII builder already knows how to render — the `html`/`reading` lesson
// player just does `dangerouslySetInnerHTML` on whatever's in `content_body`,
// so these functions produce clean, self-contained markup rather than
// anything Rise-runtime-specific.

export type PlannedQuestion = {
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer";
  options: string[];
  correct_index: number;
  explanation?: string;
};

export type PlannedLesson = {
  title: string;
  type: "html" | "quiz";
  content_html?: string;
  external_url?: string;
  questions?: PlannedQuestion[];
};

export type PlannedModule = {
  title: string;
  lessons: PlannedLesson[];
};

export type ImportPlan = {
  modules: PlannedModule[];
  flagged: string[];
  images_uploaded: number;
};

// Rise stores most text already as `<p>...</p>` (or similar block markup),
// but the "impact" pull-quote variant stores bare text with no wrapping tag —
// normalize both into valid HTML rather than assuming one shape.
function ensureBlockHtml(text: string | undefined | null): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("<") ? trimmed : `<p>${trimmed}</p>`;
}

// List items keep their own `<p>` wrapper from Rise; unwrap it so the result
// is `<li>text</li>` instead of `<li><p>text</p></li>`.
function unwrapParagraph(html: string): string {
  const match = html.trim().match(/^<p>([\s\S]*)<\/p>$/i);
  return match ? match[1] : html;
}

function renderTextItem(item: any): string {
  const inner = item.items?.[0];
  if (!inner) return "";
  let html = "";
  if (inner.heading) html += `<h2>${inner.heading}</h2>`;
  if (item.variant === "b") {
    html += `<blockquote>${unwrapParagraph(ensureBlockHtml(inner.paragraph))}</blockquote>`;
  } else {
    html += ensureBlockHtml(inner.paragraph);
  }
  return html;
}

function renderListItem(item: any): string {
  const tag = item.variant === "numbered" ? "ol" : "ul";
  const items = (item.items ?? [])
    .map((li: any) => `<li>${unwrapParagraph(ensureBlockHtml(li.paragraph))}</li>`)
    .join("");
  if (!items) return "";
  return `<${tag}>${items}</${tag}>`;
}

function guessImageContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "svg": return "image/svg+xml";
    default: return "image/jpeg";
  }
}

// Covers the full mix of file types inside a Rise export bundle (scripts,
// styles, fonts, sourcemaps, media) — browsers enforce correct MIME types
// for scripts/stylesheets, so getting this right matters when re-hosting
// the whole bundle, not just its images.
export function guessGeneralContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "html": return "text/html";
    case "js": return "application/javascript";
    case "css": return "text/css";
    case "json": case "map": return "application/json";
    case "woff": return "font/woff";
    case "woff2": return "font/woff2";
    case "ttf": return "font/ttf";
    case "otf": return "font/otf";
    case "svg": return "image/svg+xml";
    case "png": return "image/png";
    case "jpg": case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "ico": return "image/x-icon";
    case "mp4": return "video/mp4";
    case "mp3": return "audio/mpeg";
    default: return "application/octet-stream";
  }
}

async function renderImageItem(
  item: any,
  assets: Map<string, Buffer>,
  uploadBuffer: (buffer: Buffer, keySuffix: string, contentType: string) => Promise<string>,
  flags: string[],
): Promise<{ html: string; uploaded: boolean }> {
  const media = item.items?.[0]?.media?.image;
  // `key` is sometimes a nested "original asset" path rather than a filename
  // under assets/ — `crushedKey` (Rise's optimized/resized copy) is the one
  // that reliably matches what's actually in the export's assets/ folder.
  const key: string | undefined = media?.crushedKey ?? media?.key;
  if (!key) return { html: "", uploaded: false };

  const buffer = assets.get(key);
  if (!buffer) {
    flags.push(`image "${key}" referenced but not found in the export`);
    return { html: "", uploaded: false };
  }

  const url = await uploadBuffer(buffer, key, guessImageContentType(key));
  const alt = (media.altText ?? "").replace(/"/g, "&quot;");
  return {
    html: `<img src="${url}" alt="${alt}" />`,
    uploaded: true,
  };
}

function extractPlainText(html: string | undefined | null): string {
  return (html ?? "").replace(/<[^>]+>/g, "").trim();
}

// Only needs to be unique within a single generated lesson (scopes the
// radio-input `name`/`id`s for the CSS-only tabs technique) — not a
// cryptographic ID, just cheap collision avoidance.
let uidCounter = 0;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${Date.now().toString(36)}${uidCounter}`;
}

// Every content lesson carries its own fonts + typography — the player
// renders this via `srcDoc` on a sandboxed iframe in some places (a
// standalone document with no access to the host app's stylesheet or
// `next/font` variables) and via dangerouslySetInnerHTML in others, so
// nothing outside this string can be relied on. Ties the reading
// experience to PAII's actual brand (Fraunces/Jakarta, navy/teal) instead
// of an unstyled browser default.
// Loaded non-render-blocking (preload + swap-on-load, standard "loadCSS"
// pattern): a plain <link rel="stylesheet"> pauses painting the whole
// document until the request resolves, so on a slow/blocked network the
// entire lesson would render blank instead of just falling back to system
// fonts. The <noscript> copy covers the (here, irrelevant since sandbox
// always allows scripts) case where scripting is unavailable.
const LESSON_STYLE_BLOCK = `
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"></noscript>
<style>
  .pv-lesson { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #403d57; line-height: 1.7; font-size: 17px; }
  .pv-lesson > * { max-width: 760px; margin-left: auto; margin-right: auto; }
  .pv-lesson > *:first-child { margin-top: 0; }
  .pv-lesson img { max-width: 900px; width: 100%; border-radius: 12px; display: block; margin: 32px auto; }
  .pv-lesson h1, .pv-lesson h2 { font-family: 'Fraunces', Georgia, serif; color: #171527; font-weight: 700; line-height: 1.25; margin: 44px auto 16px; font-size: 28px; }
  .pv-lesson h3 { font-family: 'Fraunces', Georgia, serif; color: #171527; font-weight: 600; line-height: 1.3; margin: 32px auto 12px; font-size: 20px; }
  .pv-lesson p { margin: 0 auto 18px; }
  .pv-lesson ul, .pv-lesson ol { margin: 0 auto 18px; padding-left: 22px; }
  .pv-lesson li { margin-bottom: 8px; }
  .pv-lesson a { color: #0d9488; }
  .pv-lesson blockquote { margin: 32px auto; padding: 2px 0 2px 22px; border-left: 3px solid #14b8a6; font-family: 'Fraunces', Georgia, serif; font-style: italic; font-size: 21px; color: #2d2b43; }
  .pv-lesson hr { border: none; border-top: 1px solid #e5e4ef; margin: 44px auto; }
  .pv-lesson .pv-checkpoint { padding: 22px 24px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 14px; }
  .pv-lesson .pv-checkpoint-badge { display: flex; align-items: center; gap: 6px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #0d9488; margin: 0 0 14px; }
</style>`;

// Wraps a lesson's assembled block HTML with the shared stylesheet above —
// call once per lesson (not per block), around the final joined string.
export function wrapLessonContent(bodyHtml: string): string {
  return `${LESSON_STYLE_BLOCK}\n<div class="pv-lesson">${bodyHtml}</div>`;
}

// Every interactive block shares this shell — a teal-tinted card with a
// small uppercase label — so as a student scrolls a long lesson, these
// read as one consistent rhythm of "pause and engage" moments rather than
// each block having its own ad hoc styling.
function checkpointCard(badge: string, innerHtml: string): string {
  return `<div class="pv-checkpoint">
    <p class="pv-checkpoint-badge">${badge}</p>
    ${innerHtml}
  </div>`;
}

// Click-to-reveal cards via native <details>/<summary> — no JS needed, works
// anywhere content_body is rendered via dangerouslySetInnerHTML.
function renderFlashcards(item: any, flags: string[]): string {
  const cards = (item.items ?? [])
    .map((c: any) => {
      const front = unwrapParagraph(ensureBlockHtml(c.front?.description));
      const back = unwrapParagraph(ensureBlockHtml(c.back?.description));
      return `<details style="background:#fff;border:1px solid #99f6e4;border-radius:8px;padding:10px 16px;margin-bottom:8px;">
        <summary style="font-weight:600;cursor:pointer;color:#171527;">${front}</summary>
        <p style="margin:8px 0 0;color:#403d57;">${back}</p>
      </details>`;
    })
    .join("");
  if (!cards) return "";
  flags.push("a flashcard set was converted to click-to-reveal cards");
  return checkpointCard("Flashcards", `<div>${cards}</div>`);
}

// Native expandable sections — same <details> technique as flashcards.
function renderAccordion(item: any, flags: string[]): string {
  const entries = (item.items ?? [])
    .map((e: any) => `<details style="background:#fff;border:1px solid #99f6e4;border-radius:8px;padding:10px 16px;margin-bottom:8px;">
      <summary style="font-weight:600;cursor:pointer;color:#171527;">${e.title ?? ""}</summary>
      <div style="margin-top:8px;color:#403d57;">${ensureBlockHtml(e.description)}</div>
    </details>`)
    .join("");
  if (!entries) return "";
  flags.push("an accordion was converted to expandable sections");
  return checkpointCard("Expand for details", `<div>${entries}</div>`);
}

// CSS-only radio-button tabs — the checked radio's `~` general-sibling
// selector reveals the matching panel/label, entirely without JavaScript.
// Radios/labels/panels all live inside one wrapper, so the `~` matches stay
// scoped to this tab group even with several tab blocks in the same lesson.
function renderTabs(item: any, flags: string[]): string {
  const entries: any[] = item.items ?? [];
  if (!entries.length) return "";
  const groupId = nextUid("tabs");

  const inputs = entries
    .map((_e: any, i: number) =>
      `<input type="radio" name="${groupId}" id="${groupId}-${i}" ${i === 0 ? "checked" : ""} style="position:absolute;opacity:0;pointer-events:none;">`)
    .join("");

  const labels = entries
    .map((e: any, i: number) =>
      `<label for="${groupId}-${i}" style="display:inline-block;padding:8px 14px;margin:0 4px 6px 0;border:1px solid #99f6e4;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;color:#0f766e;background:#fff;">${e.title ?? ""}</label>`)
    .join("");

  const panels = entries
    .map((e: any, i: number) =>
      `<div data-tab-panel="${i}" style="display:none;background:#fff;border:1px solid #99f6e4;border-radius:8px;padding:14px 16px;">${ensureBlockHtml(e.description)}</div>`)
    .join("");

  // !important is required here: each panel's own `display:none` is an
  // inline style attribute, which always wins over a plain embedded
  // stylesheet rule regardless of selector specificity — without it this
  // rule matches (the radio really does get checked) but never shows anything.
  const rules = entries
    .map((_e: any, i: number) => `#${groupId}-${i}:checked ~ .pv-tab-panels [data-tab-panel="${i}"]{display:block !important;}
#${groupId}-${i}:checked ~ .pv-tab-labels label[for="${groupId}-${i}"]{background:#171527;color:#fff;border-color:#171527;}`)
    .join("\n");

  flags.push("a tab group was converted to clickable tabs");

  return checkpointCard("Explore the tabs", `<div style="position:relative;">
    <style>${rules}</style>
    ${inputs}
    <div class="pv-tab-labels">${labels}</div>
    <div class="pv-tab-panels">${panels}</div>
  </div>`);
}

// Always-visible date/title, description behind a per-entry <details> toggle.
function renderTimeline(item: any, flags: string[]): string {
  const entries: any[] = item.items ?? [];
  const rows = entries
    .map((e: any) => `<div style="display:flex;gap:16px;margin-bottom:14px;">
      <div style="flex:0 0 140px;font-weight:600;color:#0f766e;font-size:13px;">${e.date ?? ""}</div>
      <details style="flex:1;background:#fff;border:1px solid #99f6e4;border-radius:8px;padding:8px 14px;">
        <summary style="font-weight:600;cursor:pointer;color:#171527;">${e.title ?? ""}</summary>
        <div style="margin-top:6px;color:#403d57;">${ensureBlockHtml(e.description)}</div>
      </details>
    </div>`)
    .join("");
  if (!rows) return "";
  flags.push("a timeline was converted to an expandable sequence");
  return checkpointCard("Timeline", `<div>${rows}</div>`);
}

// Numbered step sequence; intro/summary items are styled distinctly and
// expanded by default since they're framing content, not the steps themselves.
function renderProcess(item: any, flags: string[]): string {
  const entries: any[] = item.items ?? [];
  let stepNum = 0;
  const rows = entries
    .map((e: any) => {
      const isStep = e.type === "step";
      const badge = isStep ? String(++stepNum) : e.type === "intro" ? "→" : "✓";
      return `<div style="display:flex;gap:14px;margin-bottom:12px;">
        <div style="flex:0 0 28px;height:28px;border-radius:50%;background:${isStep ? "#171527" : "#0f766e"};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">${badge}</div>
        <details style="flex:1;background:#fff;border:1px solid #99f6e4;border-radius:8px;padding:8px 14px;" ${!isStep ? "open" : ""}>
          <summary style="font-weight:600;cursor:pointer;color:#171527;">${e.title ?? ""}</summary>
          <div style="margin-top:6px;color:#403d57;">${ensureBlockHtml(e.description)}</div>
        </details>
      </div>`;
    })
    .join("");
  if (!rows) return "";
  flags.push("a process sequence was converted to expandable steps");
  return checkpointCard("Process", `<div>${rows}</div>`);
}

// Runs the click-to-categorize interaction. Duplicates the logic in
// interactive-content.ts (used via a ref+useEffect wherever content_body is
// rendered through dangerouslySetInnerHTML) as an inline plain-JS <script>,
// because one lesson player (the certification-track player's "html" lesson
// type) renders content_body inside a sandboxed <iframe srcDoc="...">
// instead — a real document load, not an innerHTML injection, so it's a
// separate document the outer ref-based wiring can never reach into.
// Deliberately harmless everywhere else: browsers never execute <script>
// tags injected via innerHTML/dangerouslySetInnerHTML, so on every other
// render path this tag just sits inert and the outer wiring does the work.
const SORT_ENHANCER_SCRIPT = `<script>(function(){
var ex = document.currentScript.closest('[data-sort-exercise]');
if (!ex) return;
var bank = ex.querySelector('[data-sort-bank]');
var checkBtn = ex.querySelector('[data-sort-check]');
var resetBtn = ex.querySelector('[data-sort-reset]');
if (!bank || !checkBtn || !resetBtn) return;
var selected = null;
function clearSel(){ if (selected) selected.style.outline = ''; selected = null; }
ex.addEventListener('click', function(e){
  var item = e.target.closest('[data-sort-item]');
  if (item && ex.contains(item) && !item.dataset.locked) {
    if (selected === item) { clearSel(); } else { clearSel(); selected = item; item.style.outline = '2px solid #0f172a'; }
    return;
  }
  var cat = e.target.closest('[data-sort-category]');
  if (cat && selected) { selected.style.outline = ''; cat.appendChild(selected); clearSel(); return; }
  if (e.target.closest('[data-sort-bank]') && selected) { selected.style.outline = ''; bank.appendChild(selected); clearSel(); }
});
checkBtn.addEventListener('click', function(){
  ex.querySelectorAll('[data-sort-item]').forEach(function(item){
    var cat = item.closest('[data-sort-category]');
    var correct = cat && cat.getAttribute('data-category-id') === item.getAttribute('data-correct-category');
    item.dataset.locked = 'true';
    item.style.pointerEvents = 'none';
    item.style.outline = '';
    if (cat) { item.style.background = correct ? '#dcfce7' : '#fee2e2'; item.style.borderColor = correct ? '#22c55e' : '#ef4444'; }
    else { item.style.background = '#fef9c3'; item.style.borderColor = '#eab308'; }
  });
  clearSel();
  checkBtn.style.display = 'none';
  resetBtn.hidden = false;
});
resetBtn.addEventListener('click', function(){
  ex.querySelectorAll('[data-sort-item]').forEach(function(item){
    delete item.dataset.locked;
    item.style.pointerEvents = '';
    item.style.background = '#fff';
    item.style.borderColor = '#cbd5e1';
    bank.appendChild(item);
  });
  clearSel();
  checkBtn.style.display = '';
  resetBtn.hidden = true;
});
})();</script>`;

function renderSorting(item: any, flags: string[]): string {
  const piles: any[] = item.piles ?? [];
  const sortItems: any[] = item.items ?? [];
  if (!piles.length || !sortItems.length) return "";

  // Shuffle so the bank doesn't hand the grouping away up front.
  const shuffled = [...sortItems].sort(() => Math.random() - 0.5);

  const bankItems = shuffled
    .map((i: any) =>
      `<button type="button" data-sort-item data-correct-category="${i.pileId}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid #99f6e4;border-radius:20px;background:#fff;cursor:pointer;font-size:13px;color:#171527;">${i.title}</button>`)
    .join("");

  const categories = piles
    .map((p: any) =>
      `<div data-sort-category data-category-id="${p.id}" style="flex:1;min-width:160px;border:2px dashed #5eead4;border-radius:10px;padding:12px;min-height:64px;background:#fff;">
        <p style="font-weight:600;margin:0 0 8px;font-size:13px;color:#0f766e;">${p.title}</p>
      </div>`)
    .join("");

  flags.push("a sorting exercise was converted to a click-to-categorize activity (tap an item, then tap its category) — ungraded, not tied to lesson completion");

  return checkpointCard("Sort the items", `<div data-sort-exercise>
    <p style="font-style:italic;color:#0f766e;margin:0 0 10px;font-size:13px;">Tap an item, then tap the category it belongs to.</p>
    <div data-sort-bank style="margin-bottom:14px;">${bankItems}</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">${categories}</div>
    <div style="margin-top:14px;display:flex;gap:8px;">
      <button type="button" data-sort-check style="padding:8px 16px;border-radius:8px;background:#171527;color:#fff;font-weight:600;font-size:13px;border:none;cursor:pointer;">Check Answers</button>
      <button type="button" data-sort-reset hidden style="padding:8px 16px;border-radius:8px;background:#fff;border:1px solid #99f6e4;font-weight:600;font-size:13px;cursor:pointer;color:#171527;">Reset</button>
    </div>
    ${SORT_ENHANCER_SCRIPT}
  </div>`);
}

function renderInteractiveItem(item: any, flags: string[]): string {
  if (item.family === "flashcard") return renderFlashcards(item, flags);
  if (item.family === "interactive" && item.variant === "accordion") return renderAccordion(item, flags);
  if (item.family === "interactive" && item.variant === "tabs") return renderTabs(item, flags);
  if (item.family === "interactive-fullscreen" && item.variant === "timeline") return renderTimeline(item, flags);
  if (item.family === "interactive-fullscreen" && item.variant === "process") return renderProcess(item, flags);
  if (item.family === "interactive-fullscreen" && item.variant === "sorting") return renderSorting(item, flags);

  // Unrecognized interactive variant — don't drop it, extract whatever text
  // labels it carries so the content survives in a plain, readable form.
  const labels = JSON.stringify(item)
    .match(/"title":"[^"]*"|"description":"[^"]*"/g)
    ?.map((m) => extractPlainText(m.split(":").slice(1).join(":").replace(/(^"|"$)/g, "")))
    .filter(Boolean);
  if (labels?.length) {
    flags.push(`an unrecognized interactive block ("${item.family}/${item.variant}") was flattened to a plain list`);
    return `<ul>${labels.map((l) => `<li>${l}</li>`).join("")}</ul>`;
  }
  flags.push(`an unrecognized interactive block ("${item.family}/${item.variant}") had no extractable text and was skipped`);
  return "";
}

// CSS-only click-to-answer: same radio + `~` sibling technique as
// renderTabs, revealing per-option feedback (Rise stores feedback text on
// every answer, not just the correct one) once that option is picked.
// Ungraded — a review widget embedded in reading content, not the real
// quiz lesson (which already grades for real via QuizQuestion rows).
function renderKnowledgeCheckItem(item: any): string {
  const q = item.items?.[0];
  if (!q) return "";
  const answers: any[] = q.answers ?? [];
  if (!answers.length) return "";
  const groupId = nextUid("kc");

  const inputs = answers
    .map((_a: any, i: number) =>
      `<input type="radio" name="${groupId}" id="${groupId}-${i}" style="position:absolute;opacity:0;pointer-events:none;">`)
    .join("");

  const optionsHtml = answers
    .map((a: any, i: number) =>
      `<label for="${groupId}-${i}" style="display:block;padding:10px 14px;background:#fff;border:1px solid #99f6e4;border-radius:8px;cursor:pointer;font-size:14px;color:#171527;">${a.title}</label>`)
    .join("");

  const feedbackHtml = answers
    .map((a: any, i: number) => {
      const tone = a.correct
        ? "border-left:3px solid #22c55e;background:#f0fdf4;color:#166534;"
        : "border-left:3px solid #ef4444;background:#fef2f2;color:#991b1b;";
      const label = a.correct ? "Correct" : "Not quite";
      return `<div data-feedback="${i}" style="display:none;margin-top:10px;padding:8px 14px;border-radius:0 8px 8px 0;font-size:13px;${tone}">
        <strong>${label}.</strong> ${a.feedback ?? ""}
      </div>`;
    })
    .join("");

  // !important is required: each feedback panel's own inline `display:none`
  // otherwise always wins over the embedded stylesheet rule regardless of
  // selector — see the identical note in renderTabs.
  const rules = answers
    .map((_a: any, i: number) => `#${groupId}-${i}:checked ~ .pv-kc-options label[for="${groupId}-${i}"]{border-color:#171527;}
#${groupId}-${i}:checked ~ .pv-kc-feedback [data-feedback="${i}"]{display:block !important;}`)
    .join("\n");

  return checkpointCard("Knowledge check", `<div style="position:relative;">
    <style>${rules}</style>
    ${inputs}
    <p style="font-weight:600;margin:0 0 12px;color:#171527;">${q.title}</p>
    <div class="pv-kc-options" style="display:flex;flex-direction:column;gap:8px;">${optionsHtml}</div>
    <div class="pv-kc-feedback">${feedbackHtml}</div>
  </div>`);
}

// Rise quiz items whose type PAII's QuizQuestion model has no room for
// (multi-select, matching pairs, fill-in-the-blank) — rendered as a styled,
// readable review card instead of being dropped or forced into a lossy
// single-answer approximation.
export function renderReviewQuestion(item: any): string {
  const title = item.title ?? "";
  let body: string;

  if (item.type === "FILL_IN_THE_BLANK") {
    const answer = item.answers?.[0]?.title ?? "";
    body = `<p style="margin:0 0 8px;">${title}</p><p style="margin:0;font-weight:600;color:#0f766e;">Answer: ${answer}</p>`;
  } else if (item.type === "MATCHING") {
    const rows = (item.answers ?? [])
      .map((a: any) => `<tr><td style="padding:4px 16px 4px 0;">${a.title}</td><td style="padding:4px 0;color:#0f766e;font-weight:600;">${a.matchTitle}</td></tr>`)
      .join("");
    body = `<p style="margin:0 0 8px;">${title}</p><table style="border-collapse:collapse;">${rows}</table>`;
  } else if (item.type === "MULTIPLE_RESPONSE") {
    const correctIds = new Set<string>(item.corrects ?? []);
    const optionsHtml = (item.answers ?? [])
      .map((a: any) => `<li style="${correctIds.has(a.id) ? "font-weight:600;color:#0f766e;" : ""}">${correctIds.has(a.id) ? "&#10003; " : ""}${a.title}</li>`)
      .join("");
    body = `<p style="margin:0 0 8px;">${title}</p><ul style="margin:0;padding-left:20px;">${optionsHtml}</ul>`;
  } else {
    body = `<p>${title}</p>`;
  }

  const feedback = item.feedbackCorrect;
  return checkpointCard("Review question", `${body}
    ${feedback ? `<p style="margin:8px 0 0;font-size:13px;color:#403d57;">${feedback}</p>` : ""}`);
}

// Shared block-item dispatch — walks a flat item list and renders each one,
// used by both the Rise importer (buildImportPlan) and the manual block
// builder. Image items come in two shapes: Rise's own (`items[0].media.
// image.key`, looked up in `assets` and uploaded) and manually-added blocks
// (`item.url` already points at an uploaded file — no asset lookup needed).
// Manually-added block types with no Rise equivalent — video embed, a
// static highlighted note/tip/warning, and a code snippet. Not wrapped in
// the checkpoint card (that styling is reserved for genuinely interactive
// pause points); each gets its own distinct treatment instead.
function renderVideoBlock(block: any): string {
  const url: string = block.url ?? "";
  if (!url) return "";
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");
  const caption = block.caption ? `<p style="text-align:center;font-size:13px;color:#64748b;margin:10px 0 0;">${block.caption}</p>` : "";

  let player: string;
  if (isYouTube) {
    const id = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("/").pop();
    player = `<iframe src="https://www.youtube.com/embed/${id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen title="Video"></iframe>`;
  } else if (isVimeo) {
    player = `<iframe src="https://player.vimeo.com/video/${url.split("/").pop()}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen title="Video"></iframe>`;
  } else {
    player = `<video src="${url}" controls style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;"></video>`;
  }

  return `<div style="margin:32px auto;max-width:900px;">
    <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;background:#000;">${player}</div>
    ${caption}
  </div>`;
}

const CALLOUT_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  note: { bg: "#f0fdfa", border: "#99f6e4", color: "#0f766e", label: "Note" },
  tip: { bg: "#fefce8", border: "#fde047", color: "#a16207", label: "Tip" },
  warning: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", label: "Warning" },
};

function renderCalloutBlock(block: any): string {
  const s = CALLOUT_STYLES[block.variant] ?? CALLOUT_STYLES.note;
  const body = ensureBlockHtml(block.text);
  if (!body) return "";
  return `<div style="margin:24px auto;max-width:760px;padding:16px 20px;background:${s.bg};border:1px solid ${s.border};border-radius:10px;">
    <p style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${s.color};margin:0 0 8px;">${s.label}</p>
    <div style="color:#403d57;font-size:15px;line-height:1.6;">${body}</div>
  </div>`;
}

function renderCodeBlock(block: any): string {
  const code = (block.code ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (!code.trim()) return "";
  const lang = (block.language ?? "").trim();
  return `<div style="margin:24px auto;max-width:900px;border-radius:10px;overflow:hidden;background:#171527;">
    ${lang ? `<div style="padding:8px 16px;font-size:11px;color:#a09dbe;border-bottom:1px solid #2d2b43;text-transform:uppercase;letter-spacing:0.05em;">${lang}</div>` : ""}
    <pre style="margin:0;padding:16px 20px;overflow-x:auto;"><code style="font-family:ui-monospace,Consolas,monospace;font-size:13.5px;line-height:1.6;color:#e5e4ef;">${code}</code></pre>
  </div>`;
}

export async function renderBlockItems(
  items: any[],
  assets: Map<string, Buffer>,
  uploadBuffer: (buffer: Buffer, keySuffix: string, contentType: string) => Promise<string>,
  flags: string[],
): Promise<{ html: string; imagesUploaded: number }> {
  const htmlParts: string[] = [];
  let imagesUploaded = 0;

  for (const item of items ?? []) {
    switch (item.type) {
      case "text":
        htmlParts.push(renderTextItem(item));
        break;
      case "list":
        htmlParts.push(renderListItem(item));
        break;
      case "image": {
        if (item.url) {
          // Manually-added block — already uploaded via the block builder's
          // own upload endpoint, just reference it directly.
          const alt = (item.alt ?? "").replace(/"/g, "&quot;");
          htmlParts.push(`<img src="${item.url}" alt="${alt}" />`);
          break;
        }
        // A single broken/misconfigured image upload shouldn't sink the
        // rest of an otherwise-good page — skip it and keep going.
        try {
          const { html, uploaded } = await renderImageItem(item, assets, uploadBuffer, flags);
          if (uploaded) imagesUploaded++;
          htmlParts.push(html);
        } catch (err: any) {
          flags.push(`an image failed to upload (${err?.message ?? "unknown error"}) and was skipped`);
        }
        break;
      }
      case "interactive":
        htmlParts.push(renderInteractiveItem(item, flags));
        break;
      case "knowledgeCheck":
        htmlParts.push(renderKnowledgeCheckItem(item));
        break;
      case "divider":
        htmlParts.push("<hr />");
        break;
      case "video":
        htmlParts.push(renderVideoBlock(item));
        break;
      case "callout":
        htmlParts.push(renderCalloutBlock(item));
        break;
      case "code":
        htmlParts.push(renderCodeBlock(item));
        break;
      default:
        flags.push(`block type "${item.type}" was skipped (no renderer for it)`);
    }
  }

  return { html: htmlParts.filter(Boolean).join("\n"), imagesUploaded };
}

export const riseBlocks = {
  renderTextItem,
  renderListItem,
  renderImageItem,
  renderInteractiveItem,
  renderKnowledgeCheckItem,
};
