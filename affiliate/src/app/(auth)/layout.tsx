import Link from "next/link";

const BENEFITS = [
  { icon: "💰", title: "Earn Up to 20% Commission", desc: "On every certification and course sale you refer." },
  { icon: "📊", title: "Real-Time Dashboard", desc: "Track clicks, leads, and commissions live." },
  { icon: "🔗", title: "Unique Referral Links", desc: "Personal links and QR codes ready to share." },
  { icon: "🎓", title: "Certified AI Products", desc: "Promote industry-recognized AI certifications." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0a1628 0%, #0f2347 45%, #1a3a6b 100%)" }}>

        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #c9a227 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #c9a227 0%, transparent 70%)" }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg, #c9a227, #f0c94a)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="text-base font-black text-white tracking-tight">Professional AI Institute</div>
              <div className="text-[10px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#c9a227" }}>Sales Partner Portal</div>
            </div>
          </Link>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
              style={{ background: "rgba(201,162,39,0.15)", color: "#f0c94a", border: "1px solid rgba(201,162,39,0.3)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              Affiliate Program
            </div>
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              Turn Your Network<br />
              <span style={{ color: "#c9a227" }}>Into Revenue</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              Partner with PAI to promote Canada's leading AI certification programs and earn competitive commissions on every successful referral.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 gap-3">
            {BENEFITS.map((b) => (
              <div key={b.title}
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-xl shrink-0 mt-0.5">{b.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{b.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm italic mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
              "I've referred 12 clients to PAI this quarter and earned over $3,200 in commissions. The portal makes tracking effortless."
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                style={{ background: "linear-gradient(135deg, #c9a227, #f0c94a)" }}>M</div>
              <div>
                <p className="text-xs font-semibold text-white">Michael R.</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>PAI Certified Affiliate</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#c9a227"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          © {new Date().getFullYear()} Professional AI Institute. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0f2347, #1a3a6b)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-black text-navy-900">PAI Affiliate Portal</div>
          </div>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8">
            {children}
          </div>
          <p className="text-center text-xs text-slate-400 mt-5">
            © {new Date().getFullYear()} Professional AI Institute
          </p>
        </div>
      </div>

    </div>
  );
}
