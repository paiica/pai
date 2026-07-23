"use client";

import { create } from "zustand";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

export interface CartItem {
  id: string;               // course/certification id — kept as the primary key for back-compat with hasItem()/removeItem(item.id) call sites
  type: "course" | "certification";
  slug?: string;
  course_id?: string;
  certification_id?: string;
  title: string;
  subtitle?: string;
  price: number;
  thumbnail_url?: string;
  level?: string;
  cert_acronym?: string;
  _cartItemId?: string;     // backend cart row id — used internally to call the delete endpoint
}

interface CartState {
  items: CartItem[];
  fetchCart: () => Promise<void>;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  clearLocal: () => void;
  hasItem: (id: string) => boolean;
  updateItemPrice: (id: string, price: number) => void;
}

function fromApi(i: any): CartItem {
  return {
    id: i.type === "course" ? i.course_id : i.certification_id,
    type: i.type,
    slug: i.slug,
    course_id: i.course_id,
    certification_id: i.certification_id,
    title: i.title,
    subtitle: i.subtitle,
    price: i.price,
    thumbnail_url: i.thumbnail_url,
    level: i.level,
    cert_acronym: i.cert_acronym,
    _cartItemId: i.id,
  };
}

// Cart is persisted server-side against the logged-in account (not
// localStorage), so it's shared with the marketing site, which runs on a
// separate origin and adds to the same account cart via the same API.
export const useCartStore = create<CartState>()((set, get) => ({
  items: [],

  fetchCart: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) { set({ items: [] }); return; }
    try {
      const res = await api.get<{ data: any[] }>("/cart", token);
      set({ items: (res.data ?? []).map(fromApi) });
    } catch {
      /* leave whatever's currently loaded — a transient fetch failure
         shouldn't blank out the cart the user can already see */
    }
  },

  addItem: (item) => {
    const token = useAuthStore.getState().accessToken;
    if (!token || get().hasItem(item.id)) return;
    set((s) => ({ items: [...s.items, item] })); // optimistic
    api
      .post<{ data: any[] }>(
        "/cart/items",
        item.type === "course"
          ? { type: "course", course_id: item.course_id ?? item.id }
          : { type: "certification", certification_id: item.certification_id ?? item.id },
        token,
      )
      .then((res) => set({ items: (res.data ?? []).map(fromApi) }))
      .catch(() => set((s) => ({ items: s.items.filter((i) => i.id !== item.id) }))); // rollback
  },

  removeItem: (id) => {
    const token = useAuthStore.getState().accessToken;
    const target = get().items.find((i) => i.id === id);
    if (!token || !target?._cartItemId) return;
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) }); // optimistic
    api
      .delete<{ data: any[] }>(`/cart/items/${target._cartItemId}`, token)
      .then((res) => set({ items: (res.data ?? []).map(fromApi) }))
      .catch(() => set({ items: prev })); // rollback
  },

  clearCart: () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const prev = get().items;
    set({ items: [] }); // optimistic
    api.delete("/cart", token).catch(() => set({ items: prev }));
  },

  clearLocal: () => set({ items: [] }),

  hasItem: (id) => get().items.some((i) => i.id === id),

  updateItemPrice: (id, price) =>
    set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, price } : i)) })),
}));

// Keep the cart in sync with login/logout: fetch the account's real cart
// once a token appears (login, or hydrating an existing session), and clear
// the local view when it disappears (logout) — the backend cart itself is
// untouched, so signing back in re-fetches it correctly.
if (typeof window !== "undefined") {
  let lastToken = useAuthStore.getState().accessToken;
  useAuthStore.subscribe((state) => {
    if (state.accessToken === lastToken) return;
    lastToken = state.accessToken;
    if (state.accessToken) useCartStore.getState().fetchCart();
    else useCartStore.getState().clearLocal();
  });
  if (lastToken) useCartStore.getState().fetchCart();
}
