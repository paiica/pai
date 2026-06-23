"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function SSOPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Reading URL params…");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t    = urlParams.get("t");
    const r    = urlParams.get("r");
    const uRaw = urlParams.get("u");

    if (!t) {
      setStatus("❌ No token in URL. Params: " + window.location.search.slice(0, 120));
      return;
    }

    setStatus("✅ Token found (" + t.slice(0, 20) + "…). Writing to storage…");

    let user = null;
    try { if (uRaw) user = JSON.parse(uRaw); } catch {}

    try {
      // Admin app stores auth under "pai-admin-auth"
      localStorage.setItem("pai-admin-auth", JSON.stringify({
        state: { user, accessToken: t, refreshToken: r || null },
        version: 0,
      }));
      setStatus((s) => s + "\n✅ localStorage written.");
    } catch (e: any) {
      setStatus((s) => s + "\n❌ localStorage error: " + e?.message);
    }

    // Patch the already-hydrated in-memory store so client-side nav works
    useAuthStore.setState({
      user,
      accessToken: t,
      refreshToken: r || null,
      _hasHydrated: true,
    });

    setStatus((s) => s + "\n✅ Zustand updated. Redirecting…");
    setReady(true);

    const timer = setTimeout(() => router.replace("/dashboard"), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8">
      <div className="text-center max-w-lg">
        <div className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin mx-auto mb-6" />
        <pre className="text-left text-xs text-white/70 whitespace-pre-wrap bg-white/5 rounded-xl p-4 mb-4">
          {status}
        </pre>
        {ready && (
          <button
            onClick={() => router.replace("/dashboard")}
            className="text-xs text-blue-400 underline mt-2"
          >
            Click here if not redirected automatically
          </button>
        )}
      </div>
    </div>
  );
}
