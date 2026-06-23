"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Award, Shield, Download, ShoppingCart, CheckCircle,
  ArrowRight, Clock, BookOpen, ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const API_BASE    = process.env.NEXT_PUBLIC_API_URL    || "http://localhost:4000/api/v1";
const MARKETING   = process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:3000";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r) => r.data ?? r);
}

function publicFetcher(url: string) {
  return fetch(`${API_BASE}${url}`).then((r) => r.json()).then((r) => r.data ?? r);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-CA", { dateStyle: "long" });
}

const LEVEL_COLOR: Record<string, string> = {
  foundational: "bg-emerald-50 text-emerald-700",
  professional: "bg-blue-50 text-blue-700",
  expert: "bg-purple-50 text-purple-700",
};

const CARD_GRADIENTS = [
  "from-[#d4c5f0] to-[#b8a5d8]", "from-[#c5e0f0] to-[#a5c5e0]",
  "from-[#f0e8c5] to-[#d8cba5]", "from-[#c5f0e0] to-[#a5d8c5]",
];

function CertCatalogCard({ cert, index, enrolled }: { cert: any; index: number; enrolled: boolean }) {
  const { addItem, hasItem } = useCartStore();
  const inCart = hasItem(cert.id);
  const price = Number(cert.price);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("relative h-28 bg-gradient-to-br overflow-hidden", CARD_GRADIENTS[index % CARD_GRADIENTS.length])}>
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice">
          <circle cx="240" cy="30" r="90" fill="white" opacity="0.5" />
        </svg>
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-center gap-2">
            {cert.badge_icon && <span className="text-2xl">{cert.badge_icon}</span>}
            <span className="text-xl font-black text-white drop-shadow">{cert.acronym}</span>
          </div>
        </div>
        {enrolled && (
          <div className="absolute top-3 right-3">
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle size={9} /> Enrolled
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {cert.level && (
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", LEVEL_COLOR[cert.level] ?? "bg-slate-100 text-slate-600")}>
              {cert.level}
            </span>
          )}
          {cert.duration_weeks && (
            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
              <Clock size={9} /> {cert.duration_weeks} weeks
            </span>
          )}
        </div>

        <h3 className="font-display font-bold text-navy-900 text-sm leading-snug mb-1">{cert.title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed flex-1 mb-3 line-clamp-2">{cert.description}</p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <span className="font-black text-navy-900">
            {price === 0 ? "Free" : `$${price.toFixed(2)}`}
          </span>
          {enrolled ? (
            <Link href="/learn" className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
              Continue <ArrowRight size={11} />
            </Link>
          ) : (
            <div className="flex items-center gap-1.5">
              {!inCart ? (
                <button
                  onClick={() => { addItem({ id: cert.id, type: "certification", slug: cert.slug, title: cert.title, price, cert_acronym: cert.acronym }); toast.success("Added to cart"); }}
                  className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-navy-700 hover:border-navy-300 transition-colors"
                  title="Add to cart"
                >
                  <ShoppingCart size={12} />
                </button>
              ) : (
                <Link href="/cart" className="p-1.5 border border-navy-200 rounded-lg text-navy-600 hover:text-navy-800 transition-colors" title="View cart">
                  <ShoppingCart size={12} />
                </Link>
              )}
              <Link
                href={`${MARKETING}/certifications/${cert.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 bg-navy-900 hover:bg-navy-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              >
                View Details <ExternalLink size={10} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const token = useAuthStore((s) => s.accessToken)!;
  const { items } = useCartStore();

  const { data: certsRaw } = useSWR(
    token ? ["/certificates/my", token] : null,
    ([url, t]) => fetcher(url, t)
  );
  const { data: catalogRaw } = useSWR("/courses", publicFetcher);
  const { data: enrollmentsRaw } = useSWR(
    token ? ["/enrollments/my", token] : null,
    ([url, t]) => fetcher(url, t)
  );

  const certificates: any[] = Array.isArray(certsRaw) ? certsRaw : (certsRaw?.data ?? []);
  const catalog: any[] = Array.isArray(catalogRaw) ? catalogRaw : [];
  const enrollments: any[] = Array.isArray(enrollmentsRaw) ? enrollmentsRaw : (enrollmentsRaw?.data ?? []);
  const enrolledCertIds = new Set(enrollments.filter((e: any) => e.status === "active" || e.status === "completed").map((e: any) => e.certification_id));

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ── Earned Certificates ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-display font-black text-navy-900 mb-0.5">My Certificates</h1>
              <p className="text-slate-500 text-sm">Your earned PAI credentials.</p>
            </div>
          </div>

          {certificates.length === 0 ? (
            <div className="card p-10 text-center">
              <Award size={32} className="text-slate-200 mx-auto mb-3" />
              <h3 className="font-display font-bold text-navy-900 mb-1">No certificates yet</h3>
              <p className="text-slate-400 text-sm">Complete a certification program and pass the exam to earn your credential.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map((cert: any) => (
                <div key={cert.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <Award size={22} className="text-white" />
                      </div>
                      <div>
                        <div className="font-display font-black text-gold-600 text-base">{cert.certification_acronym}</div>
                        <div className="font-semibold text-navy-900 text-sm">{cert.certification_title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {cert.certificate_number} · Issued {formatDate(cert.issued_at)}</div>
                      </div>
                    </div>
                    <span className={cn("badge text-xs", cert.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                      {cert.status}
                    </span>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
                    {cert.status === "revoked" ? (
                      <p className="text-xs text-red-600 flex-1">This certificate has been revoked and is no longer valid.</p>
                    ) : (
                      <>
                        <div className="text-xs text-slate-400 flex-1">Valid until: <span className="font-semibold text-slate-700">{formatDate(cert.expires_at)}</span></div>
                        <Link
                          href={`/certificates/${cert.certification_id}`}
                          className="btn-primary !py-1 !px-3 !text-xs"
                        >
                          <Award size={11} /> View Certificate
                        </Link>
                        <Link href={cert.verification_url || `/verify?id=${cert.certificate_number}`} target="_blank" className="btn-outline !py-1 !px-3 !text-xs">
                          <Shield size={11} /> Verify
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Certification Catalog ── */}
        <section>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-display font-black text-navy-900 mb-0.5">Available Certifications</h2>
              <p className="text-slate-500 text-sm">Enroll in a PAI certification program to start your AI career.</p>
            </div>
            {items.length > 0 && (
              <Link href="/cart" className="inline-flex items-center gap-2 bg-navy-900 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-navy-700 transition-colors">
                <ShoppingCart size={13} /> Cart ({items.length})
              </Link>
            )}
          </div>

          {catalog.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <BookOpen size={32} className="mx-auto mb-3 text-slate-200" />
              No certifications available
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalog.map((cert: any, i: number) => (
                <CertCatalogCard
                  key={cert.id}
                  cert={cert}
                  index={i}
                  enrolled={enrolledCertIds.has(cert.id)}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
