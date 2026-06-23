"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export default function LogoutPage() {
  useEffect(() => {
    localStorage.removeItem("pai-auth");
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      _hasHydrated: true,
    });

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/";
    window.location.replace(next);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
    </div>
  );
}
