"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { PieChart, Save, Loader2, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

interface Split { institution_percentage: number; professor_percentage: number; paii_percentage: number; }
interface Rule extends Split { id: string; institution_id: string | null; course_id: string | null; institution?: { name: string } | null; course?: { title: string } | null; }
interface Transaction {
  id: string; sale_amount: string; institution_amount: string; professor_amount: string; paii_amount: string;
  institution_status: "pending" | "paid" | "voided"; professor_status: "pending" | "paid" | "voided";
  course: { title: string }; institution: { name: string }; professor: { email: string; profile: { first_name: string | null; last_name: string | null } | null } | null;
  created_at: string;
}

function fmtMoney(v: string | number) {
  return `$${Number(v).toFixed(2)}`;
}

export default function RevenuePage() {
  const { accessToken } = useAuthStore();

  const { data: defaultSplit, mutate: mutateDefault } = useSWR(
    accessToken ? ["/admin/revenue/default-split", accessToken] : null,
    ([url, t]) => api.get<Split>(url, t),
  );
  const { data: rulesRaw, mutate: mutateRules } = useSWR(
    accessToken ? ["/admin/revenue/rules", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r),
  );
  const rules: Rule[] = Array.isArray(rulesRaw) ? rulesRaw : [];

  const { data: txRaw, mutate: mutateTx } = useSWR(
    accessToken ? ["/admin/revenue/transactions", accessToken] : null,
    ([url, t]) => api.get<any>(url, t).then((r) => r.data ?? r),
  );
  const transactions: Transaction[] = Array.isArray(txRaw) ? txRaw : [];

  const [form, setForm] = useState({ institution_percentage: "0", professor_percentage: "0", paii_percentage: "100" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultSplit) {
      setForm({
        institution_percentage: String(defaultSplit.institution_percentage),
        professor_percentage: String(defaultSplit.professor_percentage),
        paii_percentage: String(defaultSplit.paii_percentage),
      });
    }
  }, [defaultSplit]);

  async function saveDefault() {
    setSaving(true);
    try {
      await api.post("/admin/revenue/default-split", {
        institution_percentage: Number(form.institution_percentage),
        professor_percentage: Number(form.professor_percentage),
        paii_percentage: Number(form.paii_percentage),
      }, accessToken!);
      toast.success("Default split saved");
      mutateDefault();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save — percentages must sum to 100");
    } finally { setSaving(false); }
  }

  async function deleteRule(id: string) {
    if (!confirm("Remove this override? It'll fall back to the next rule in resolution order.")) return;
    try {
      await api.delete(`/admin/revenue/rules/${id}`, accessToken!);
      toast.success("Override removed");
      mutateRules();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to remove");
    }
  }

  async function markPaid(txId: string, party: "institution" | "professor") {
    try {
      await api.post(`/admin/revenue/transactions/${txId}/mark-paid`, { party }, accessToken!);
      toast.success(`Marked ${party} share as paid`);
      mutateTx();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-display font-black text-navy-900">Revenue Sharing</h1>
        <p className="text-slate-500 text-sm mt-0.5">Split proceeds from institution-attributed public course sales</p>
      </div>

      <div className="card p-5 max-w-xl">
        <p className="font-semibold text-navy-900 text-sm mb-1">Global Default Split</p>
        <p className="text-xs text-slate-400 mb-4">Applied when neither an institution nor a course has its own override. Must sum to 100.</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Institution %</label>
            <input type="number" min={0} max={100} value={form.institution_percentage} onChange={(e) => setForm((p) => ({ ...p, institution_percentage: e.target.value }))} className="input-base text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Professor %</label>
            <input type="number" min={0} max={100} value={form.professor_percentage} onChange={(e) => setForm((p) => ({ ...p, professor_percentage: e.target.value }))} className="input-base text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">PAII %</label>
            <input type="number" min={0} max={100} value={form.paii_percentage} onChange={(e) => setForm((p) => ({ ...p, paii_percentage: e.target.value }))} className="input-base text-sm" />
          </div>
        </div>
        <button onClick={saveDefault} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60 flex items-center gap-1.5">
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
        </button>
      </div>

      <div>
        <p className="font-semibold text-navy-900 text-sm mb-3">Overrides</p>
        {rules.length === 0 ? (
          <p className="text-sm text-slate-400">No institution- or course-specific overrides yet.</p>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Scope</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Institution %</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Professor %</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">PAII %</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-navy-900 font-semibold">{r.institution ? `Institution: ${r.institution.name}` : r.course ? `Course: ${r.course.title}` : "—"}</td>
                    <td className="px-4 py-3">{r.institution_percentage}%</td>
                    <td className="px-4 py-3">{r.professor_percentage}%</td>
                    <td className="px-4 py-3">{r.paii_percentage}%</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteRule(r.id)} className="text-slate-300 hover:text-red-500 ml-auto block"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="font-semibold text-navy-900 text-sm mb-3">Transactions</p>
        {transactions.length === 0 ? (
          <div className="card p-12 text-center">
            <PieChart size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">No institution course sales yet</p>
          </div>
        ) : (
          <div className="card overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Course</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Sale</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Institution Share</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Professor Share</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">PAII</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-3 text-navy-900 font-semibold">{tx.course.title}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.institution.name}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtMoney(tx.sale_amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {fmtMoney(tx.institution_amount)}
                        {tx.institution_status === "paid" ? (
                          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check size={9} /> Paid</span>
                        ) : (
                          <button onClick={() => markPaid(tx.id, "institution")} className="text-[10px] font-semibold text-navy-600 hover:text-navy-800">Mark Paid</button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {fmtMoney(tx.professor_amount)}
                        {tx.professor_status === "paid" ? (
                          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Check size={9} /> Paid</span>
                        ) : (
                          <button onClick={() => markPaid(tx.id, "professor")} className="text-[10px] font-semibold text-navy-600 hover:text-navy-800">Mark Paid</button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtMoney(tx.paii_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
