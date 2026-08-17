"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/auth-context";

const SESSION_FLAG = "pai-locale-synced";

// One-time cross-app continuity: a student who picked Arabic in the student
// portal (persisted to Profile.language) lands here already authenticated
// via the SSO handoff, which carries their full profile — including
// language — through the existing `u` param, no separate sync payload
// needed. Redirect once to match; guarded by a sessionStorage flag so it
// never fights a manual language switch made later in the same session.
export default function LocaleSync() {
  const { user, hydrated } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !user) return;
    if (typeof window === "undefined" || sessionStorage.getItem(SESSION_FLAG)) return;

    const preferred = user.profile?.language;
    const target = preferred === "ar" ? "ar" : preferred === "en" ? "en" : null;
    if (!target || target === locale) return;

    sessionStorage.setItem(SESSION_FLAG, "1");
    router.replace(pathname, { locale: target });
  }, [hydrated, user, locale, pathname, router]);

  return null;
}
