"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Shield, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyPage() {
  const [certId, setCertId] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [result, setResult] = useState<null | {
    name: string;
    cert: string;
    issue_date: string;
    expiry_date: string;
    status: string;
  }>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!certId.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://api.paii.ca"}/certificates/verify/${certId.trim()}`
      );
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setStatus("found");
      } else {
        setStatus("not_found");
        setResult(null);
      }
    } catch {
      setStatus("not_found");
    }
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="pt-[148px] pb-24 bg-hero-dark relative overflow-hidden">
          <div className="container-lg relative text-center">
            <span className="badge-dark mb-5">Certificate Verification</span>
            <h1 className="text-4xl sm:text-5xl font-display font-black text-white mb-5">
              Verify a PAI Credential
            </h1>
            <p className="text-lg text-white max-w-xl mx-auto">
              Enter a certificate ID to verify its authenticity and check its validity status.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full">
              <path d="M0 60L1440 60V30C1440 30 1080 0 720 0C360 0 0 30 0 30V60Z" fill="white" />
            </svg>
          </div>
        </section>

        <section className="section-padding bg-white">
          <div className="max-w-xl mx-auto px-4">
            <div className="card-base p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-sand-100 rounded-2xl flex items-center justify-center">
                  <Shield size={24} className="text-ink-900" />
                </div>
                <div>
                  <div className="font-display font-bold text-ink-900">Verify Certificate</div>
                  <div className="text-xs text-ink-900">Enter the unique certificate ID</div>
                </div>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="text"
                  value={certId}
                  onChange={(e) => setCertId(e.target.value)}
                  placeholder="e.g. PAI-CAIP-2024-001234"
                  className="input-base font-mono"
                />
                <button
                  type="submit"
                  disabled={status === "loading" || !certId.trim()}
                  className="w-full btn-dark !py-3 !text-sm justify-center disabled:opacity-50"
                >
                  {status === "loading"
                    ? <><Loader2 size={16} className="animate-spin" /> Verifyingâ€¦</>
                    : <><Search size={16} /> Verify Certificate</>
                  }
                </button>
              </form>

              {status === "found" && result && (
                <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={20} className="text-ink-900" />
                    <span className="font-display font-bold text-ink-900">Valid Certificate</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Certificate Holder", value: result.name },
                      { label: "Certification", value: result.cert },
                      { label: "Issue Date", value: result.issue_date },
                      { label: "Valid Until", value: result.expiry_date },
                      { label: "Status", value: result.status },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-ink-900 font-medium">{label}</span>
                        <span className="font-semibold text-ink-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status === "not_found" && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2">
                    <XCircle size={20} className="text-ink-900" />
                    <div>
                      <div className="font-display font-bold text-ink-900">Certificate Not Found</div>
                      <div className="text-sm text-ink-900 mt-0.5">
                        The certificate ID you entered could not be found. Please check the ID and try again.
                        Contact <a href="mailto:info@paii.ca" className="underline">info@paii.ca</a> if you believe this is an error.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

