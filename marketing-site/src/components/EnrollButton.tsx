"use client";

import { useState } from "react";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import LoginModal from "@/components/LoginModal";

const LMS = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";

export default function EnrollButton({
  courseId,
  courseSlug,
  title,
  price,
  level,
  className,
}: {
  courseId: string;
  courseSlug: string;
  title: string;
  price: number;
  level?: string;
  className?: string;
}) {
  const { user, hydrated, ssoLink } = useAuth();
  const { addItem, hasItem }   = useCart();
  const [showLogin, setShowLogin] = useState(false);
  const inCart = hasItem(courseId);

  async function handleEnroll() {
    if (!user) { setShowLogin(true); return; }
    // Must await this — redirecting to the student portal (a different
    // origin, so this is a full page unload) before the POST resolves
    // aborts the in-flight request, leaving this button showing "In Cart"
    // for an item that was never actually saved server-side.
    if (!inCart) {
      await addItem({ id: courseId, type: "course", slug: courseSlug, title, price, level });
    }
    window.location.href = ssoLink("/cart");
  }

  const base = className ?? "w-full btn-primary !py-4 !text-base justify-center flex items-center gap-2 mb-3";

  if (!hydrated) {
    return <div className={`${base} opacity-50 pointer-events-none`}><ShoppingCart size={18} />{price === 0 ? "Enroll Free" : "Get Started"}</div>;
  }

  if (inCart) {
    return (
      <button onClick={() => { window.location.href = ssoLink("/cart"); }} className={base}>
        <CheckCircle2 size={18} /> In Cart — View Cart
      </button>
    );
  }

  return (
    <>
      <button onClick={handleEnroll} className={base}>
        <ShoppingCart size={18} />
        {!user
          ? "Sign In to Enroll"
          : price === 0 ? "Enroll Free" : "Add to Cart"}
      </button>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleEnroll} />}
    </>
  );
}
