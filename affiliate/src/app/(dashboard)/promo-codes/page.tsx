"use client";

import { Tag, Calendar, Users, ExternalLink } from "lucide-react";
import { usePromoCodes } from "@/hooks/usePromoCodes";
import { PromoBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import CopyButton from "@/components/ui/CopyButton";
import { formatDate, formatCurrency, buildCheckoutLink } from "@/lib/utils";

export default function PromoCodesPage() {
  const { promoCodes, isLoading } = usePromoCodes();

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      ) : promoCodes.length === 0 ? (
        <EmptyState icon={Tag} title="No promo codes" description="Promo codes assigned to your account will appear here." />
      ) : (
        <div className="space-y-3">
          {promoCodes.map((pc) => {
            const checkoutLink = buildCheckoutLink(pc.code);
            return (
              <div key={pc.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-navy-900 text-base tracking-widest">{pc.code}</span>
                      <PromoBadge status={pc.status} />
                      {pc.is_stackable && (
                        <span className="badge bg-blue-50 text-blue-600">Stackable</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-gold-600">
                        {pc.discount_type === "percent"
                          ? `${pc.discount_value}% off`
                          : `${formatCurrency(pc.discount_value)} off`}
                      </span>
                      {pc.min_order_value && (
                        <span>Min order: {formatCurrency(pc.min_order_value)}</span>
                      )}
                      {pc.max_uses && (
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {pc.uses_count}/{pc.max_uses} uses
                        </span>
                      )}
                      {pc.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Expires {formatDate(pc.expires_at)}
                        </span>
                      )}
                    </div>
                    {pc.description && (
                      <p className="text-xs text-slate-400 pt-0.5">{pc.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <CopyButton text={pc.code} label="Code" size="xs" />
                    <CopyButton text={checkoutLink} label="Link" size="xs" />
                    <a href={checkoutLink} target="_blank" rel="noreferrer"
                      className="btn-ghost !py-1 !px-2 !text-xs flex items-center gap-1">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                {pc.max_uses && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Usage</span>
                      <span>{pc.uses_count} / {pc.max_uses}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (pc.uses_count / pc.max_uses) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
