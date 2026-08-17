// Curated list of languages an admin can enable from the Site Settings
// "Languages" panel — deliberately not free-text, so every enabled language
// has a known display name/native name/direction without relying on the AI
// to invent them. Extending this list is a small code change; it does not
// require a migration since content translations live in a single JSON
// column keyed by locale code, not per-language columns.
export type SupportedLanguage = {
  code: string;
  name: string;
  native_name: string;
  is_rtl: boolean;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: "en", name: "English", native_name: "English", is_rtl: false },
  { code: "ar", name: "Arabic", native_name: "العربية", is_rtl: true },
  { code: "fr", name: "French", native_name: "Français", is_rtl: false },
  { code: "es", name: "Spanish", native_name: "Español", is_rtl: false },
  { code: "de", name: "German", native_name: "Deutsch", is_rtl: false },
  { code: "zh", name: "Chinese (Simplified)", native_name: "简体中文", is_rtl: false },
  { code: "hi", name: "Hindi", native_name: "हिन्दी", is_rtl: false },
  { code: "pt", name: "Portuguese", native_name: "Português", is_rtl: false },
  { code: "ur", name: "Urdu", native_name: "اردو", is_rtl: true },
  { code: "tr", name: "Turkish", native_name: "Türkçe", is_rtl: false },
  { code: "ja", name: "Japanese", native_name: "日本語", is_rtl: false },
  { code: "ko", name: "Korean", native_name: "한국어", is_rtl: false },
  { code: "ru", name: "Russian", native_name: "Русский", is_rtl: false },
  { code: "it", name: "Italian", native_name: "Italiano", is_rtl: false },
  { code: "nl", name: "Dutch", native_name: "Nederlands", is_rtl: false },
  { code: "id", name: "Indonesian", native_name: "Bahasa Indonesia", is_rtl: false },
  { code: "vi", name: "Vietnamese", native_name: "Tiếng Việt", is_rtl: false },
  { code: "fa", name: "Persian", native_name: "فارسی", is_rtl: true },
  { code: "sw", name: "Swahili", native_name: "Kiswahili", is_rtl: false },
  { code: "he", name: "Hebrew", native_name: "עברית", is_rtl: true },
];

export function getSupportedLanguage(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code);
}
