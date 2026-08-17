import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import ReferralCapture from "@/components/ReferralCapture";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400","500","600","700","800"], display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500","600","700","900"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "PAII Learning Portal",
    template: "%s | PAII",
  },
  description: "Professional Artificial Intelligence Institute — Learning Management System",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${jakarta.variable} ${fraunces.variable}`}>
      <body>
        <NextIntlClientProvider>
          <ReferralCapture />
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
