"use client";

import { useState } from "react";
import { ExternalLink, QrCode, Link2, Tag, BookOpen, Award } from "lucide-react";
import Image from "next/image";
import { useProducts } from "@/hooks/useProducts";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import CopyButton from "@/components/ui/CopyButton";
import { formatCurrency, getQRCodeUrl } from "@/lib/utils";
import type { AffiliateProduct } from "@/types";

const MARKETING_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca"
    : process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";

function fullReferralUrl(product: AffiliateProduct) {
  return `${MARKETING_URL}${product.referral_url}`;
}

function ProductModal({ product, onClose }: { product: AffiliateProduct; onClose: () => void }) {
  const referralLink = fullReferralUrl(product);
  const qrUrl = getQRCodeUrl(referralLink);

  return (
    <Modal open onClose={onClose} title={product.title} size="md">
      <div className="space-y-5">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            product.type === "certification" ? "bg-navy-100" : "bg-blue-50"
          }`}>
            {product.type === "certification"
              ? <Award size={20} className="text-navy-700" />
              : <BookOpen size={20} className="text-blue-700" />}
          </div>
          <div>
            <p className="font-semibold text-slate-800 leading-tight">{product.title}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatCurrency(product.price)} · {product.commission_rate}% commission
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Your Referral Link</p>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-600 flex-1 truncate font-mono">{referralLink}</p>
            <CopyButton text={referralLink} label="Copy" size="xs" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider self-start">QR Code</p>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <Image src={qrUrl} alt="QR Code" width={160} height={160} unoptimized />
          </div>
          <a href={qrUrl} download={`${product.slug}-qr.png`} className="btn-outline !py-1.5 !px-3 !text-xs">
            Download QR
          </a>
        </div>

        <a href={referralLink} target="_blank" rel="noreferrer"
          className="btn-outline w-full flex items-center justify-center gap-2">
          <ExternalLink size={14} />
          View Product Page
        </a>
      </div>
    </Modal>
  );
}

function ProductCard({ product, onOpen }: { product: AffiliateProduct; onOpen: () => void }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          product.type === "certification" ? "bg-navy-50" : "bg-blue-50"
        }`}>
          {product.type === "certification"
            ? <Award size={18} className="text-navy-700" />
            : <BookOpen size={18} className="text-blue-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
            product.type === "certification" ? "bg-navy-100 text-navy-700" : "bg-blue-50 text-blue-700"
          }`}>
            {product.type === "certification" ? "Certification" : "Prep Course"}
          </span>
          <p className="font-semibold text-slate-800 leading-tight mt-1">{product.title}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-slate-400 mb-0.5">Price</p>
          <p className="font-bold text-slate-800">{formatCurrency(product.price)}</p>
        </div>
        <div className="flex-1 bg-gold-50 rounded-lg p-2.5 text-center">
          <p className="text-xs text-gold-600 mb-0.5">Your Commission</p>
          <p className="font-bold text-gold-700">{product.commission_rate}%</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onOpen} className="btn-primary flex-1 flex items-center justify-center gap-2 !py-2 !text-sm">
          <Link2 size={14} />
          Get Links
        </button>
        <button onClick={onOpen} className="btn-outline !py-2 !px-3">
          <QrCode size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { products, isLoading } = useProducts();
  const [selected, setSelected] = useState<AffiliateProduct | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-gold-50 border border-gold-200 rounded-xl">
        <Tag size={16} className="text-gold-600 shrink-0" />
        <p className="text-sm text-gold-800">
          Each product card contains your unique referral links and QR codes. Share them to earn commissions on every sale.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState icon={Tag} title="No products available" description="Certifications and courses will appear here once they are assigned to your account." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <ProductCard key={p.assignment_id} product={p} onOpen={() => setSelected(p)} />
          ))}
        </div>
      )}

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
