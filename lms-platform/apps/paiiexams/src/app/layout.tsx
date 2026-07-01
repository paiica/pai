import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400","500","600","700","800"], display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500","600","700","900"], display: "swap" });

export const metadata: Metadata = {
  title: "paiiexams — Professional Artificial Intelligence Institute Exam Platform",
  description: "Secure proctored certification exams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
