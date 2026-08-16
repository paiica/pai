/**
 * Shared logic for importing the official PostgreSQL tutorial
 * (postgresql.org/docs/current/tutorial*.html) — DocBook-generated
 * HTML (not Sphinx). Real content lives in a `.chapter` or `.sect1`
 * div inside `#docContent`, wrapped by a `.navheader` prev/up/next
 * table to strip. PostgreSQL License (BSD/MIT-style, permissive,
 * explicitly covers "this software and its documentation") —
 * confirmed via postgresql.org/about/licence.
 */

import * as cheerio from "cheerio";
import TurndownService = require("turndown");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gfm } = require("turndown-plugin-gfm");

const BASE = "https://www.postgresql.org/docs/current/";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndown.use(gfm);

function resolveRelative(html: string): string {
  return html
    .replace(/((?:src)=")(\/[^"]*)(")/g, (_m, p1, path, p3) => `${p1}https://www.postgresql.org${path}${p3}`)
    .replace(/((?:href)=")(tutorial-[^"#]*\.html)/g, (_m, p1, path) => `${p1}${BASE}${path}`);
}

export async function fetchPostgresDocsMarkdown(pageSlug: string): Promise<string | null> {
  const url = `${BASE}${pageSlug}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  const content = $("#docContent > div.chapter, #docContent > div.sect1").first();
  if (!content.length) return null;

  content.find(".navheader, .navfooter").remove();
  content.find("a.id_link, a.indexterm").remove();
  content.find("script, style").remove();
  // Nested "Table of Contents" list on chapter-index pages — not real content.
  content.find("> div.toc").remove();

  const bodyHtml = resolveRelative(content.html() || "");
  const md = turndown.turndown(bodyHtml);
  return md.trim();
}
