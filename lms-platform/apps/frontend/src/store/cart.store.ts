"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  type: "course" | "certification";
  slug?: string;           // for certifications
  course_id?: string;      // for courses
  title: string;
  subtitle?: string;
  price: number;
  thumbnail_url?: string;
  level?: string;
  cert_acronym?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  hasItem: (id: string) => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (get().hasItem(item.id)) return;
        set((s) => ({ items: [...s.items, item] }));
      },
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clearCart: () => set({ items: [] }),
      hasItem: (id) => get().items.some((i) => i.id === id),
    }),
    {
      name: "pai-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
