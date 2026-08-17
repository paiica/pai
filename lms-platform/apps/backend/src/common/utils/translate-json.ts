// Shared helpers for translating nested JSON content fields (PageBlock.content,
// Course.content, Certification.curriculum_overview/faqs_json) without corrupting
// non-text values — hrefs, hex colors, icon keys, ids, numbers, booleans.
// stripNonTranslatable() removes those keys before the value is sent to the AI;
// mergeTranslated() splices the AI's translated string leaves back onto a deep
// copy of the ORIGINAL structure, so anything stripped keeps its English value
// instead of going missing from the translated output.
const NON_TRANSLATABLE_KEY =
  /^(id|key|slug|href|url|link|icon|color|image_url|logo_url|thumbnail_url|preview_video_url|src|type|target|open_new_tab|social_linkedin|social_twitter|social_instagram|social_email|contact_email|mailto|email|enabled|is_visible|is_published|is_featured|sort_order|order|count|percentage|price|amount|duration|weight|height|width|acronym)$/i;

export function hasContent(value: any): boolean {
  if (Array.isArray(value)) return value.length > 0 && value.some(hasContent);
  if (value && typeof value === "object") return Object.keys(value).length > 0 && Object.values(value).some(hasContent);
  if (typeof value === "string") return value.trim().length > 0;
  return false;
}

export function stripNonTranslatable(value: any): any {
  if (Array.isArray(value)) return value.map(stripNonTranslatable);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (NON_TRANSLATABLE_KEY.test(k)) continue;
      out[k] = stripNonTranslatable(v);
    }
    return out;
  }
  return value;
}

export function mergeTranslated(original: any, translated: any): any {
  if (Array.isArray(original)) {
    return original.map((item, i) => mergeTranslated(item, Array.isArray(translated) ? translated[i] : undefined));
  }
  if (original && typeof original === "object") {
    const out: Record<string, any> = { ...original };
    for (const [k, v] of Object.entries(original)) {
      if (NON_TRANSLATABLE_KEY.test(k)) continue;
      if (translated && typeof translated === "object" && k in translated) {
        out[k] = mergeTranslated(v, translated[k]);
      }
    }
    return out;
  }
  return typeof translated === "string" && translated.trim() ? translated : original;
}
