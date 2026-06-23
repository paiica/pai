"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const CART_KEY = "pai-cart";

export type CartItem = {
  id: string;
  type: "course" | "certification";
  slug: string;
  title: string;
  price: number;
  level?: string;
};

type CartContextType = {
  items: CartItem[];
  count: number;
  addItem: (item: CartItem) => void;
  hasItem: (id: string) => boolean;
};

const CartContext = createContext<CartContextType>({
  items: [], count: 0, addItem: () => {}, hasItem: () => false,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const state  = parsed.state ?? parsed;
        setItems(Array.isArray(state.items) ? state.items : []);
      }
    } catch {}
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      const next = [...prev, item];
      localStorage.setItem(CART_KEY, JSON.stringify({ state: { items: next }, version: 0 }));
      return next;
    });
  }, []);

  const hasItem = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return (
    <CartContext.Provider value={{ items, count: items.length, addItem, hasItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
