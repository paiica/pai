"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export type CartItem = {
  id: string;
  type: "course" | "certification";
  slug: string;
  title: string;
  price: number;
  level?: string;
};

type AddableItem = {
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
  addItem: (item: AddableItem) => void;
  hasItem: (id: string) => boolean;
};

const CartContext = createContext<CartContextType>({
  items: [], count: 0, addItem: () => {}, hasItem: () => false,
});

function toLocalItem(i: any): CartItem {
  return {
    id: i.type === "course" ? i.course_id : i.certification_id,
    type: i.type,
    slug: i.slug,
    title: i.title,
    price: i.price,
    level: i.level,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Cart is persisted server-side against the logged-in account (not
  // localStorage) so it's shared between this app and the student portal,
  // which run on separate origins. Signing out clears the local view —
  // signing back in re-fetches whatever's actually in the account's cart.
  const { accessToken } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);

  const fetchCart = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const data = json?.data ?? json;
      setItems(Array.isArray(data) ? data.map(toLocalItem) : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (accessToken) fetchCart(accessToken);
    else setItems([]);
  }, [accessToken, fetchCart]);

  const addItem = useCallback((item: AddableItem) => {
    if (!accessToken) return;
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
    fetch(`${API}/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(
        item.type === "course"
          ? { type: "course", course_id: item.id }
          : { type: "certification", certification_id: item.id },
      ),
    })
      .then(async (res) => {
        const json = await res.json();
        const data = json?.data ?? json;
        if (Array.isArray(data)) setItems(data.map(toLocalItem));
      })
      .catch(() => {});
  }, [accessToken]);

  const hasItem = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return (
    <CartContext.Provider value={{ items, count: items.length, addItem, hasItem }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
