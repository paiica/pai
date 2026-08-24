"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { buildDocumentBody, DOCUMENT_STYLES, type OrderDocumentData } from "../_document";

export default function ReceiptPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.accessToken) ?? "";

  const { data, isLoading, error } = useSWR(
    token && id ? [`/payments/orders/${id}`, token] : null,
    ([url, tok]) => api.get<any>(url, tok).then((r) => (r?.data ?? r) as OrderDocumentData),
  );

  function handleDownload() {
    if (!data) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt ${data.receipt_number}</title><style>${DOCUMENT_STYLES}</style></head><body style="margin:0;padding:48px;background:#f8fafc;">${buildDocumentBody(data, "receipt")}</body></html>`);
    win.document.close();
    const doPrint = () => setTimeout(() => { win.focus(); win.print(); }, 300);
    if (win.document.readyState === "complete") doPrint();
    else win.addEventListener("load", doPrint);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <style dangerouslySetInnerHTML={{ __html: DOCUMENT_STYLES }} />
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back
        </button>
        {data && (
          <button onClick={handleDownload} className="btn-primary !text-sm !py-2 flex items-center gap-1.5">
            <Download size={14} /> Download PDF
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : error || !data ? (
        <div className="text-center py-24 text-slate-400 text-sm">Could not load this receipt.</div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-8">
          <div dangerouslySetInnerHTML={{ __html: buildDocumentBody(data, "receipt") }} />
        </div>
      )}
    </div>
  );
}
