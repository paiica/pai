"use client";

import { create } from "zustand";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const STORAGE_KEY = "paii_currency";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  is_default: boolean;
  fx_rate: string | number;
}

interface CurrencyState {
  currencies: Currency[];
  currency: string;
  loaded: boolean;
  init: () => Promise<void>;
  setCurrency: (code: string) => void;
}

// Checked in this order: an explicit past choice (localStorage) always wins;
// otherwise fall back to whatever the geo-IP middleware set on the cookie
// for a first-time visitor (see middleware.ts — Canada defaults to CAD).
function readStoredCurrency(): string | null {
  if (typeof window === "undefined") return null;
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) return fromStorage;
  const match = document.cookie.match(/(?:^|;\s*)paii_currency=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Single source of truth for the student portal's selected currency — read
// by every page that shows a price (certificates, tools, cart) and by the
// TopBar switcher, so there's one value instead of each page guessing its
// own. Converted prices shown off this are always an estimate; checkout
// still resolves authoritatively server-side (CurrencyService.resolveForCheckout).
export const useCurrencyStore = create<CurrencyState>()((set, get) => ({
  currencies: [],
  currency: "USD",
  loaded: false,

  init: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch(`${API_BASE}/currencies`);
      const data = await res.json();
      const list: Currency[] = data?.data ?? data ?? [];
      const stored = readStoredCurrency();
      const resolved = stored && list.some((c) => c.code === stored)
        ? stored
        : (list.find((c) => c.is_default)?.code ?? "USD");
      set({ currencies: list, currency: resolved, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  setCurrency: (code) => {
    localStorage.setItem(STORAGE_KEY, code);
    document.cookie = `${STORAGE_KEY}=${code}; path=/; max-age=31536000`;
    set({ currency: code });
  },
}));
