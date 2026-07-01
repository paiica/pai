import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#171527",
  width: "device-width",
  initialScale: 1,
};

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const res = await fetch(`${API}/site-settings/public`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const json = await res.json();
    // API wraps all responses in { success, data }
    return json?.data ?? json;
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const siteName  = settings.site_title       || "Professional AI Institute";
  const siteDesc  = settings.site_description || "Earn globally recognized AI certifications. PAI offers rigorous, credential-focused programs for professionals, managers, and executives ready to lead in the AI era.";
  const faviconUrl = settings.favicon_url     || "/favicon.ico";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://paii.ca"),
    title: {
      default: `${siteName} — AI Certifications for Modern Professionals`,
      template: `%s | ${siteName}`,
    },
    description: siteDesc,
    keywords: ["AI certification", "artificial intelligence certification", "professional AI certification", "CAIP", "CAIM", "CAIE", "CAIDA"],
    authors: [{ name: siteName, url: "https://paii.ca" }],
    creator: siteName,
    publisher: siteName,
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    icons: {
      icon:     faviconUrl,
      shortcut: faviconUrl,
      apple:    faviconUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_CA",
      url: "https://paii.ca",
      siteName,
      title: `${siteName} — AI Certifications for Modern Professionals`,
      description: siteDesc,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteName }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDesc,
      images: ["/og-image.png"],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
