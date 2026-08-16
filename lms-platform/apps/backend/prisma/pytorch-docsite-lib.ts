/**
 * Shared logic for importing official PyTorch tutorials
 * (docs.pytorch.org/tutorials) — a Sphinx-Gallery generated docs site,
 * a different shape from Google's devsite (google-devsite-lib.ts):
 * - Real content lives in `article.bd-article`.
 * - Pages redirect from pytorch.org/tutorials/... to
 *   docs.pytorch.org/tutorials/... (301) — fetch the docs.pytorch.org
 *   host directly to avoid an extra hop.
 * - Each page carries Sphinx-Gallery boilerplate to strip: a top
 *   "Go to the end to download the full example code" admonition, a
 *   `||`-separated series-navigation paragraph
 *   (`.sphx-glr-example-title`), a "Created On / Last Updated / Last
 *   Verified" byline, and a bottom "Total running time of the script"
 *   + Jupyter/Python/zip download links (`.sphx-glr-timing`,
 *   `.sphx-glr-footer`) — none of which are real curriculum content.
 * - Licensed BSD-3-Clause (github.com/pytorch/tutorials) — permissive,
 *   commercial reuse allowed with attribution, no NonCommercial
 *   restriction. Confirmed via the repo's own LICENSE file.
 * - No book-nav sidebar scoped to one tutorial series; page lists for
 *   each series were hand-gathered from the site's own "next" mini-nav
 *   (the `.sphx-glr-example-title` paragraph itself lists every page in
 *   the series, in order).
 */

import * as cheerio from "cheerio";
import TurndownService = require("turndown");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gfm } = require("turndown-plugin-gfm");

const BASE = "https://docs.pytorch.org";

const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndown.use(gfm);

function resolveRelative(html: string): string {
  return html.replace(/((?:src|href)=")(\/[^"]*)(")/g, (_m, p1, path, p3) => `${p1}${BASE}${path}${p3}`);
}

export async function fetchPytorchTutorialMarkdown(path: string): Promise<string | null> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  const article = $("article.bd-article").first();
  if (!article.length) return null;

  article.find(".sphx-glr-download-link-note").remove();
  article.find("p.sphx-glr-example-title").remove();
  article.find("p.date-info-last-verified").remove();
  article.find("p.sphx-glr-timing").remove();
  article.find(".sphx-glr-footer").remove();
  article.find("a.headerlink").remove();
  article.find("script, style").remove();

  const bodyHtml = resolveRelative(article.html() || "");
  const md = turndown.turndown(bodyHtml);
  return md.trim();
}
