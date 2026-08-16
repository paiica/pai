/**
 * Shared logic for importing Google Developers documentation-site courses
 * (developers.google.com/machine-learning) — a fundamentally different
 * source shape from every GitHub course imported this session: no git
 * repo, no raw markdown files, just rendered HTML pages behind a devsite
 * template. Confirmed directly (not assumed):
 * - The site auto-serves a non-English locale based on request headers;
 *   every fetch MUST append `?hl=en` or content comes back in the wrong
 *   language.
 * - Real lesson content lives in `.devsite-article-body`; the left-nav
 *   sidebar (`ul.devsite-nav-list[menu="_book"]`) is effectively this
 *   site's "toctree" — a full ordered map of unit groupings -> units ->
 *   sub-pages, with duration estimates, extractable via regex on the raw
 *   nav HTML.
 * - Content is licensed CC BY 4.0 (text) / Apache 2.0 (code) — genuinely
 *   permissive, unlike most GitHub finds this session. Confirmed via the
 *   page's own footer text.
 * - "Test your knowledge" quiz pages and "Interactive exercise" pages do
 *   NOT contain their actual quiz/exercise content in static HTML — they
 *   render a JS widget or link out to a separate quiz app. Not
 *   extractable without real browser automation, so this importer
 *   deliberately skips them (core teaching content only).
 */

import * as cheerio from "cheerio";
import TurndownService = require("turndown");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gfm } = require("turndown-plugin-gfm");
import { marked } from "marked";

const BASE = "https://developers.google.com";

export interface NavPage { title: string; href: string; minutes: number }
export interface NavUnit { title: string; minutes: number; pages: NavPage[] }
export interface NavGroup { heading: string; units: NavUnit[] }

// Sub-page slugs that are navigation to non-content widgets (quizzes,
// interactive exercises, programming exercises that just link to Colab,
// and the "what's next" anchor duplicate of the last real page).
const SKIP_SLUG_RE = /test-your-knowledge|interactive-exercise|programming-exercise|feature-cross-exercises|parameters-exercise|gradient-descent-exercise|#whats_next$/i;

// Parses the left-nav sidebar HTML (the "menu=_book" nav list) into a
// structured map of groupings -> units -> content sub-pages. `navHtml`
// should be the raw HTML of one fetched course page (any page has the
// full nav embedded).
export function parseDevsiteNav(navHtml: string): NavGroup[] {
  const bookNavMatch = navHtml.match(/<ul class="devsite-nav-list" menu="_book">([\s\S]*?)<\/ul>\s*<\/div>\s*<\/div>\s*<\/nav>/);
  const section = bookNavMatch ? bookNavMatch[1] : navHtml;
  const $ = cheerio.load(`<ul>${section}</ul>`);

  const groups: NavGroup[] = [];
  let currentGroup: NavGroup | null = null;
  let currentUnit: NavUnit | null = null;

  $("body > ul > li").each((_, li) => {
    const $li = $(li);
    if ($li.hasClass("devsite-nav-heading")) {
      const heading = $li.find(".devsite-nav-text").first().text().trim();
      if (heading && heading !== "Quick links") {
        currentGroup = { heading, units: [] };
        groups.push(currentGroup);
      } else {
        currentGroup = null;
      }
      return;
    }
    if ($li.hasClass("devsite-nav-expandable") && currentGroup) {
      const titleText = $li.find("> div.devsite-expandable-nav > div.devsite-nav-title .devsite-nav-text").first().text().trim();
      const m = titleText.match(/^(.+?)\s*\((\d+)\s*min\)$/);
      currentUnit = { title: m ? m[1].trim() : titleText, minutes: m ? Number(m[2]) : 0, pages: [] };
      currentGroup.units.push(currentUnit);
      $li.find("ul.devsite-nav-section > li a").each((_, a) => {
        const $a = $(a);
        const href = $a.attr("href") || "";
        const text = $a.find(".devsite-nav-text").text().trim();
        if (SKIP_SLUG_RE.test(href) || SKIP_SLUG_RE.test(text)) return;
        const pm = text.match(/^(.+?)\s*\((\d+)\s*mins?\)$/);
        currentUnit!.pages.push({ title: pm ? pm[1].trim() : text, href, minutes: pm ? Number(pm[2]) : 0 });
      });
    }
  });
  return groups.filter((g) => g.units.length);
}

// Some courses (e.g. decision-forests) have top-level devsite-nav-expandable
// items with real sub-pages but NO enclosing devsite-nav-heading grouping —
// parseDevsiteNav's group-first logic drops these entirely (currentGroup
// stays null). This parses that shape directly: each top-level expandable
// becomes one NavUnit (a module), its sub-pages become lessons (1:1, not
// aggregated like the grouped-course pattern).
export function parseDevsiteExpandableUnits(navHtml: string): NavUnit[] {
  const bookNavMatch = navHtml.match(/<ul class="devsite-nav-list" menu="_book">([\s\S]*?)<\/ul>\s*<\/div>\s*<\/div>\s*<\/nav>/);
  const section = bookNavMatch ? bookNavMatch[1] : navHtml;
  const $ = cheerio.load(`<ul>${section}</ul>`);

  const units: NavUnit[] = [];
  $("body > ul > li.devsite-nav-expandable").each((_, li) => {
    const $li = $(li);
    const titleText = $li.find("> div.devsite-expandable-nav > div.devsite-nav-title .devsite-nav-text").first().text().trim();
    if (!titleText) return;
    const unit: NavUnit = { title: titleText, minutes: 0, pages: [] };
    $li.find("> div.devsite-expandable-nav > ul.devsite-nav-section > li a").each((_, a) => {
      const $a = $(a);
      const href = $a.attr("href") || "";
      const text = $a.find(".devsite-nav-text").text().trim();
      if (SKIP_SLUG_RE.test(href) || SKIP_SLUG_RE.test(text)) return;
      unit.pages.push({ title: text, href, minutes: 0 });
    });
    if (unit.pages.length) units.push(unit);
  });
  return units;
}

// Flat courses (e.g. clustering, gan) have no devsite-nav-expandable at
// all — just direct devsite-nav-item links under the book nav. Returns
// them in document order.
export function parseDevsiteFlatPages(navHtml: string, pathPrefix: string): NavPage[] {
  const bookNavMatch = navHtml.match(/<ul class="devsite-nav-list" menu="_book">([\s\S]*?)<\/ul>\s*<\/div>\s*<\/div>\s*<\/nav>/);
  const section = bookNavMatch ? bookNavMatch[1] : navHtml;
  const $ = cheerio.load(`<ul>${section}</ul>`);

  const pages: NavPage[] = [];
  $("body > ul > li.devsite-nav-item > a.devsite-nav-title").each((_, a) => {
    const $a = $(a);
    const href = $a.attr("href") || "";
    const text = $a.find(".devsite-nav-text").text().trim();
    if (!href.startsWith(pathPrefix)) return;
    if (SKIP_SLUG_RE.test(href) || SKIP_SLUG_RE.test(text)) return;
    pages.push({ title: text, href, minutes: 0 });
  });
  return pages;
}

export async function fetchNavSourceHtml(anyPageUrl: string): Promise<string> {
  const res = await fetch(withEnLocale(anyPageUrl));
  return res.ok ? res.text() : "";
}

function withEnLocale(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}hl=en`;
}

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndown.use(gfm);

function resolveRelative(html: string): string {
  return html
    .replace(/((?:src|href)=")(\/[^"]*)(")/g, (_m, p1, path, p3) => `${p1}${BASE}${path}${p3}`);
}

// Fetches one content sub-page and returns its lesson body as markdown
// (via the same buildLessonBlocksFromReadme pipeline used for every other
// course this session — this function just gets the raw markdown text).
export async function fetchDevsitePageMarkdown(href: string): Promise<string | null> {
  const url = href.startsWith("http") ? href : `${BASE}${href}`;
  const res = await fetch(withEnLocale(url));
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  const article = $(".devsite-article-body").first();
  if (!article.length) return null;

  article.find("devsite-mathjax, devsite-engedu-telemetry, style, script").remove();
  article.find("aside.note.time, aside.note.badge, .open_quiz").remove();
  // AI-generated summary widget (data-tooltip="Generated with AI"), not
  // original curriculum text — exclude it.
  article.find("devsite-key-takeaways-panel").remove();
  article.find("p").each((_, el) => {
    if ($(el).text().includes("Except as otherwise noted")) $(el).remove();
  });
  // "What's next" trailer section links to the next page in sequence —
  // not real content, and duplicated as its own nav entry we already skip.
  const whatsNext = article.find("h2#whats_next");
  if (whatsNext.length) whatsNext.nextAll().addBack().remove();

  const bodyHtml = resolveRelative(article.html() || "");
  const md = turndown.turndown(bodyHtml);
  return md.trim();
}

export { marked };
