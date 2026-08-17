import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ShieldCheck, XCircle } from "lucide-react";
import PrintButton from "./PrintButton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getTranscript(token: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}/transcripts/share/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch {
    return null;
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const t = await getTranscript(token);
  if (!t) return { title: "Transcript Unavailable" };
  return {
    title: `Official Transcript — ${t.student.name} | Professional Artificial Intelligence Institute`,
    description: `Verified program transcript issued by the Professional Artificial Intelligence Institute.`,
  };
}

export default async function SharedTranscriptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranscript(token);

  return (
    <>
      <Navbar />
      <main className="pb-24 bg-white" style={{ paddingTop: "calc(var(--header-height, 88px) + 48px)" }}>
        <div className="max-w-3xl mx-auto px-4">
          {!t ? (
            <div className="text-center py-20">
              <XCircle size={40} className="text-red-300 mx-auto mb-4" />
              <h1 className="text-2xl font-display font-black text-ink-900 mb-2">Transcript Unavailable</h1>
              <p className="text-sm text-ink-900/60 max-w-md mx-auto">
                This link is invalid, has expired, or has been revoked by the student. If you believe this is an
                error, please contact the student directly for a new link.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-6 print:hidden">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <ShieldCheck size={13} /> Verified Transcript
                </span>
              </div>

              <div className="rounded-2xl border border-sand-300 bg-white shadow-lg print:border-0 print:shadow-none print:rounded-none p-8 sm:p-12 print:p-0">
                <div className="text-center border-b-2 border-ink-900 pb-6 mb-8">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink-900/40 mb-1">Professional AI Institute</p>
                  <h1 className="text-2xl font-display font-black text-ink-900">Official Program Transcript</h1>
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs text-ink-900/60">
                    <span>Transcript No. <span className="font-mono font-semibold text-ink-900">{t.transcript_number}</span></span>
                    <span>·</span>
                    <span>Issued {formatDate(t.issued_at)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-8 text-sm">
                  <div><span className="text-ink-900/40">Student:</span> <span className="font-semibold text-ink-900">{t.student.name}</span></div>
                  <div><span className="text-ink-900/40">Student ID:</span> <span className="font-semibold text-ink-900">{t.student.student_id}</span></div>
                  <div><span className="text-ink-900/40">Program:</span> <span className="font-semibold text-ink-900">{t.program.title}</span></div>
                  <div><span className="text-ink-900/40">Program Code:</span> <span className="font-semibold text-ink-900">{t.program.code || "—"}</span></div>
                  <div><span className="text-ink-900/40">Status:</span> <span className="font-semibold text-ink-900">{t.summary.program_status}</span></div>
                  {t.enrollment.completed_at && (
                    <div><span className="text-ink-900/40">Completion Date:</span> <span className="font-semibold text-ink-900">{formatDate(t.enrollment.completed_at)}</span></div>
                  )}
                </div>

                <p className="text-[10px] font-bold text-ink-900/40 uppercase tracking-widest mb-2">Academic Record</p>
                <table className="w-full text-sm mb-8 border-collapse">
                  <thead>
                    <tr className="border-b-2 border-sand-300">
                      <th className="text-left py-2 font-semibold text-ink-900/70">Course</th>
                      <th className="text-right py-2 font-semibold text-ink-900/70">Hours</th>
                      <th className="text-left py-2 font-semibold text-ink-900/70 pl-4">Grade</th>
                      <th className="text-left py-2 font-semibold text-ink-900/70 pl-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.academic_record.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-sand-200">
                        <td className="py-2 text-ink-900">{r.course_title}</td>
                        <td className="py-2 text-right text-ink-900/70">{r.hours}</td>
                        <td className="py-2 pl-4 text-ink-900 font-semibold">{r.letter_grade ?? "—"}</td>
                        <td className="py-2 pl-4 text-ink-900/70">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {t.capstone.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold text-ink-900/40 uppercase tracking-widest mb-2">Capstone</p>
                    <table className="w-full text-sm mb-8 border-collapse">
                      <thead>
                        <tr className="border-b-2 border-sand-300">
                          <th className="text-left py-2 font-semibold text-ink-900/70">Title</th>
                          <th className="text-left py-2 font-semibold text-ink-900/70 pl-4">Grade</th>
                          <th className="text-left py-2 font-semibold text-ink-900/70 pl-4">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.capstone.map((r: any, i: number) => (
                          <tr key={i} className="border-b border-sand-200">
                            <td className="py-2 text-ink-900">{r.course_title}</td>
                            <td className="py-2 pl-4 text-ink-900 font-semibold">{r.letter_grade ?? "—"}</td>
                            <td className="py-2 pl-4 font-semibold">
                              {r.pass_fail ? (
                                <span className={r.pass_fail === "Pass" ? "text-emerald-600" : "text-red-500"}>{r.pass_fail}</span>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                <div className="bg-sand-100 rounded-xl p-5 mb-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-ink-900/40 uppercase tracking-widest">Overall Average</p>
                    <p className="text-sm font-semibold text-ink-900 mt-0.5">{t.summary.overall_average != null ? `${t.summary.overall_average}%` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-ink-900/40 uppercase tracking-widest">Program GPA</p>
                    <p className="text-sm font-semibold text-ink-900 mt-0.5">{t.summary.gpa ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-ink-900/40 uppercase tracking-widest">Program Status</p>
                    <p className="text-sm font-semibold text-ink-900 mt-0.5">{t.summary.program_status}</p>
                  </div>
                </div>

                <div className="border-t border-sand-300 pt-5 text-center">
                  <p className="text-[11px] text-ink-900/60 leading-relaxed max-w-lg mx-auto">
                    This transcript is an official record of the learner's academic performance in the Professional AI Institute program. Verified by Professional AI Institute.
                  </p>
                  <p className="text-[10px] text-ink-900/40 mt-2">
                    Verification ID: <span className="font-mono">{t.transcript_number}</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-center mt-6">
                <PrintButton />
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
