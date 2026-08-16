/**
 * Shared logic for importing the official Python tutorial
 * (docs.python.org/3/tutorial) — classic Sphinx docs theme. Real
 * content lives in `div.body[role="main"]`; each chapter page is
 * self-contained (no aggregation needed). PSF License 2.0 (BSD-style,
 * permissive, covers both software and documentation) — confirmed via
 * docs.python.org/3/license.html.
 */

import * as cheerio from "cheerio";
import TurndownService = require("turndown");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gfm } = require("turndown-plugin-gfm");

const BASE = "https://docs.python.org";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndown.use(gfm);

function resolveRelative(html: string): string {
  return html.replace(/((?:src|href)=")(\/[^"]*)(")/g, (_m, p1, path, p3) => `${p1}${BASE}${path}${p3}`);
}

export async function fetchPythonDocsMarkdown(path: string): Promise<string | null> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  const body = $('div.body[role="main"]').first();
  if (!body.length) return null;

  body.find("a.headerlink").remove();
  body.find("script, style").remove();

  const bodyHtml = resolveRelative(body.html() || "");
  const md = turndown.turndown(bodyHtml);
  return md.trim();
}
