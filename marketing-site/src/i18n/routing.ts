import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar", "fr"],
  defaultLocale: "en",
  // Keep English URLs unprefixed (bare paths) for continuity with every
  // existing external link/bookmark/SEO signal pointing at this site today;
  // every other locale gets an explicit prefix. Adding a locale here (plus
  // its messages/{locale}.json) is the one-time "build this language's UI
  // chrome" step — the content itself (Pages/Courses/Certifications/etc.)
  // is already dynamically translatable for any locale via Site Settings →
  // Languages, independent of this list.
  localePrefix: {
    mode: "as-needed",
    prefixes: { ar: "/ar", fr: "/fr" },
  },
});

export type Locale = (typeof routing.locales)[number];
