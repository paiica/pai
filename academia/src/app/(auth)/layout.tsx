import Image from "next/image";
import Link from "next/link";
import { GraduationCap, BookOpen, Users2, Building2 } from "lucide-react";

const BENEFITS = [
  { icon: Building2,    title: "Your Own Branded Portal",  desc: "Institution-branded courses, professors, and students, all in one place." },
  { icon: Users2,       title: "Manage Professors & Students", desc: "Invite professors, and your students join automatically by email domain." },
  { icon: BookOpen,     title: "Private & Public Courses",   desc: "Keep courses institution-only, or publish to the PAII marketplace." },
  { icon: GraduationCap,title: "Built on PAII",              desc: "The same platform behind PAII's own certifications and courses."          },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[52%] flex-col">
        <div
          style={{
            background: "white",
            borderBottom: "1px solid #e8e4de",
            padding: "0 48px",
            height: "76px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
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
                Academic Cloud
              </div>
            </div>
          </Link>
        </div>

        <div
          className="flex-1 relative overflow-hidden flex flex-col justify-between"
          style={{
            background: "linear-gradient(135deg, #171527 0%, #1f1d38 50%, #2d1b69 100%)",
            padding: "48px",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: "320px",
              height: "320px",
              background: "radial-gradient(circle at top right, rgba(20,184,166,0.07) 0%, transparent 70%)",
            }}
          />

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
                For Universities & Colleges
              </div>

              <h1
                className="font-extrabold text-white tracking-tight"
                style={{ fontSize: "2.5rem", lineHeight: "1.12", marginBottom: "16px" }}
              >
                Your Institution&apos;s
                <br />
                <span style={{ color: "#2dd4bf" }}>Academic Cloud</span>
              </h1>

              <p style={{ fontSize: "15px", lineHeight: "1.7", color: "rgba(255,255,255,0.55)" }}>
                Manage your professors, students, and courses under your own institutional brand.
              </p>
            </div>

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
          </div>

          <p className="relative z-10" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "32px" }}>
            &copy; {new Date().getFullYear()} Professional Artificial Intelligence Institute. All rights reserved.
          </p>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center min-h-screen p-6"
        style={{ background: "#f5f0eb" }}
      >
        <div className="flex lg:hidden items-center gap-3 mb-8">
          <Image src="/paii.logo.png" alt="PAII" width={100} height={40} className="object-contain block" style={{ maxHeight: "40px", width: "auto" }} />
        </div>

        <div className="w-full max-w-[420px]">
          <div
            className="bg-white p-8"
            style={{
              borderRadius: "20px",
              border: "1px solid #ddd8d0",
              boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
            }}
          >
            {children}
          </div>
          <p className="text-center mt-5" style={{ fontSize: "11px", color: "#948e84" }}>
            &copy; {new Date().getFullYear()} Professional Artificial Intelligence Institute
          </p>
        </div>
      </div>
    </div>
  );
}
