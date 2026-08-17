// Locales this app has a messages/{locale}.json UI-chrome catalog for.
// A content-only language enabled in Site Settings (e.g. a language with no
// UI translations yet) shouldn't appear in the switcher even though its CMS
// content is already translated — see marketing-site's routing.ts for the
// equivalent list on that app.
export const UI_SUPPORTED_LOCALES = ["en", "ar", "fr"] as const;
export type UiLocale = (typeof UI_SUPPORTED_LOCALES)[number];

export function resolveLocale(value: string | undefined | null): UiLocale {
  return (UI_SUPPORTED_LOCALES as readonly string[]).includes(value ?? "")
    ? (value as UiLocale)
    : "en";
}
