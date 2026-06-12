export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: "Professional AI Institute",
          alternateName: "PAI",
          url: "https://professionalaiinstitute.com",
          logo: "https://professionalaiinstitute.com/logo.png",
          description:
            "The leading professional certification body for AI skills. Earn industry-recognized AI credentials for business professionals.",
          foundingDate: "2024",
          address: {
            "@type": "PostalAddress",
            addressCountry: "US",
          },
          contactPoint: {
            "@type": "ContactPoint",
            email: "info@professionalaiinstitute.com",
            contactType: "customer service",
          },
          sameAs: [
            "https://linkedin.com/company/professional-ai-institute",
            "https://twitter.com/PAICertified",
          ],
        }),
      }}
    />
  );
}

export function CertificationJsonLd({
  name,
  description,
  price,
  url,
}: {
  name: string;
  description: string;
  price: number;
  url: string;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          name,
          description,
          provider: {
            "@type": "Organization",
            name: "Professional AI Institute",
            sameAs: "https://professionalaiinstitute.com",
          },
          url,
          offers: {
            "@type": "Offer",
            price: price.toString(),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
          educationalLevel: "Professional",
          teaches: "Artificial Intelligence for Business Professionals",
        }),
      }}
    />
  );
}
