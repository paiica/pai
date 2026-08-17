import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { Providers } from "@/components/Providers";
import ReferralCapture from "@/components/ReferralCapture";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

async function getSiteSettings(locale?: string): Promise<Record<string, string>> {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    // Kept short — this powers branding admins expect to see reflected
    // within about a minute of hitting Save (favicon, logo, GA id), not an
    // hour. A long window here previously made setting changes look like
    // they silently "didn't work."
    const res = await fetch(`${API}/site-settings/public${locale ? `?lang=${locale}` : ""}`, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error(`[site-settings] fetch returned ${res.status} from ${API}/site-settings/public`);
      return {};
    }
    const json = await res.json();
    // API wraps all responses in { success, data }
    return json?.data ?? json;
  } catch (err) {
    console.error("[site-settings] fetch failed", err);
    return {};
  }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings(locale);

  const siteName  = settings.site_title       || "Professional Artificial Intelligence Institute";
  const siteDesc  = settings.site_description || "Earn globally recognized AI certifications. PAII offers rigorous, credential-focused programs for professionals, managers, and executives ready to lead in the AI era.";
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
    alternates: {
      languages: { en: "/", ar: "/ar", fr: "/fr" },
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_SA" : locale === "fr" ? "fr_CA" : "en_CA",
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

export default async function RootLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const settings = await getSiteSettings(locale);
  const gaId = settings.google_analytics_id;

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${jakarta.variable} ${fraunces.variable} ${plexMono.variable}`}>
      <body>
        <NextIntlClientProvider>
          <ReferralCapture />
          <Providers>
            {children}
          </Providers>
          {gaId && <GoogleAnalytics gaId={gaId} />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
