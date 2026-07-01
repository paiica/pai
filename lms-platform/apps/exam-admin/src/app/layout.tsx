import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400","500","600","700","800"], display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500","600","700","900"], display: "swap" });

export const metadata: Metadata = {
  title: "PAII Exam Admin — Exam Management Portal",
  description: "Administer certification exams for the Professional Artificial Intelligence Institute",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="text-white antialiased min-h-screen font-sans" style={{ background: "#0f172a" }}>{children}</body>
    </html>
  );
}
