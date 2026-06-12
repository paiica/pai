import { Metadata } from "next";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VerifyForm from "@/components/verify/VerifyForm";
import { Shield, Search, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify a PAI Certificate — Instant Certificate Verification",
  description:
    "Verify any Professional AI Institute certificate instantly. Enter a Certificate ID to check authenticity, status, and details.",
};

export default function VerifyPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 bg-slate-50 border-b border-slate-100">
          <div className="container-lg text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-navy-50 border border-navy-200 text-navy-700 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-6">
              <Shield size={12} />
              Certificate Verification
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-black text-navy-900 mb-4">
              Verify a PAI Certificate
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Employers and organizations can verify the authenticity of any PAI certificate
              instantly using the Certificate ID.
            </p>
          </div>
        </section>

        {/* Verify Tool */}
        <section className="section-padding bg-white">
          <div className="container-lg">
            <div className="max-w-2xl mx-auto">
              <VerifyForm />

              {/* How it works */}
              <div className="mt-14">
                <h2 className="text-xl font-display font-bold text-navy-900 mb-6 text-center">
                  How Certificate Verification Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {[
                    {
                      step: "1",
                      icon: Search,
                      title: "Enter Certificate ID",
                      desc: "Find the Certificate ID on the certificate document (format: CAIP-YYYY-XXXXX)",
                    },
                    {
                      step: "2",
                      icon: Shield,
                      title: "PAI Verifies",
                      desc: "We check our registry against the ID instantly and in real time",
                    },
                    {
                      step: "3",
                      icon: CheckCircle2,
                      title: "View Results",
                      desc: "See the holder's name, credential, issue date, and current status",
                    },
                  ].map((item) => (
                    <div key={item.step} className="text-center">
                      <div className="w-12 h-12 bg-navy-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <item.icon size={20} className="text-gold-400" />
                      </div>
                      <h3 className="font-display font-bold text-navy-900 text-sm mb-1">{item.title}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note for employers */}
              <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Shield size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-semibold text-sm mb-1">For Employers & Hiring Managers</p>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      PAI certificates are tamper-proof and verifiable. Each certificate includes a unique
                      ID and is permanently recorded in the PAI registry. If a certificate cannot be found,
                      it may be fraudulent — report it to fraud@professionalaiinstitute.com.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
