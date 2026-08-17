import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { resolveLocale } from "./locales";

// No URL-prefixed routing here on purpose — this app is private/authenticated
// with no SEO benefit, so locale is resolved from a NEXT_LOCALE cookie set by
// the language switcher rather than restructuring routes under a [locale]
// segment (see marketing-site for the URL-prefixed variant of this setup).
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("NEXT_LOCALE")?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
