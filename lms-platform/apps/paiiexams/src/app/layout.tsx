import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "paiiexams — Professional AI Institute Exam Platform",
  description: "Secure proctored certification exams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
