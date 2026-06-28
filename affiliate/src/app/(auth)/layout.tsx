import Image from "next/image";
import Link from "next/link";
import { DollarSign, BarChart3, Link2, Award, Star } from "lucide-react";

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Earn Up to 20% Commission",
    desc: "On every certification and course sale you refer.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    desc: "Track clicks, leads, and commissions live.",
  },
  {
    icon: Link2,
    title: "Unique Referral Links",
    desc: "Personal links and QR codes ready to share.",
  },
  {
    icon: Award,
    title: "Certified AI Products",
    desc: "Promote industry-recognized AI certifications.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: "linear-gradient(160deg, #060b18 0%, #0a1020 40%, #0e1e3d 100%)" }}
      >
        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "200px 200px",
          }}
        />

        {/* Gold accent lines */}
        <div className="absolute top-0 left-0 w-full h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.4), transparent)" }} />
        <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.2), transparent)" }} />

        {/* Glow orb */}
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(14,30,61,0.8) 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Image
              src="/paii.logo.png"
              alt="Professional AI Institute"
              width={44}
              height={44}
              className="rounded-xl object-contain"
              style={{ background: "rgba(255,255,255,0.07)", padding: "6px" }}
            />
            <div>
              <div className="text-[15px] font-black text-white tracking-tight leading-tight">
                Professional AI Institute
              </div>
              <div
                className="text-[10px] font-bold tracking-[0.2em] uppercase"
                style={{ color: "#c9a227" }}
              >
                Sales Partner Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
              style={{
                background: "rgba(201,162,39,0.1)",
                color: "#c9a227",
                border: "1px solid rgba(201,162,39,0.25)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#c9a227" }} />
              Affiliate Program
            </div>

            <h1 className="text-[2.6rem] font-black text-white leading-[1.15] tracking-tight mb-4">
              Turn Your Network
              <br />
              <span style={{ color: "#c9a227" }}>Into Revenue</span>
            </h1>

            <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Partner with PAI to promote Canada&rsquo;s leading AI certification programs and earn
              competitive commissions on every successful referral.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 gap-2.5">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3.5 p-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: "rgba(201,162,39,0.12)",
                    border: "1px solid rgba(201,162,39,0.2)",
                  }}
                >
                  <Icon size={16} style={{ color: "#c9a227" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div
            className="p-5 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} fill="#c9a227" color="#c9a227" />
              ))}
            </div>
            <p className="text-sm italic mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
              &ldquo;I&rsquo;ve referred 12 clients to PAI this quarter and earned over $3,200 in
              commissions. The portal makes tracking effortless.&rdquo;
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-navy-900 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #c9a227, #f0c94a)" }}
              >
                M
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Michael R.</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  PAI Certified Affiliate
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          &copy; {new Date().getFullYear()} Professional AI Institute. All rights reserved.
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-8">
          <Image
            src="/paii.logo.png"
            alt="PAI"
            width={36}
            height={36}
            className="rounded-lg object-contain"
            style={{ background: "#0e1e3d", padding: "4px" }}
          />
          <div className="text-sm font-black text-navy-900">PAI Affiliate Portal</div>
        </div>

        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 p-8">
            {children}
          </div>
          <p className="text-center text-xs text-slate-400 mt-5">
            &copy; {new Date().getFullYear()} Professional AI Institute
          </p>
        </div>
      </div>

    </div>
  );
}
