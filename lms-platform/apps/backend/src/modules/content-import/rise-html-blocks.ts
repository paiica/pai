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

// Shared by lesson images (`item.items[0].media.image`) and the course
// cover image (`course.coverImage.media.image`) — both carry the exact same
// `{ key, crushedKey, altText }` shape.
async function resolveMediaImageUrl(
  media: any,
  assets: Map<string, Buffer>,
  uploadBuffer: (buffer: Buffer, keySuffix: string, contentType: string) => Promise<string>,
): Promise<string | null> {
  // `key` is sometimes a nested "original asset" path rather than a filename
  // under assets/ — `crushedKey` (Rise's optimized/resized copy) is the one
  // that reliably matches what's actually in the export's assets/ folder.
  const key: string | undefined = media?.crushedKey ?? media?.key;
  if (!key) return null;
  const buffer = assets.get(key);
  if (!buffer) return null;
  return uploadBuffer(buffer, key, guessImageContentType(key));
}

async function renderImageItem(
  item: any,
  assets: Map<string, Buffer>,
  uploadBuffer: (buffer: Buffer, keySuffix: string, contentType: string) => Promise<string>,
  flags: string[],
): Promise<{ html: string; uploaded: boolean }> {
  const media = item.items?.[0]?.media?.image;
  const key: string | undefined = media?.crushedKey ?? media?.key;
  if (!key) return { html: "", uploaded: false };

  const url = await resolveMediaImageUrl(media, assets, uploadBuffer);
  if (!url) {
    flags.push(`image "${key}" referenced but not found in the export`);
    return { html: "", uploaded: false };
  }

  const alt = (media.altText ?? "").replace(/"/g, "&quot;");
  return {
    html: `<img src="${url}" alt="${alt}" />`,
    uploaded: true,
  };
}

// Rise's own "Course Cover" screen (title + description + optional hero
// image, configured in Course Settings) — normally rendered by Rise's own
// app shell before Lesson 1. Decompose mode rebuilds every lesson from
// `course.lessons` alone, which has no room for this, so this reconstructs
// it as the very first module instead, using the same `course.description`/
// `course.coverImage` fields Rise itself stores. Returns empty html if the
// course has neither (nothing worth a whole extra module for).
export async function buildCoverPageHtml(
  course: any,
  assets: Map<string, Buffer>,
  uploadBuffer: (buffer: Buffer, keySuffix: string, contentType: string) => Promise<string>,
): Promise<{ html: string; imageUploaded: boolean }> {
  const title: string = course?.title || "";
  const description: string = typeof course?.description === "string" ? course.description.trim() : "";
  const coverMedia = course?.coverImage?.media?.image;
  const imageUrl = coverMedia ? await resolveMediaImageUrl(coverMedia, assets, uploadBuffer) : null;

  if (!description && !imageUrl) return { html: "", imageUploaded: false };

  const heroHtml = `<div class="pv-cover-hero" style="${imageUrl
    ? "position:relative;background:#171527;"
    : "padding:40px 36px;background:linear-gradient(135deg,#171527,#2d2b43);"
  }border-radius:20px;overflow:hidden;margin:0 auto 36px;">
    ${imageUrl ? `<img src="${imageUrl}" alt="" style="width:100%;height:280px;object-fit:cover;display:block;opacity:0.5;" />` : ""}
    <div style="${imageUrl ? "position:absolute;inset:0;" : ""}display:flex;flex-direction:column;justify-content:flex-end;padding:${imageUrl ? "32px 36px" : "0"};">
      <p style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;font-weight:700;color:#5eead4;margin:0 0 10px;">Welcome</p>
      <h1 style="font-family:'Fraunces',Georgia,serif;font-size:30px;font-weight:800;color:#fff;margin:0;line-height:1.2;">${title}</h1>
    </div>
  </div>`;

  const bodyHtml = description ? `<div class="pv-cover-description">${description}</div>` : "";

  return { html: `${heroHtml}${bodyHtml}`, imageUploaded: !!imageUrl };
}

function extractPlainText(html: string | undefined | null): string {
  return (html ?? "").replace(/<[^>]+>/g, "").trim();
}

// Strips a lesson's stored HTML down to a short plain-text excerpt for
// AI prompts (the "Fill from Build" overview drafting and the AI Professor
// chat both need this) — script/style blocks are removed first, since the
// block builder's checkpoint-styled interactive blocks embed sizeable
// <style> blocks that would otherwise pollute the excerpt with CSS.
export function stripHtmlExcerpt(html: string | null | undefined, maxLen = 400): string {
  if (!html) return "";
  const withoutScriptsStyles = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const text = withoutScriptsStyles.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
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

  /* Cover page (Welcome module) */
  .pv-lesson .pv-cover-hero { max-width: 900px; }
  .pv-lesson .pv-cover-description p:last-child { margin-bottom: 0; }

  /* Shared fade-in for content that toggles display:none <-> block (tabs,
     knowledge check) — an animation, not a transition, since transitions
     can't span a display:none gap but animations replay every time an
     element re-enters the render tree. */
  @keyframes pv-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  /* Tabs */
  .pv-tab-label { display: inline-block; padding: 8px 14px; margin: 0 4px 6px 0; border: 1px solid #99f6e4; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; color: #0f766e; background: #fff; transition: background-color .2s ease, color .2s ease, border-color .2s ease, transform .15s ease; }
  .pv-tab-label:hover { transform: translateY(-1px); }
  .pv-tab-panel { background: #fff; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px 16px; }

  /* Knowledge check */
  .pv-kc-option { display: block; padding: 10px 14px; background: #fff; border: 1px solid #99f6e4; border-radius: 8px; cursor: pointer; font-size: 14px; color: #171527; transition: background-color .2s ease, border-color .2s ease, transform .15s ease; }
  .pv-kc-option:hover { transform: translateX(2px); }

  /* Accordion / Timeline / Process — animated expand/collapse via checkbox +
     max-height transition (native <details> can't animate height at all
     without JS). */
  .pv-lesson .pv-expand-item { background: #fff; border: 1px solid #99f6e4; border-radius: 10px; margin-bottom: 10px; overflow: hidden; transition: box-shadow .25s ease, border-color .25s ease; }
  .pv-lesson .pv-expand-item:hover { box-shadow: 0 4px 16px rgba(15,118,110,0.12); border-color: #5eead4; }
  .pv-expand-toggle { position: absolute; opacity: 0; pointer-events: none; }
  .pv-expand-summary { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 13px 16px; font-weight: 600; color: #171527; user-select: none; }
  .pv-expand-summary-text { flex: 1; }
  .pv-expand-chevron { display: inline-flex; font-size: 11px; color: #0d9488; transition: transform .3s cubic-bezier(.4,0,.2,1); flex-shrink: 0; }
  .pv-expand-toggle:checked ~ .pv-expand-summary .pv-expand-chevron { transform: rotate(90deg); }
  .pv-expand-body { max-height: 0; overflow: hidden; transition: max-height .4s cubic-bezier(.4,0,.2,1); }
  .pv-expand-toggle:checked ~ .pv-expand-body { max-height: 1000px; }
  .pv-expand-body-inner { padding: 0 16px 15px 16px; color: #403d57; opacity: 0; transform: translateY(-4px); transition: opacity .3s ease, transform .3s ease; }
  .pv-expand-toggle:checked ~ .pv-expand-body .pv-expand-body-inner { opacity: 1; transform: translateY(0); transition-delay: .05s; }
  .pv-timeline-date { flex-shrink: 0; font-size: 12px; font-weight: 700; color: #0f766e; background: #f0fdfa; padding: 3px 9px; border-radius: 20px; }
  .pv-process-badge { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }

  /* Flashcards — real 3D flip card, front/back as two faces of one card. */
  .pv-flip-grid { display: grid; gap: 12px; }
  .pv-flip-card { perspective: 1200px; }
  .pv-flip-toggle { position: absolute; opacity: 0; pointer-events: none; }
  .pv-flip-card-inner { position: relative; display: block; min-height: 96px; cursor: pointer; transition: transform .6s cubic-bezier(.4,0,.2,1); transform-style: preserve-3d; }
  .pv-flip-toggle:checked ~ .pv-flip-card-inner { transform: rotateY(180deg); }
  .pv-flip-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 10px; border: 1px solid #99f6e4; padding: 16px 18px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 8px; overflow-y: auto; }
  .pv-flip-front { background: #fff; font-weight: 600; color: #171527; }
  .pv-flip-back { transform: rotateY(180deg); color: #403d57; background: #f0fdfa; }
  .pv-flip-hint { font-size: 11px; font-weight: 500; color: #0d9488; text-transform: uppercase; letter-spacing: .04em; }
  .pv-flip-card:hover .pv-flip-card-inner { box-shadow: 0 6px 18px rgba(15,118,110,0.15); }

  /* Sorting / matching */
  .pv-sort-hint { font-style: italic; color: #0f766e; margin: 0 0 10px; font-size: 13px; }
  .pv-sort-bank { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; min-height: 20px; }
  .pv-sort-item { display: inline-flex; align-items: center; padding: 8px 14px; border: 1px solid #99f6e4; border-radius: 20px; background: #fff; cursor: grab; font-size: 13px; color: #171527; font-family: inherit; transition: transform .18s ease, box-shadow .18s ease, background-color .25s ease, border-color .25s ease, color .25s ease, opacity .2s ease; }
  .pv-sort-item:hover:not([data-locked]) { box-shadow: 0 3px 10px rgba(15,118,110,0.18); transform: translateY(-1px); }
  .pv-sort-item:active:not([data-locked]) { cursor: grabbing; }
  .pv-sort-item.pv-sort-selected { background: #171527; color: #fff; border-color: #171527; box-shadow: 0 4px 14px rgba(23,21,39,0.25); }
  .pv-sort-item.pv-sort-dragging { opacity: .35; }
  .pv-sort-item.pv-sort-correct { background: #dcfce7; border-color: #22c55e; color: #166534; }
  .pv-sort-item.pv-sort-incorrect { background: #fee2e2; border-color: #ef4444; color: #991b1b; }
  .pv-sort-item.pv-sort-unplaced { background: #fef9c3; border-color: #eab308; color: #854d0e; }
  .pv-sort-categories { display: flex; gap: 12px; flex-wrap: wrap; }
  .pv-sort-category { flex: 1; min-width: 160px; border: 2px dashed #5eead4; border-radius: 10px; padding: 12px; min-height: 64px; background: #fff; transition: border-color .2s ease, background-color .2s ease; }
  .pv-sort-category.pv-sort-dragover { border-color: #0d9488; background: #f0fdfa; border-style: solid; }
  .pv-sort-category-title { font-weight: 600; margin: 0 0 8px; font-size: 13px; color: #0f766e; }
  .pv-sort-check-btn { padding: 8px 16px; border-radius: 8px; background: #171527; color: #fff; font-weight: 600; font-size: 13px; border: none; cursor: pointer; transition: background-color .2s ease, transform .15s ease; }
  .pv-sort-check-btn:hover { background: #2d2b43; transform: translateY(-1px); }
  .pv-sort-reset-btn { padding: 8px 16px; border-radius: 8px; background: #fff; border: 1px solid #99f6e4; font-weight: 600; font-size: 13px; cursor: pointer; color: #171527; transition: background-color .2s ease; }
  .pv-sort-reset-btn:hover { background: #f0fdfa; }
  @keyframes pv-sort-pop { 0% { transform: scale(.9); } 55% { transform: scale(1.06); } 100% { transform: scale(1); } }
  .pv-sort-item.pv-sort-pop { animation: pv-sort-pop .3s cubic-bezier(.34,1.56,.64,1); }
  @keyframes pv-sort-shake { 10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(2px); } 30%, 50%, 70% { transform: translateX(-4px); } 40%, 60% { transform: translateX(4px); } }
  .pv-sort-item.pv-sort-shake { animation: pv-sort-shake .4s ease; }

  @media (prefers-reduced-motion: reduce) {
    .pv-lesson * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
  }
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

// Checkbox + max-height CSS transition, not native <details> — <details>
// can't animate its open/close height at all without JS (or bleeding-edge
// CSS few browsers support), so it always snaps instantly. This animates
// smoothly with zero JS, works identically whether content_body is rendered
// via dangerouslySetInnerHTML or a real iframe srcDoc document (see
// SORT_ENHANCER_SCRIPT's note on why the latter can't rely on JS added
// here). Shared by accordion/timeline/process — one consistent expand
// animation across all three instead of three ad hoc treatments.
function expandableItem(opts: { summaryHtml: string; bodyHtml: string; leadingHtml?: string; openByDefault?: boolean }): string {
  const { summaryHtml, bodyHtml, leadingHtml, openByDefault } = opts;
  const uid = nextUid("exp");
  return `<div class="pv-expand-item">
    <input type="checkbox" id="${uid}" class="pv-expand-toggle" ${openByDefault ? "checked" : ""}>
    <label for="${uid}" class="pv-expand-summary">
      ${leadingHtml ?? ""}
      <span class="pv-expand-summary-text">${summaryHtml}</span>
      <span class="pv-expand-chevron">&#9656;</span>
    </label>
    <div class="pv-expand-body"><div class="pv-expand-body-inner">${bodyHtml}</div></div>
  </div>`;
}

// Real CSS 3D flip cards (perspective + rotateY), matching Rise's own
// flip-to-reveal flashcard interaction far more closely than a plain
// expand/collapse would — front and back are two faces of one card that
// physically turns over, not text that appears below a summary line.
function renderFlashcards(item: any, flags: string[]): string {
  const cards = (item.items ?? [])
    .map((c: any) => {
      const front = unwrapParagraph(ensureBlockHtml(c.front?.description));
      const back = unwrapParagraph(ensureBlockHtml(c.back?.description));
      const uid = nextUid("flip");
      return `<div class="pv-flip-card">
        <input type="checkbox" id="${uid}" class="pv-flip-toggle">
        <label for="${uid}" class="pv-flip-card-inner">
          <div class="pv-flip-face pv-flip-front"><span>${front}</span><span class="pv-flip-hint">Tap to flip</span></div>
          <div class="pv-flip-face pv-flip-back"><span>${back}</span></div>
        </label>
      </div>`;
    })
    .join("");
  if (!cards) return "";
  flags.push("a flashcard set was converted to flip cards");
  return checkpointCard("Flashcards", `<div class="pv-flip-grid">${cards}</div>`);
}

// Same animated expand/collapse as timeline/process below.
function renderAccordion(item: any, flags: string[]): string {
  const entries = (item.items ?? [])
    .map((e: any) => expandableItem({ summaryHtml: e.title ?? "", bodyHtml: ensureBlockHtml(e.description) }))
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
      `<label for="${groupId}-${i}" class="pv-tab-label">${e.title ?? ""}</label>`)
    .join("");

  const panels = entries
    .map((e: any, i: number) =>
      `<div data-tab-panel="${i}" class="pv-tab-panel" style="display:none;">${ensureBlockHtml(e.description)}</div>`)
    .join("");

  // !important is required here: each panel's own `display:none` is an
  // inline style attribute, which always wins over a plain embedded
  // stylesheet rule regardless of selector specificity — without it this
  // rule matches (the radio really does get checked) but never shows anything.
  // The panel's `animation` (not `transition`) is what makes the fade-in
  // replay every time it flips to display:block — CSS animations restart
  // whenever an element re-enters the render tree, unlike transitions,
  // which only fire on a property *change* and can't span a display:none gap.
  const rules = entries
    .map((_e: any, i: number) => `#${groupId}-${i}:checked ~ .pv-tab-panels [data-tab-panel="${i}"]{display:block !important;animation:pv-fade-in .35s cubic-bezier(.4,0,.2,1);}
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

// Same animated expand/collapse as accordion, with the date as a small
// leading badge in the summary line rather than a plain-text column.
function renderTimeline(item: any, flags: string[]): string {
  const entries: any[] = item.items ?? [];
  const rows = entries
    .map((e: any) => expandableItem({
      leadingHtml: e.date ? `<span class="pv-timeline-date">${e.date}</span>` : "",
      summaryHtml: e.title ?? "",
      bodyHtml: ensureBlockHtml(e.description),
    }))
    .join("");
  if (!rows) return "";
  flags.push("a timeline was converted to an expandable sequence");
  return checkpointCard("Timeline", `<div>${rows}</div>`);
}

// Numbered step sequence, same animated expand/collapse as accordion/
// timeline; intro/summary items are styled distinctly and expanded by
// default since they're framing content, not the steps themselves.
function renderProcess(item: any, flags: string[]): string {
  const entries: any[] = item.items ?? [];
  let stepNum = 0;
  const rows = entries
    .map((e: any) => {
      const isStep = e.type === "step";
      const badge = isStep ? String(++stepNum) : e.type === "intro" ? "→" : "✓";
      return expandableItem({
        leadingHtml: `<span class="pv-process-badge" style="background:${isStep ? "#171527" : "#0f766e"};">${badge}</span>`,
        summaryHtml: e.title ?? "",
        bodyHtml: ensureBlockHtml(e.description),
        openByDefault: !isStep,
      });
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
var dragged = null;
function clearSel(){ if (selected) selected.classList.remove('pv-sort-selected'); selected = null; }
function pop(item){
  item.classList.add('pv-sort-pop');
  item.addEventListener('animationend', function(){ item.classList.remove('pv-sort-pop'); }, { once: true });
}
function place(item, target){ target.appendChild(item); item.classList.remove('pv-sort-selected'); pop(item); }
ex.addEventListener('click', function(e){
  var item = e.target.closest('[data-sort-item]');
  if (item && ex.contains(item) && !item.dataset.locked) {
    if (selected === item) { clearSel(); } else { clearSel(); selected = item; item.classList.add('pv-sort-selected'); }
    return;
  }
  var cat = e.target.closest('[data-sort-category]');
  if (cat && selected) { place(selected, cat); clearSel(); return; }
  if (e.target.closest('[data-sort-bank]') && selected) { place(selected, bank); clearSel(); }
});
// Drag-and-drop — progressive enhancement alongside the click-to-select flow
// above (kept for touch/accessibility); both work on the same items.
ex.addEventListener('dragstart', function(e){
  var item = e.target.closest && e.target.closest('[data-sort-item]');
  if (!item || item.dataset.locked) { e.preventDefault(); return; }
  dragged = item;
  clearSel();
  item.classList.add('pv-sort-dragging');
  if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); }
});
ex.addEventListener('dragend', function(){
  if (dragged) dragged.classList.remove('pv-sort-dragging');
  dragged = null;
  ex.querySelectorAll('.pv-sort-dragover').forEach(function(el){ el.classList.remove('pv-sort-dragover'); });
});
ex.addEventListener('dragover', function(e){
  var zone = e.target.closest && e.target.closest('[data-sort-category], [data-sort-bank]');
  if (!zone || !dragged) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  zone.classList.add('pv-sort-dragover');
});
ex.addEventListener('dragleave', function(e){
  var zone = e.target.closest && e.target.closest('[data-sort-category], [data-sort-bank]');
  if (zone) zone.classList.remove('pv-sort-dragover');
});
ex.addEventListener('drop', function(e){
  var zone = e.target.closest && e.target.closest('[data-sort-category], [data-sort-bank]');
  if (!zone || !dragged) return;
  e.preventDefault();
  zone.classList.remove('pv-sort-dragover');
  place(dragged, zone);
});
checkBtn.addEventListener('click', function(){
  ex.querySelectorAll('[data-sort-item]').forEach(function(item){
    var cat = item.closest('[data-sort-category]');
    var correct = cat && cat.getAttribute('data-category-id') === item.getAttribute('data-correct-category');
    item.dataset.locked = 'true';
    item.style.pointerEvents = 'none';
    item.draggable = false;
    item.classList.remove('pv-sort-selected');
    if (cat) {
      item.classList.add(correct ? 'pv-sort-correct' : 'pv-sort-incorrect');
      if (!correct) {
        item.classList.add('pv-sort-shake');
        item.addEventListener('animationend', function(){ item.classList.remove('pv-sort-shake'); }, { once: true });
      }
    } else {
      item.classList.add('pv-sort-unplaced');
    }
  });
  clearSel();
  checkBtn.style.display = 'none';
  resetBtn.hidden = false;
});
resetBtn.addEventListener('click', function(){
  ex.querySelectorAll('[data-sort-item]').forEach(function(item){
    delete item.dataset.locked;
    item.style.pointerEvents = '';
    item.draggable = true;
    item.classList.remove('pv-sort-correct', 'pv-sort-incorrect', 'pv-sort-unplaced');
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
      `<button type="button" class="pv-sort-item" draggable="true" data-sort-item data-correct-category="${i.pileId}">${i.title}</button>`)
    .join("");

  const categories = piles
    .map((p: any) =>
      `<div class="pv-sort-category" data-sort-category data-category-id="${p.id}">
        <p class="pv-sort-category-title">${p.title}</p>
      </div>`)
    .join("");

  flags.push("a sorting exercise was converted to a click-to-categorize or drag-and-drop activity — ungraded, not tied to lesson completion");

  return checkpointCard("Sort the items", `<div data-sort-exercise>
    <p class="pv-sort-hint">Drag an item into its category, or tap an item then tap the category.</p>
    <div class="pv-sort-bank" data-sort-bank>${bankItems}</div>
    <div class="pv-sort-categories">${categories}</div>
    <div style="margin-top:14px;display:flex;gap:8px;">
      <button type="button" data-sort-check class="pv-sort-check-btn">Check Answers</button>
      <button type="button" data-sort-reset hidden class="pv-sort-reset-btn">Reset</button>
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
      `<label for="${groupId}-${i}" class="pv-kc-option">${a.title}</label>`)
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
  // selector — see the identical note in renderTabs. The fade-in animation
  // (not a transition) replays each time an option is (re)selected, for the
  // same reason noted there.
  const rules = answers
    .map((_a: any, i: number) => `#${groupId}-${i}:checked ~ .pv-kc-options label[for="${groupId}-${i}"]{border-color:#171527;background:#f0fdfa;}
#${groupId}-${i}:checked ~ .pv-kc-feedback [data-feedback="${i}"]{display:block !important;animation:pv-fade-in .3s cubic-bezier(.4,0,.2,1);}`)
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
// Rise's own uploaded-video block (`type: "multimedia"`, `variant: "video"`)
// — distinct from `renderVideoBlock` below, which handles the manually-added
// PAII video block (a plain external URL). Here the video itself is a file
// inside the export's assets/ folder (`media.customVideo.src`), so it needs
// the same look-up-and-upload treatment as `renderImageItem`; the poster
// frame (`media.customVideo.poster`) gets the same treatment if present.
async function renderMultimediaItem(
  item: any,
  assets: Map<string, Buffer>,
  uploadBuffer: (buffer: Buffer, keySuffix: string, contentType: string) => Promise<string>,
  flags: string[],
): Promise<{ html: string; uploaded: boolean }> {
  const inner = item.items?.[0];
  const videoSrc: string | undefined = inner?.media?.customVideo?.src;
  if (!videoSrc) return { html: "", uploaded: false };

  const videoBuffer = assets.get(videoSrc);
  if (!videoBuffer) {
    flags.push(`video "${videoSrc}" referenced but not found in the export`);
    return { html: "", uploaded: false };
  }
  const videoUrl = await uploadBuffer(videoBuffer, videoSrc, guessGeneralContentType(videoSrc));

  const posterSrc: string | undefined = inner.media.customVideo.poster;
  const posterBuffer = posterSrc ? assets.get(posterSrc) : undefined;
  const posterUrl = posterBuffer ? await uploadBuffer(posterBuffer, posterSrc!, guessGeneralContentType(posterSrc!)) : null;

  const caption = ensureBlockHtml(inner.caption);

  return {
    html: `<div style="margin:32px auto;max-width:900px;">
      <div style="position:relative;padding-bottom:56.25%;height:0;border-radius:12px;overflow:hidden;background:#000;">
        <video src="${videoUrl}"${posterUrl ? ` poster="${posterUrl}"` : ""} controls style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;"></video>
      </div>
      ${caption ? `<div style="text-align:center;font-size:13px;color:#64748b;margin:10px 0 0;">${caption}</div>` : ""}
    </div>`,
    uploaded: true,
  };
}

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
      case "multimedia": {
        try {
          const { html, uploaded } = await renderMultimediaItem(item, assets, uploadBuffer, flags);
          if (uploaded) imagesUploaded++;
          htmlParts.push(html);
        } catch (err: any) {
          flags.push(`a video failed to upload (${err?.message ?? "unknown error"}) and was skipped`);
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
