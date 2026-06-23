import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAI Exam Admin — Exam Management Portal",
  description: "Administer certification exams for the Professional AI Institute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-white antialiased min-h-screen" style={{ background: "#0f172a" }}>{children}</body>
    </html>
  );
}
