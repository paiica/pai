// Shared helper for every public endpoint serving translatable CMS/marketing
// content (Page, BlogPost, NavItem, PageBlock, Certification, Course).
// Each model has a single `translations` JSON column shaped
// { [locale]: { [field]: value } } — this overlays that locale's fields onto
// the English ones when a real (non-empty) translation exists, silently
// falling back to English field-by-field otherwise so a partially-translated
// row never shows a blank value. Works for any locale, not just Arabic, and
// needs no schema change when a new language is added.
function hasContent(value: any): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return !!(value && String(value).trim());
}

export function localize<T extends Record<string, any>>(row: T, locale: string | undefined, fields: string[]): T {
  if (!locale || locale === "en") return row;
  const translated = (row as any).translations?.[locale];
  if (!translated) return row;
  const result: any = { ...row };
  for (const field of fields) {
    const value = translated[field];
    if (hasContent(value)) result[field] = value;
  }
  return result;
}

export function localizeMany<T extends Record<string, any>>(rows: T[], locale: string | undefined, fields: string[]): T[] {
  return rows.map((r) => localize(r, locale, fields));
}
