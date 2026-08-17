"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { toPng } from "html-to-image";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Printer, Lock, Link2, Check, FileImage } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => (r as any).data ?? r);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

// ?cb= busts any CDN/browser cache entry for this URL that was populated
// before the R2 bucket's CORS policy existed — Cloudflare's edge cache
// doesn't vary by the Origin header, so a pre-CORS-fix cached response
// (with no Access-Control-Allow-Origin header) could otherwise keep being
// served to every client indefinitely regardless of what the bucket sends now.
const PAII_LOGO_URL = "https://pub-0c606097bb0a40d79793d3b80d5cb8c0.r2.dev/Assests/paii-icon.png?cb=20260810";
const MARKETING = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

export default function CourseCertificatePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const token = useAuthStore((s) => s.accessToken)!;
  const t = useTranslations("CourseCertificate");
  const [copied, setCopied] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);

  const { data: cert, isLoading, error } = useSWR(
    token && courseId ? [`/prep-courses/my/course-grades/${courseId}/certificate`, token] : null,
    ([url, t]) => fetcher(url, t),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    );
  }

  const notPassed = error instanceof ApiError && error.status === 403;

  if (notPassed) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <Lock size={32} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-700 text-sm font-semibold mb-1">{t("notEarnedHeading")}</p>
          <p className="text-xs text-slate-400 mb-4">{t("notEarnedBody")}</p>
          <Link href="/student/grades" className="text-xs text-teal-700 hover:underline">{t("backToGrades")}</Link>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-sm font-semibold mb-1">{t("couldNotLoad")}</p>
          <Link href="/student/grades" className="text-xs text-teal-700 hover:underline">{t("backToGrades")}</Link>
        </div>
      </div>
    );
  }

  const certifications: { acronym: string; title: string }[] = cert.certifications ?? [];
  const curriculumLine = certifications.length > 0
    ? `part of the ${certifications.map((c) => `${c.title} (${c.acronym})`).join(" and ")} curriculum`
    : null;

  // Course certificates aren't a persisted/publicly-verifiable record (see
  // the design decision when this feature was built), so there's no verify
  // page to link to — the copyable link points at the course's own public
  // marketing page instead, so anyone who gets it actually lands somewhere real.
  const shareUrl = cert.course_slug ? `${MARKETING}/courses/${cert.course_slug}` : MARKETING;

  async function handleCopyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success(t("linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  }

  // Rasterizes just the certificate sheet to a PNG (2x pixel ratio for a
  // crisp, shareable/printable image) and triggers a browser download.
  async function handleDownloadPng() {
    const node = document.getElementById("certificate-document");
    if (!node) return;
    setDownloadingPng(true);
    try {
      // imagePlaceholder: the PAII logo is hosted on a bucket with no CORS
      // headers, so html-to-image can't fetch its bytes to inline them —
      // without a placeholder that failure throws and aborts the whole
      // export. With it, the logo just renders blank and everything else
      // (text, borders, signature) still comes through.
      const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff", imagePlaceholder: "" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${cert.course_title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-certificate.png`;
      a.click();
    } catch {
      toast.error(t("toastPngFailed"));
    } finally {
      setDownloadingPng(false);
    }
  }

  // Prints/downloads ONLY the certificate sheet — opens an isolated popup
  // window containing just that element's markup (plus Tailwind + the two
  // certificate fonts) and prints that, instead of window.print()-ing the
  // whole page, which would also try to paginate the "Back to Grades" bar
  // and page background. Same technique as the Program Transcript's
  // "Download PDF" button.
  function handleDownloadPdf() {
    const win = window.open("", "_blank");
    if (!win) { toast.error(t("popupBlocked")); return; }
    const printArea = document.getElementById("certificate-document");
    if (!printArea) return;
    // margin:0 + no body padding — the sheet itself is sized to exactly
    // 11in x 8.5in (border-box, so the teal padding/border are INSIDE that
    // size, not added on top of it), matching @page exactly so it prints as
    // a single landscape page instead of overflowing onto a second one.
    win.document.write(`<!DOCTYPE html><html><head><title>Certificate of Completion</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Mr+De+Haviland&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>*{box-sizing:border-box;} @page { size: letter landscape; margin: 0; } html,body { margin: 0; padding: 0; background: #fff; }</style>
      </head><body>${printArea.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }

  return (
    <div className="min-h-screen bg-[#f0f1f0]">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* crossOrigin here matters beyond just the font load: html-to-image
          (used by Download PNG) walks every stylesheet on the page to embed
          @font-face rules, and reading .cssRules off a cross-origin sheet
          the browser didn't load in CORS mode throws a SecurityError. */}
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Mr+De+Haviland&display=swap" rel="stylesheet" crossOrigin="anonymous" />
      <style>{`#certificate-document, #certificate-document * { box-sizing: border-box; }`}</style>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link href="/student/grades" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft size={12} /> {t("backToGrades")}
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Link2 size={13} />}
              {copied ? t("copied") : t("copyLink")}
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={downloadingPng}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-navy-300 text-navy-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
            >
              {downloadingPng ? <Loader2 size={13} className="animate-spin" /> : <FileImage size={13} />}
              {t("downloadPng")}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Printer size={13} /> {t("printSaveAsPdf")}
            </button>
          </div>
        </div>

        {/* ── Certificate sheet — landscape letter, PAII teal frame + ribbon
            accent, mirroring the accredited Certification credential design ── */}
        <div
          id="certificate-document"
          className="cert-sheet relative mx-auto"
          style={{
            width: "11in", maxWidth: "100%", aspectRatio: "11 / 8.5",
            background: "#0d5f5a", padding: "13px",
            boxShadow: "0 18px 60px rgba(13,95,90,0.22)",
          }}
        >
          <div className="relative w-full h-full bg-white overflow-hidden" style={{ border: "2px solid #0d5f5a" }}>
            {/* corner ribbon accent */}
            <div
              className="absolute right-0 top-0"
              style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "0 130px 150px 0", borderColor: "transparent #0d9488 transparent transparent" }}
            />
            <div
              className="absolute right-0 top-0"
              style={{
                width: 0, height: 0, borderStyle: "solid", borderWidth: "0 130px 150px 0",
                borderColor: "transparent #0f4f4c transparent transparent",
                clipPath: "polygon(38% 100%, 100% 62%, 100% 100%)",
              }}
            />

            <div className="absolute inset-0 flex flex-col items-center text-center" style={{ padding: "0.5in 0.7in 0.4in", fontFamily: "'Archivo', sans-serif" }}>
              {/* Logo + wordmark */}
              <div className="flex items-center gap-3.5">
                <img src={PAII_LOGO_URL} alt="PAII" crossOrigin="anonymous" style={{ height: 56, width: "auto", objectFit: "contain" }} />
                <div className="text-left leading-tight pl-3.5" style={{ borderLeft: "2px solid #d7e6e4" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0d5f5a", letterSpacing: "0.01em" }}>Professional</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0d5f5a", letterSpacing: "0.01em" }}>AI Institute<span style={{ fontWeight: 500 }}>.</span></div>
                </div>
              </div>

              <div className="mt-7" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.3em", color: "#8a90a0", textTransform: "uppercase" }}>
                This is to certify that
              </div>

              <div className="mt-4" style={{ fontSize: 38, fontWeight: 500, color: "#0d5f5a", lineHeight: 1.05 }}>
                {cert.student_name}
              </div>

              <div className="mt-5 mx-auto" style={{ maxWidth: "6.2in", fontSize: 12, fontWeight: 500, letterSpacing: "0.12em", lineHeight: 1.85, color: "#8a90a0", textTransform: "uppercase" }}>
                has successfully completed all coursework and requirements
                {curriculumLine ? `, ${curriculumLine},` : ""} and is hereby awarded this
              </div>

              <div className="mt-4" style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.25em", color: "#8a90a0", textTransform: "uppercase" }}>
                Certificate of Completion
              </div>
              <div className="mt-2 mx-auto" style={{ maxWidth: "7in", fontSize: 30, fontWeight: 700, color: "#0d5f5a", lineHeight: 1.2 }}>
                {cert.course_title}
              </div>

              {/* signature + footer — grouped so there's exactly one
                  flexible gap above them, sized by how much room the
                  content above actually needs rather than always
                  stretching to the very bottom edge. */}
              <div className="mt-auto w-full flex flex-col items-center" style={{ paddingTop: 24 }}>
                <div style={{ fontFamily: "'Mr De Haviland', cursive", fontSize: 34, color: "#111111", lineHeight: 1, whiteSpace: "nowrap" }}>
                  Zahid Hussain
                </div>
                <div style={{ width: "100%", maxWidth: 220, height: 1, background: "#0d5f5a", marginTop: 6 }} />
                <div className="mt-2" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em", color: "#111111" }}>
                  Dr. Zahid Hussain&nbsp;&nbsp;|&nbsp;&nbsp;<span style={{ fontWeight: 500, color: "#6b7180" }}>Founder &amp; Managing Director</span>
                </div>

                {/* footer strip */}
                <div className="mt-5 w-full flex items-baseline justify-between" style={{ paddingTop: 12, borderTop: "1px solid #e4e7ec" }}>
                  <div style={{ fontSize: 10.5, color: "#6b7180", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 700, color: "#0d5f5a" }}>Course&nbsp;&nbsp;</span>{cert.course_title}
                  </div>
                  {certifications.length > 0 && (
                    <div style={{ fontSize: 10.5, color: "#6b7180", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 700, color: "#0d5f5a" }}>Certification&nbsp;&nbsp;</span>{certifications.map((c) => c.acronym).join(", ")}
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: "#6b7180", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 700, color: "#0d5f5a" }}>Date of Completion&nbsp;&nbsp;</span>{formatDate(cert.completed_at)}
                  </div>
                  {cert.grade_percentage != null && (
                    <div style={{ fontSize: 10.5, color: "#6b7180", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 700, color: "#0d5f5a" }}>Grade&nbsp;&nbsp;</span>{cert.grade_percentage}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
