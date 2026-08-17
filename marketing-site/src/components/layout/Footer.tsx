import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Linkedin, Instagram, Mail, MapPin, Shield } from "lucide-react";

function XIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };
type TFunc = (key: string) => string;

const DEFAULT_SOCIAL_LINKEDIN  = "https://linkedin.com/company/professional-ai-institute";
const DEFAULT_SOCIAL_TWITTER   = "https://x.com/paii_ca";
const DEFAULT_SOCIAL_INSTAGRAM = "";
const DEFAULT_SOCIAL_EMAIL = "info@paii.ca";
const DEFAULT_CONTACT_EMAIL = "info@paii.ca";

function getDefaultColumns(t: TFunc): FooterColumn[] {
  return [
    {
      title: t("colCertifications"),
      links: [
        { label: t("linkViewAllCertifications"), href: "/certifications" },
      ],
    },
    {
      title: t("colCompany"),
      links: [
        { label: t("linkAboutPaii"), href: "/about" },
        { label: t("linkOurMission"), href: "/about#mission" },
        { label: t("linkAdvisoryBoard"), href: "/about#board" },
        { label: t("linkAccreditation"), href: "/about#accreditation" },
      ],
    },
    {
      title: t("colResources"),
      links: [
        { label: t("linkBlogInsights"), href: "/blog" },
        { label: t("linkVerifyCertificate"), href: "/verify" },
        { label: t("linkFaqs"), href: "/faq" },
        { label: t("linkSupport"), href: "/support" },
      ],
    },
    {
      title: t("colOrganizations"),
      links: [
        { label: t("linkCorporateTraining"), href: "/corporate" },
        { label: t("linkVolumePricing"), href: "/corporate#pricing" },
        { label: t("linkEducatorProgram"), href: "/educator" },
        { label: t("linkBecomeAffiliate"), href: "https://sales.paii.ca" },
      ],
    },
  ];
}

const DEFAULT_TRUST_ITEMS: string[] = [];

function getDefaultBottomLinks(t: TFunc): FooterLink[] {
  return [
    { label: t("linkPrivacyPolicy"), href: "/privacy" },
    { label: t("linkTermsOfService"), href: "/terms" },
  ];
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

async function getFooterContent(locale: string) {
  try {
    const res = await fetch(`${API}/page-blocks/public?lang=${locale}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    const blocks: any[] = json?.data ?? json ?? [];
    return blocks.find((b: any) => b.key === "footer")?.content ?? null;
  } catch {
    return null;
  }
}

async function getSiteSettings() {
  try {
    const res = await fetch(`${API}/site-settings/public`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? json ?? null;
  } catch {
    return null;
  }
}

export default async function Footer() {
  const locale = await getLocale();
  const [content, siteSettings, t] = await Promise.all([getFooterContent(locale), getSiteSettings(), getTranslations("Footer")]);

  const logoUrl    = siteSettings?.site_logo_url ?? null;
  const logoHeight = parseInt(siteSettings?.logo_height ?? "48") || 48;

  const tagline = content?.tagline ?? t("defaultTagline");
  const socialLinkedin  = content?.social_linkedin  ?? DEFAULT_SOCIAL_LINKEDIN;
  const socialTwitter   = content?.social_twitter   ?? DEFAULT_SOCIAL_TWITTER;
  const socialInstagram = content?.social_instagram ?? DEFAULT_SOCIAL_INSTAGRAM;
  const rawEmail = content?.social_email ?? DEFAULT_SOCIAL_EMAIL;
  const socialEmail = rawEmail.startsWith("mailto:") ? rawEmail : `mailto:${rawEmail}`;
  const contactEmail = content?.contact_email ?? DEFAULT_CONTACT_EMAIL;
  const contactLocation = content?.contact_location ?? t("defaultContactLocation");
  const columns: FooterColumn[] = Array.isArray(content?.columns) ? content.columns : getDefaultColumns(t);
  const trustItems: string[] = Array.isArray(content?.trust_items) ? content.trust_items : DEFAULT_TRUST_ITEMS;
  const copyright = content?.copyright ?? t("defaultCopyright");
  const bottomLinks: FooterLink[] = Array.isArray(content?.bottom_links) ? content.bottom_links : getDefaultBottomLinks(t);

  const lastColumn = columns[columns.length - 1];
  const mainColumns = columns.slice(0, columns.length - 1);

  return (
    <footer className="bg-ink-900 text-white">
      <div className="container-lg py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center mb-5">
              {/* Same white-on-dark handling as the header: the default PAII mark
                  uses a pre-whitened asset (avoids a runtime CSS filter turning
                  the whole box solid white on some mobile browsers' PNG alpha
                  handling), while a custom logo from site settings falls back
                  to the filter since no pre-whitened variant exists for it. */}
              <img
                src={logoUrl || "/paii.logo.white.png"}
                alt="Professional Artificial Intelligence Institute"
                style={logoUrl ? { height: `${logoHeight}px`, filter: "brightness(0) invert(1)" } : { height: `${logoHeight}px` }}
                className="w-auto object-contain"
              />
            </Link>
            <p className="text-white text-sm leading-relaxed mb-6">
              {tagline}
            </p>
            <div className="flex items-center gap-2">
              {socialLinkedin && (
                <a href={socialLinkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"
                  className="w-9 h-9 bg-ink-800 hover:bg-ink-700 rounded-lg flex items-center justify-center transition-colors">
                  <Linkedin size={15} className="text-white" />
                </a>
              )}
              {socialTwitter && (
                <a href={socialTwitter} target="_blank" rel="noopener noreferrer" aria-label="X"
                  className="w-9 h-9 bg-ink-800 hover:bg-ink-700 rounded-lg flex items-center justify-center transition-colors">
                  <XIcon size={15} />
                </a>
              )}
              {socialInstagram && (
                <a href={socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  className="w-9 h-9 bg-ink-800 hover:bg-ink-700 rounded-lg flex items-center justify-center transition-colors">
                  <Instagram size={15} className="text-white" />
                </a>
              )}
              {socialEmail && (
                <a href={socialEmail} aria-label="Email"
                  className="w-9 h-9 bg-ink-800 hover:bg-ink-700 rounded-lg flex items-center justify-center transition-colors">
                  <Mail size={15} className="text-white" />
                </a>
              )}
            </div>
          </div>

          {mainColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {lastColumn && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">{lastColumn.title}</h4>
              <ul className="space-y-2.5 mb-7">
                {lastColumn.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">{t("contact")}</h4>
              <div className="space-y-2">
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-sm text-white hover:text-white transition-colors">
                  <Mail size={13} /> {contactEmail}
                </a>
                <div className="flex items-start gap-2 text-sm text-white">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{contactLocation}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="py-6 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-6 text-xs text-white">
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Shield size={13} className="text-white" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white">
            © {new Date().getFullYear()} {copyright}
          </p>
          <div className="flex items-center gap-5">
            {bottomLinks.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-white hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
