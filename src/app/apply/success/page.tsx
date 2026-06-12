import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Clock, Mail, ArrowRight } from "lucide-react";

export default function ApplicationSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/">
            <Image src="/logo.png" alt="PAI" width={200} height={100} className="h-9 w-auto" priority />
          </Link>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>

          <h1 className="text-2xl font-display font-black text-navy-900 mb-2">
            Application Submitted!
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Your application and payment have been received. Our team will review your application and get back to you within <strong>3–5 business days</strong>.
          </p>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 text-left mb-8 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">What happens next</h3>
            {[
              { icon: Clock, text: "PAI reviews your application (3–5 business days)" },
              { icon: Mail, text: "You'll receive an email with our decision" },
              { icon: CheckCircle2, text: "If approved, log in to access the LMS immediately" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-600">
                <Icon size={15} className="text-gold-500 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="flex-1 flex items-center justify-center gap-2 bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 rounded-xl transition-all text-sm"
            >
              Sign In to Dashboard <ArrowRight size={14} />
            </Link>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Questions? Email us at{" "}
          <a href="mailto:info@professionalaiinstitute.com" className="text-navy-600 font-semibold">
            info@professionalaiinstitute.com
          </a>
        </p>
      </div>
    </div>
  );
}
