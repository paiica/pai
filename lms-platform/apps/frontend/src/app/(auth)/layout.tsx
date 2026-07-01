import Image from "next/image";
import Link from "next/link";
import { Award, BookOpen, Users, BadgeCheck, Star } from "lucide-react";

const BENEFITS = [
  { icon: Award,      title: "Globally Recognized Certifications", desc: "CAIP, CAIM, CAIE, and CAIDA credentials respected by employers worldwide." },
  { icon: BookOpen,   title: "Self-Paced Learning",               desc: "Study on your schedule — content is always available 24/7."              },
  { icon: Users,      title: "Expert-Led Programs",               desc: "Curriculum designed by working AI professionals and academics."            },
  { icon: BadgeCheck, title: "Verified Digital Credentials",      desc: "Share your certificate on LinkedIn and with employers instantly."          },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col">

        {/* White logo bar */}
        <div
          style={{
            background: "white",
            borderBottom: "1px solid #e8e4de",
            padding: "0 48px",
            height: "76px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Link href={process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"} style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
            <Image
              src="/paii.logo.png"
              alt="Professional Artificial Intelligence Institute"
              width={130}
              height={52}
              className="object-contain block"
              style={{ maxHeight: "52px", width: "auto" }}
            />
            <div style={{ width: "1px", height: "36px", background: "#e8e4de", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#171527", letterSpacing: "-0.01em" }}>
                Professional Artificial Intelligence Institute
              </div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: "#14b8a6", letterSpacing: "0.15em", textTransform: "uppercase", marginTop: "2px" }}>
                Learning Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Dark hero area */}
        <div
          className="flex-1 relative overflow-hidden flex flex-col justify-between"
          style={{
            background: "linear-gradient(135deg, #171527 0%, #1f1d38 50%, #2d1b69 100%)",
            padding: "48px",
          }}
        >
          {/* Subtle grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Subtle teal glow */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: "320px",
              height: "320px",
              background: "radial-gradient(circle at top right, rgba(20,184,166,0.07) 0%, transparent 70%)",
            }}
          />

          {/* Hero copy */}
          <div className="relative z-10 space-y-8">
            <div>
              <div
                className="inline-flex items-center gap-2 mb-6"
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#5eead4",
                  background: "rgba(20,184,166,0.12)",
                  border: "1px solid rgba(20,184,166,0.25)",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#2dd4bf", display: "inline-block" }} />
                AI Certifications
              </div>

              <h1
                className="font-extrabold text-white tracking-tight"
                style={{ fontSize: "2.5rem", lineHeight: "1.12", marginBottom: "16px" }}
              >
                Advance Your Career
                <br />
                <span style={{ color: "#2dd4bf" }}>With AI Expertise</span>
              </h1>

              <p style={{ fontSize: "15px", lineHeight: "1.7", color: "rgba(255,255,255,0.55)" }}>
                Earn globally recognized AI credentials from Canada&rsquo;s leading certification body.
                Designed for professionals who want to lead in the age of artificial intelligence.
              </p>
            </div>

            {/* Benefits */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(20,184,166,0.15)",
                      border: "1px solid rgba(20,184,166,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    <Icon size={16} color="#2dd4bf" />
                  </div>
                  <div>
                    <p style={{ fontSize: "13.5px", fontWeight: 600, color: "rgba(255,255,255,0.92)", marginBottom: "2px" }}>{title}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="#2dd4bf" color="#2dd4bf" />
                ))}
              </div>
              <p style={{ fontSize: "13.5px", fontStyle: "italic", color: "rgba(255,255,255,0.65)", marginBottom: "14px", lineHeight: "1.6" }}>
                &ldquo;Getting my CAIP certification opened doors I didn&rsquo;t think possible. My salary
                increased 30% within six months of earning the credential.&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "#0d9488",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  S
                </div>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>Sarah K.</p>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>CAIP Certified — Toronto, Canada</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="relative z-10" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "32px" }}>
            &copy; {new Date().getFullYear()} Professional Artificial Intelligence Institute. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center min-h-screen p-6 overflow-y-auto"
        style={{ background: "#f5f0eb" }}
      >
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center justify-center mb-8">
          <Image
            src="/paii.logo.png"
            alt="PAII"
            width={120}
            height={48}
            className="object-contain block"
            style={{ maxHeight: "48px", width: "auto" }}
          />
        </div>

        <div className="w-full max-w-md py-8">
          {children}
        </div>
      </div>

    </div>
  );
}
