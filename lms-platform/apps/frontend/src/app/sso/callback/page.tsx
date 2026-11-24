"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export default function SsoCallbackPage() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("ticket");
    if (!ticket) {
      router.replace("/login");
      return;
    }

    api
      .post<any>("/auth/sso/exchange", { ticket })
      .then((res) => {
        const body = res?.data ?? res;
        const { user, access_token, refresh_token } = body;
        useAuthStore.setState({
          user,
          accessToken: access_token,
          refreshToken: refresh_token,
          _hasHydrated: true,
        });
        router.replace("/dashboard");
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t("genericError"));
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 px-4">
      {error ? (
        <div className="text-center">
          <p className="text-white text-sm mb-4">{error}</p>
          <a href="/login" className="text-gold-400 text-sm font-semibold underline underline-offset-2">
            {t("submit")}
          </a>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
      )}
    </div>
  );
}
