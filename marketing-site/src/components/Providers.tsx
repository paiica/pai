"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import LocaleSync from "@/components/LocaleSync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <LocaleSync />
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
