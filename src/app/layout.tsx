import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://professionalaiinstitute.com"
  ),
  title: {
    default: "Professional AI Institute | Industry-Recognized AI Certifications",
    template: "%s | Professional AI Institute",
  },
  description:
    "Earn industry-recognized AI certifications designed for business professionals, managers, educators, and leaders. The CAIP and other credentials from PAI validate your AI expertise.",
  keywords: [
    "AI certification",
    "artificial intelligence certification",
    "CAIP",
    "certified AI professional",
    "AI for business",
    "professional AI training",
    "AI credentials",
    "AI upskilling",
    "AI literacy",
  ],
  authors: [{ name: "Professional AI Institute" }],
  creator: "Professional AI Institute",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://professionalaiinstitute.com",
    siteName: "Professional AI Institute",
    title: "Professional AI Institute | Industry-Recognized AI Certifications",
    description:
      "Earn industry-recognized AI certifications. The CAIP credential is designed for business professionals, managers, and leaders.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Professional AI Institute",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional AI Institute",
    description: "Earn industry-recognized AI certifications for professionals.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-white antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
