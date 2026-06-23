"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function SSOPage() {
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t    = urlParams.get("t");
    const r    = urlParams.get("r");
    const uRaw = urlParams.get("u");
    const next = urlParams.get("next") || "/dashboard";

    if (t) {
      let user = null;
      try { if (uRaw) user = JSON.parse(decodeURIComponent(uRaw)); } catch {}

      localStorage.setItem("pai-auth", JSON.stringify({
        state: { user, accessToken: t, refreshToken: r || null },
        version: 0,
      }));

      useAuthStore.setState({
        user,
        accessToken: t,
        refreshToken: r || null,
        _hasHydrated: true,
      });

      router.replace(next);
    } else {
      // No token — send to login
      router.replace("/login");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
    </div>
  );
}
