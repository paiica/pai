"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type NavCertification = {
  id: string;
  slug: string;
  acronym: string;
  title: string;
  level: "pre_certificate" | "foundation" | "advanced" | "executive" | "specialist" | "other";
  status: "active" | "coming_soon";
};

type CategoryKey = "foundational" | "advanced" | "specialized" | "executive" | "other";

// pre_certificate folds into "Foundational" — both are entry-tier, and the
// user's requested category set only names five columns, not six.
const LEVEL_TO_CATEGORY: Record<NavCertification["level"], CategoryKey> = {
  pre_certificate: "foundational",
  foundation: "foundational",
  advanced: "advanced",
  specialist: "specialized",
  executive: "executive",
  other: "other",
};

const CATEGORY_ORDER: CategoryKey[] = ["foundational", "advanced", "specialized", "executive", "other"];

const CATEGORY_LABEL_KEYS: Record<CategoryKey, string> = {
  foundational: "certFoundational",
  advanced: "certAdvanced",
  specialized: "certSpecialized",
  executive: "certExecutive",
  other: "certOther",
};

export type CertCategoryGroup = { key: CategoryKey; labelKey: string; certs: NavCertification[] };

// Only categories that actually have a certification in them are returned —
// an empty "Executive" column just because the label exists would be noise,
// not useful navigation. New certifications automatically land in the right
// column as soon as their `level` is set, no menu code changes needed.
export function groupCertificationsByCategory(certifications: NavCertification[]): CertCategoryGroup[] {
  const groups: Record<CategoryKey, NavCertification[]> = {
    foundational: [], advanced: [], specialized: [], executive: [], other: [],
  };
  for (const cert of certifications) {
    groups[LEVEL_TO_CATEGORY[cert.level]].push(cert);
  }
  return CATEGORY_ORDER
    .map((key) => ({ key, labelKey: CATEGORY_LABEL_KEYS[key], certs: groups[key] }))
    .filter((group) => group.certs.length > 0);
}

export type ResourceLink = { id: string; label: string; href: string; open_new_tab: boolean };

export default function CertificationsMegaMenu({
  categories, resourceLinks, onNavigate,
}: {
  categories: CertCategoryGroup[];
  resourceLinks: ResourceLink[];
  onNavigate?: () => void;
}) {
  const t = useTranslations("Common");
  const columns = Math.min(categories.length, 3);

  return (
    <div className="flex">
      <div
        className={cn("grid gap-x-7 gap-y-5 p-5", columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3")}
        style={{ width: Math.max(columns, 1) * 190 }}
      >
        {categories.map((group) => (
          <div key={group.key}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">{t(group.labelKey)}</p>
            <div className="space-y-0.5">
              {group.certs.map((cert) => (
                <Link
                  key={cert.id}
                  href={`/certifications/${cert.slug}`}
                  onClick={onNavigate}
                  className="flex items-center gap-1.5 px-2 py-1.5 -mx-2 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  <span className="text-[13px] font-semibold text-ink-900 leading-snug">{cert.title}</span>
                  {cert.status === "coming_soon" && (
                    <span className="flex-shrink-0 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500 text-white">
                      {t("comingSoon")}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {resourceLinks.length > 0 && (
        <div className="p-5 w-60 flex-shrink-0 bg-sand-50/70">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">{t("certResources")}</p>
          <div className="space-y-0.5">
            {resourceLinks.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                target={link.open_new_tab ? "_blank" : undefined}
                rel={link.open_new_tab ? "noopener noreferrer" : undefined}
                onClick={onNavigate}
                className="block px-2 py-1.5 -mx-2 rounded-lg text-[12.5px] font-medium text-ink-900/75 hover:bg-white hover:text-ink-900 transition-colors leading-snug"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
