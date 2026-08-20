import { getLocale } from "next-intl/server";
import GlossaryBrowser, { type GlossaryTermData } from "./GlossaryBrowser";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://paii.ca";

// Async server component, rendered directly from PageBlocks.tsx (same
// pattern as BlogSection) — fetches server-side so every term is present in
// the initial HTML for SEO, then hands the list to the client component for
// interactive search/A-Z jump nav.
export default async function GlossaryLiveSection({ cmsContent }: { cmsContent: { badge?: string; title?: string } }) {
  const locale = await getLocale();
  let terms: GlossaryTermData[] = [];
  try {
    const res = await fetch(`${API}/glossary/public?lang=${locale}`, { next: { revalidate: 120 } });
    if (res.ok) {
      const json = await res.json();
      terms = json.data ?? json ?? [];
    }
  } catch {
    terms = [];
  }

  if (!terms.length) return null;

  const termSetJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: cmsContent?.title || "AI Glossary",
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
      termCode: t.slug,
      url: `${SITE_URL}/glossary#${t.slug}`,
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termSetJsonLd).replace(/</g, "\\u003c") }}
      />
      {(cmsContent?.badge || cmsContent?.title) && (
        <div className="container-md text-center pt-4">
          {cmsContent.badge?.trim() && <span className="badge-teal mb-4 justify-center">{cmsContent.badge}</span>}
          {cmsContent.title?.trim() && <h2 className="section-title">{cmsContent.title}</h2>}
        </div>
      )}
      <GlossaryBrowser terms={terms} />
    </div>
  );
}
