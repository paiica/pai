import { BadRequestException, Injectable } from "@nestjs/common";
import AdmZip = require("adm-zip");
import { v4 as uuidv4 } from "uuid";
import { XMLParser } from "fast-xml-parser";
import { UploadsService } from "../uploads/uploads.service";
import { ImportPlan, PlannedModule, PlannedQuestion, guessGeneralContentType, renderReviewQuestion, renderBlockItems, wrapLessonContent, buildCoverPageHtml } from "./rise-html-blocks";

const JSONP_PATTERN = /__jsonp\(\s*"runtime-data\.js"\s*,\s*"([^"]+)"\s*\)/;

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

// Runs inside the SCO's own document (injected before upload — see
// hostScormPackageAsStaticSite), so `window.API` lookups are same-document
// and work synchronously, as the SCORM 1.2 spec requires. Content is
// hosted cross-origin from the app (R2), so it can't reach into
// `window.parent.API` directly — this bridge instead reports outward via
// postMessage, which does cross origins, to a listener in the real
// player page that persists progress using the student's own session.
// No inbound resume support in v1 — LMSGetValue always returns "" for
// unset keys, a valid "no prior data" SCORM response, so every visit
// starts the SCO fresh (see plan: forward-tracking only).
const SCORM_BRIDGE_SCRIPT = `(function(){
  var cmi = { "cmi.core.lesson_status": "not attempted", "cmi.core.score.raw": "" };
  function post(eventName) {
    try { window.parent.postMessage({ type: "scorm-event", event: eventName, cmi: cmi }, "*"); } catch (e) {}
  }
  window.API = {
    LMSInitialize: function() { post("initialize"); return "true"; },
    LMSFinish: function() { post("finish"); return "true"; },
    LMSGetValue: function(key) { return Object.prototype.hasOwnProperty.call(cmi, key) ? cmi[key] : ""; },
    LMSSetValue: function(key, value) { cmi[key] = String(value); return "true"; },
    LMSCommit: function() { post("commit"); return "true"; },
    LMSGetLastError: function() { return "0"; },
    LMSGetErrorString: function() { return "No error"; },
    LMSGetDiagnostic: function() { return ""; }
  };
})();`;

function injectScormBridge(htmlBuffer: Buffer): Buffer {
  const html = htmlBuffer.toString("utf8");
  const bridge = `<script>${SCORM_BRIDGE_SCRIPT}</script>`;
  const injected = /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => `${m}\n${bridge}`)
    : `${bridge}\n${html}`;
  return Buffer.from(injected, "utf8");
}

// Mirrors locateContentRoot below, but for SCORM's imsmanifest.xml instead
// of Rise's runtime-data.js.
function locateManifestRoot(entries: AdmZip.IZipEntry[]): { manifestEntry: AdmZip.IZipEntry; contentRoot: string } {
  const manifestEntry = entries.find((e) => !e.isDirectory && normalizedEntryName(e).toLowerCase().endsWith("imsmanifest.xml"));
  if (!manifestEntry) {
    throw new BadRequestException(
      "Couldn't find imsmanifest.xml in this archive — this import mode only supports SCORM packages",
    );
  }
  const manifestName = normalizedEntryName(manifestEntry);
  const contentRoot = manifestName.slice(0, manifestName.length - "imsmanifest.xml".length);
  return { manifestEntry, contentRoot };
}

// The ZIP spec uses `/`, but some Windows zip tools (e.g. PowerShell's
// Compress-Archive) write `\` instead — normalize at lookup time rather
// than mutating the entry (its internal state may be tied to the raw name).
function normalizedEntryName(e: AdmZip.IZipEntry): string {
  return e.entryName.replace(/\\/g, "/");
}

// Both parseRiseExport and hostRiseExportAsStaticSite need to find where the
// actual course root sits inside the zip (it's not always at the archive
// root — see the Compress-Archive vs. real Rise export difference tested
// earlier) by locating runtime-data.js and taking its parent directory.
function locateContentRoot(entries: AdmZip.IZipEntry[]): { runtimeEntry: AdmZip.IZipEntry; contentRoot: string } {
  const runtimeEntry = entries.find((e) => !e.isDirectory && normalizedEntryName(e).endsWith("runtime-data.js"));
  if (!runtimeEntry) {
    throw new BadRequestException(
      "Couldn't find runtime-data.js in this archive — this importer only supports Articulate Rise 360 web exports",
    );
  }
  const runtimeName = normalizedEntryName(runtimeEntry);
  const contentRoot = runtimeName.slice(0, runtimeName.length - "runtime-data.js".length);
  return { runtimeEntry, contentRoot };
}

@Injectable()
export class ContentImportService {
  constructor(private uploadsService: UploadsService) {}

  // Unzips an Articulate Rise 360 web export in memory and pulls the real
  // course JSON out of runtime-data.js, which ships as
  // `__jsonp("runtime-data.js", "<base64-encoded-json>")`. Also indexes every
  // file under an `assets/` folder by filename, since that's how image
  // blocks reference them (`media.image.key`).
  parseRiseExport(zipBuffer: Buffer): { course: any; assets: Map<string, Buffer> } {
    const zip = this.openZip(zipBuffer);
    const entries = zip.getEntries();
    const { runtimeEntry, contentRoot } = locateContentRoot(entries);

    const runtimeJs = runtimeEntry.getData().toString("utf8");
    const match = runtimeJs.match(JSONP_PATTERN);
    if (!match) {
      throw new BadRequestException("runtime-data.js was found but didn't match the expected Rise export format");
    }

    let course: any;
    try {
      const json = Buffer.from(match[1], "base64").toString("utf8");
      // The decoded payload is `{ course: {...}, labelSet, settings, ... }` —
      // only the `course` key holds the lesson tree we care about.
      course = JSON.parse(json).course;
    } catch {
      throw new BadRequestException("Failed to decode the course data inside runtime-data.js");
    }
    if (!course || !Array.isArray(course.lessons)) {
      throw new BadRequestException("runtime-data.js didn't contain the expected course.lessons structure");
    }

    const assets = new Map<string, Buffer>();
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = normalizedEntryName(entry);
      if (!name.startsWith(`${contentRoot}assets/`)) continue;
      const filename = name.slice(`${contentRoot}assets/`.length);
      if (!filename || filename.includes("/")) continue;
      assets.set(filename, entry.getData());
    }

    return { course, assets };
  }

  private openZip(zipBuffer: Buffer): AdmZip {
    try {
      return new AdmZip(zipBuffer);
    } catch {
      throw new BadRequestException("That file isn't a valid .zip archive");
    }
  }

  // "Preserve Original Design" mode — instead of parsing the course into
  // blocks and reconstructing them in PAII's own styling, re-hosts the
  // export's files byte-for-byte under one shared key prefix (preserving
  // their relative layout) and returns the public URL to its index.html.
  // Works because index.html only ever references its own assets by
  // relative path ("lib/dist/xxx.js", and runtime-data.js the same way at
  // runtime) — so once every file lands at the same relative position
  // under a new prefix, the exported course renders pixel-identical to the
  // original, fully interactive, with no reimplementation of Rise's own
  // interactive blocks needed.
  async hostRiseExportAsStaticSite(zipBuffer: Buffer): Promise<{ indexUrl: string; fileCount: number }> {
    const zip = this.openZip(zipBuffer);
    const entries = zip.getEntries();
    const { contentRoot } = locateContentRoot(entries);

    const prefix = `rise-sites/${uuidv4()}/`;
    let indexUrl = "";
    let fileCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = normalizedEntryName(entry);
      if (!name.startsWith(contentRoot)) continue;
      const relativePath = name.slice(contentRoot.length);
      if (!relativePath) continue;

      const key = `${prefix}${relativePath}`;
      const url = await this.uploadsService.uploadBufferAtExactKey(
        entry.getData(),
        key,
        guessGeneralContentType(relativePath),
      );
      fileCount++;
      if (relativePath === "index.html") indexUrl = url;
    }

    if (!indexUrl) {
      throw new BadRequestException("Couldn't find index.html at the root of this export");
    }
    return { indexUrl, fileCount };
  }

  // SCORM import — parses imsmanifest.xml to find the course title and the
  // first organization item's launch file. Unlike Rise, a generic SCORM
  // package has no discoverable content schema to decompose into native
  // blocks, so preserve-and-track (host + inject the API bridge) is the
  // only mode. Single-SCO only for v1 — see plan for the multi-SCO/
  // sequencing scope this deliberately leaves out.
  parseScormManifest(zipBuffer: Buffer): { title: string; launchHref: string; contentRoot: string } {
    const zip = this.openZip(zipBuffer);
    const entries = zip.getEntries();
    const { manifestEntry, contentRoot } = locateManifestRoot(entries);

    const xml = manifestEntry.getData().toString("utf8");
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    let doc: any;
    try {
      doc = parser.parse(xml);
    } catch {
      throw new BadRequestException("Failed to parse imsmanifest.xml — the file may be corrupted");
    }

    const manifest = doc?.manifest;
    if (!manifest) {
      throw new BadRequestException("imsmanifest.xml didn't contain a <manifest> root element");
    }

    const organizations = asArray(manifest.organizations?.organization);
    const defaultOrgId = manifest.organizations?.["@_default"];
    const org = organizations.find((o: any) => o["@_identifier"] === defaultOrgId) ?? organizations[0];
    if (!org) {
      throw new BadRequestException("imsmanifest.xml has no <organization> to import");
    }
    const rawTitle = typeof org.title === "string" ? org.title : org.title?.["#text"];
    const title = rawTitle || "Imported SCORM Course";

    const items = asArray(org.item);
    const firstItem = items[0];
    if (!firstItem) {
      throw new BadRequestException("imsmanifest.xml's organization has no <item> to import");
    }
    const resourceRef = firstItem["@_identifierref"];

    const resources = asArray(manifest.resources?.resource);
    const resource = resources.find((r: any) => r["@_identifier"] === resourceRef);
    const href = resource?.["@_href"];
    if (!href) {
      throw new BadRequestException("Couldn't find the launch file referenced by this package's first item");
    }

    return { title, launchHref: href, contentRoot };
  }

  // Same re-host-byte-for-byte technique as hostRiseExportAsStaticSite,
  // except the one file matching launchHref gets the SCORM API bridge
  // spliced into its <head> before upload (see injectScormBridge) so the
  // SCO can find window.API when it boots.
  async hostScormPackageAsStaticSite(
    zipBuffer: Buffer, contentRoot: string, launchHref: string,
  ): Promise<{ launchUrl: string; fileCount: number }> {
    const zip = this.openZip(zipBuffer);
    const entries = zip.getEntries();

    const prefix = `scorm-sites/${uuidv4()}/`;
    let launchUrl = "";
    let fileCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = normalizedEntryName(entry);
      if (!name.startsWith(contentRoot)) continue;
      const relativePath = name.slice(contentRoot.length);
      if (!relativePath) continue;

      const isLaunchFile = relativePath === launchHref;
      const buffer = isLaunchFile ? injectScormBridge(entry.getData()) : entry.getData();

      const key = `${prefix}${relativePath}`;
      const url = await this.uploadsService.uploadBufferAtExactKey(buffer, key, guessGeneralContentType(relativePath));
      fileCount++;
      if (isLaunchFile) launchUrl = url;
    }

    if (!launchUrl) {
      throw new BadRequestException(`Couldn't find the launch file "${launchHref}" inside the package`);
    }
    return { launchUrl, fileCount };
  }

  // One Module + one Lesson pointing at the hosted, bridge-injected SCO —
  // no quiz extraction (nothing Rise-shaped to parse out of a generic
  // SCORM package); progress instead reports back live via the bridge's
  // postMessage events as the student works through it.
  buildScormPlan(title: string, launchUrl: string): ImportPlan {
    const flagged: string[] = [
      "This lesson hosts a single SCORM SCO exactly as authored — multi-SCO packages and sequencing rules aren't supported yet, only the first item is imported. Completion and score report back automatically as the student works through it, but resuming mid-course (bookmark/suspend data) isn't supported yet — each visit starts the SCO fresh.",
    ];
    const modules: PlannedModule[] = [{
      title,
      lessons: [{ title, type: "html", external_url: launchUrl }],
    }];
    return { modules, flagged, images_uploaded: 0 };
  }

  // Walks the Rise lesson/item tree and produces a normalized plan of
  // Modules/Lessons/Questions, uploading any referenced images to S3 along
  // the way. Nothing here talks to the database — see PrepCoursesService /
  // CoursesService for the surface-specific code that actually creates rows
  // from this plan.
  async buildImportPlan(course: any, assets: Map<string, Buffer>): Promise<ImportPlan> {
    const flagged: string[] = [];
    const modules: PlannedModule[] = [];
    let imagesUploaded = 0;

    const uploadBuffer = (buffer: Buffer, keySuffix: string, contentType: string) =>
      this.uploadsService.uploadBufferServerSide(buffer, keySuffix, contentType);

    const riseLessons: any[] = course?.lessons ?? [];

    const cover = await buildCoverPageHtml(course, assets, uploadBuffer);
    if (cover.html) {
      if (cover.imageUploaded) imagesUploaded++;
      modules.push({
        title: "Welcome",
        lessons: [{
          title: "Welcome",
          type: "html",
          content_html: wrapLessonContent(cover.html),
        }],
      });
    }

    for (const riseLesson of riseLessons) {
      if (riseLesson.type === "quiz") continue; // handled separately below
      if (riseLesson.type !== "blocks") {
        flagged.push(`Skipped lesson "${riseLesson.title}" — unrecognized Rise lesson type "${riseLesson.type}"`);
        continue;
      }

      const moduleFlags: string[] = [];
      const { html, imagesUploaded: uploadedHere } = await renderBlockItems(
        riseLesson.items ?? [], assets, uploadBuffer, moduleFlags,
      );
      imagesUploaded += uploadedHere;

      if (moduleFlags.length) {
        flagged.push(`Module "${riseLesson.title}": ${moduleFlags.join("; ")}`);
      }

      modules.push({
        title: riseLesson.title,
        lessons: [{
          title: riseLesson.title,
          type: "html",
          content_html: wrapLessonContent(html),
        }],
      });
    }

    const quizModule = this.buildQuizModule(riseLessons, flagged);
    if (quizModule) modules.push(quizModule);

    return { modules, flagged, images_uploaded: imagesUploaded };
  }

  // "Preserve Original Design" mode — skips block reconstruction entirely.
  // The whole course's content becomes one hosted, full-fidelity Rise
  // lesson (see hostRiseExportAsStaticSite); only the quiz still gets
  // extracted into real graded questions, since that's genuinely valuable
  // and unrelated to "design" — reused as-is from the decompose path above.
  buildOriginalDesignPlan(course: any, riseExportUrl: string): ImportPlan {
    const flagged: string[] = [];
    const modules: PlannedModule[] = [];
    const riseLessons: any[] = course?.lessons ?? [];

    const contentLessonCount = riseLessons.filter((l) => l.type === "blocks").length;
    modules.push({
      title: course?.title || "Course Content",
      lessons: [{
        title: course?.title || "Course Content",
        type: "html",
        external_url: riseExportUrl,
      }],
    });
    flagged.push(
      `This lesson hosts the original course exactly as authored (${contentLessonCount} section${contentLessonCount === 1 ? "" : "s"}) — students navigate it using the embedded course's own menu, not the sidebar here.`,
    );

    const quizModule = this.buildQuizModule(riseLessons, flagged);
    if (quizModule) modules.push(quizModule);

    return { modules, flagged, images_uploaded: 0 };
  }

  // Shared by both import modes — a Rise quiz's MULTIPLE_CHOICE (and
  // similarly-shaped) items become real graded QuizQuestion rows; types the
  // platform's quiz engine has no room for (matching, multi-select,
  // fill-in-the-blank) become a styled, readable, ungraded review lesson
  // instead of being dropped.
  private buildQuizModule(riseLessons: any[], flagged: string[]): PlannedModule | null {
    const quizRiseLesson = riseLessons.find((l) => l.type === "quiz");
    if (!quizRiseLesson) return null;

    const graded: PlannedQuestion[] = [];
    const reviewParts: string[] = [];
    const reviewTypeCounts: Record<string, number> = {};

    for (const item of quizRiseLesson.items ?? []) {
      if (item.type === "MATCHING" || item.type === "MULTIPLE_RESPONSE" || item.type === "FILL_IN_THE_BLANK") {
        reviewParts.push(renderReviewQuestion(item));
        reviewTypeCounts[item.type] = (reviewTypeCounts[item.type] ?? 0) + 1;
        continue;
      }

      // MULTIPLE_CHOICE and any other Rise question type shaped as
      // answers[]/correct (e.g. TRUE_FALSE) convert to a real graded question.
      const answers: any[] = item.answers ?? [];
      const correctIndex = answers.findIndex((a) => a.correct);
      if (!answers.length || correctIndex === -1) {
        flagged.push(`Quiz question "${item.title}" has no marked correct answer — skipped`);
        continue;
      }
      graded.push({
        question_text: item.title,
        question_type: "multiple_choice",
        options: answers.map((a) => a.title),
        correct_index: correctIndex,
        explanation: answers[correctIndex]?.feedback || item.feedbackCorrect || undefined,
      });
    }

    const quizLessons: PlannedModule["lessons"] = [];
    if (graded.length) {
      quizLessons.push({ title: quizRiseLesson.title || "Quiz", type: "quiz", questions: graded });
    }
    if (reviewParts.length) {
      quizLessons.push({
        title: "Additional Review Questions",
        type: "html",
        content_html: wrapLessonContent(reviewParts.join("\n")),
      });
      const summary = Object.entries(reviewTypeCounts)
        .map(([type, count]) => `${count} ${type.toLowerCase().replace(/_/g, " ")}`)
        .join(", ");
      flagged.push(
        `Quiz: ${summary} added as an ungraded review lesson — the platform's quiz engine only auto-grades multiple-choice questions today`,
      );
    }

    return quizLessons.length ? { title: quizRiseLesson.title || "Quiz", lessons: quizLessons } : null;
  }
}
