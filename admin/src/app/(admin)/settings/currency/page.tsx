"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  DollarSign, Loader2, Plus, Trash2, Star, RefreshCw, Check, X, Search, Tag,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

interface Currency {
  id: string; code: string; symbol: string; name: string;
  is_active: boolean; is_default: boolean;
  fx_rate: string | number; fx_rate_source: string; fx_rate_updated_at: string | null;
}

// ── Currencies section ──────────────────────────────────────────────────────────

function CurrenciesSection() {
  const { accessToken } = useAuthStore();
  const { data: currencies, mutate, isLoading } = useSWR<Currency[]>(
    accessToken ? ["/admin/currencies", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t),
  );

  const [showAdd, setShowAdd] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState("");

  async function addCurrency() {
    if (!newCode.trim() || !newSymbol.trim() || !newName.trim()) { toast.error("Code, symbol, and name are required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/currencies", { code: newCode.trim(), symbol: newSymbol.trim(), name: newName.trim(), fx_rate: newRate ? Number(newRate) : undefined }, accessToken!);
      toast.success(`${newCode.toUpperCase()} added`);
      setShowAdd(false); setNewCode(""); setNewSymbol(""); setNewName(""); setNewRate("");
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed to add currency"); }
    finally { setSaving(false); }
  }

  async function toggleActive(c: Currency) {
    try {
      await api.patch(`/admin/currencies/${c.id}`, { is_active: !c.is_active }, accessToken!);
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed to update"); }
  }

  async function setDefault(c: Currency) {
    if (!confirm(`Make ${c.code} the platform's default currency? Every price everywhere is stored in whatever currency is default — this doesn't convert existing prices.`)) return;
    try {
      const res = await api.post<any>(`/admin/currencies/${c.id}/set-default`, {}, accessToken!);
      toast.success((res as any).message ?? `${c.code} is now the default`);
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed to set default"); }
  }

  async function saveRate(c: Currency) {
    const rate = Number(rateDraft);
    if (!rate || rate <= 0) { toast.error("Enter a valid rate"); return; }
    try {
      await api.patch(`/admin/currencies/${c.id}`, { fx_rate: rate }, accessToken!);
      toast.success(`${c.code} rate updated`);
      setEditingRate(null);
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed to update rate"); }
  }

  async function deleteCurrency(c: Currency) {
    if (!confirm(`Remove ${c.code}? Anything priced in ${c.code} via a regional override will fall back to FX-converted USD.`)) return;
    try {
      await api.delete(`/admin/currencies/${c.id}`, accessToken!);
      toast.success(`${c.code} removed`);
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed to remove"); }
  }

  async function refreshRates() {
    setRefreshing(true);
    try {
      const res = await api.post<any>("/admin/currencies/refresh-rates", {}, accessToken!);
      toast.success((res as any).message ?? "Rates refreshed");
      mutate();
    } catch (e: any) { toast.error(e.message ?? "Failed to refresh rates"); }
    finally { setRefreshing(false); }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="font-display font-bold text-navy-900 text-base">Currencies</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Every price in the platform is stored in the default currency — everything else is either a live FX
            conversion or an explicit regional price you set below.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={refreshRates} disabled={refreshing} className="btn-outline !py-2 !px-3 !text-xs flex items-center gap-1.5 disabled:opacity-60">
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh live rates
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary !py-2 !px-3 !text-xs flex items-center gap-1.5">
            <Plus size={13} /> Add Currency
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={22} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Currency</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">FX Rate</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(currencies ?? []).map((c) => (
                <tr key={c.id} className={!c.is_active ? "opacity-50" : ""}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-navy-900">{c.code}</span>
                      <span className="text-slate-400 text-xs">{c.symbol} · {c.name}</span>
                      {c.is_default && <span className="badge bg-gold-100 text-gold-700"><Star size={10} /> Default</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {c.is_default ? (
                      <span className="text-slate-400 text-xs">1.00 (base)</span>
                    ) : editingRate === c.id ? (
                      <div className="flex items-center gap-1.5">
                        <input value={rateDraft} onChange={(e) => setRateDraft(e.target.value)} className="input-base !py-1 !text-xs !w-24" autoFocus />
                        <button onClick={() => saveRate(c)} className="text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
                        <button onClick={() => setEditingRate(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingRate(c.id); setRateDraft(String(c.fx_rate)); }} className="font-mono text-xs text-navy-700 hover:underline">
                        {Number(c.fx_rate).toFixed(4)}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {c.is_default ? "—" : (
                      <>
                        <span className="capitalize">{c.fx_rate_source}</span>
                        {c.fx_rate_updated_at && <span className="text-slate-400"> · {new Date(c.fx_rate_updated_at).toLocaleDateString()}</span>}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      disabled={c.is_default}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full transition-colors disabled:cursor-not-allowed ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {!c.is_default && c.is_active && (
                        <button onClick={() => setDefault(c)} className="text-slate-300 hover:text-gold-600 transition-colors" title="Make default">
                          <Star size={14} />
                        </button>
                      )}
                      {!c.is_default && (
                        <button onClick={() => deleteCurrency(c)} className="text-slate-300 hover:text-red-500 transition-colors" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-display font-black text-navy-900 text-lg">Add Currency</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Code (ISO 4217)</label>
                <input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} maxLength={3} placeholder="CAD" className="input-base text-sm font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Symbol</label>
                  <input value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="CA$" className="input-base text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">FX Rate (optional)</label>
                  <input value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="Use Refresh after" className="input-base text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Canadian Dollar" className="input-base text-sm" />
              </div>
              <p className="text-[11px] text-slate-400">
                Leave the rate blank and use “Refresh live rates” afterward to pull a real current rate instead of guessing one.
              </p>
              <button onClick={addCurrency} disabled={saving} className="btn-primary w-full justify-center !py-2 !text-sm disabled:opacity-60 flex items-center gap-1.5">
                {saving && <Loader2 size={13} className="animate-spin" />} Add Currency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Regional pricing section ────────────────────────────────────────────────────

type ProductType = "course" | "certification" | "program";

function RegionalPricingSection({ currencies }: { currencies: Currency[] }) {
  const { accessToken } = useAuthStore();
  const [type, setType] = useState<ProductType>("course");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { price: string; compare_at_price: string }>>({});
  const [saving, setSaving] = useState(false);

  const endpoints: Record<ProductType, string> = {
    course: "/admin/courses", certification: "/admin/certifications", program: "/admin/programs?limit=500",
  };
  const { data: listRaw } = useSWR(
    accessToken ? [endpoints[type], accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t),
  );
  const items: any[] = useMemo(() => {
    const d = Array.isArray(listRaw) ? listRaw : listRaw?.data ?? listRaw?.items ?? [];
    return Array.isArray(d) ? d : [];
  }, [listRaw]);
  const filtered = items.filter((i) => !q || (i.title ?? "").toLowerCase().includes(q.toLowerCase()));

  const nonDefault = currencies.filter((c) => !c.is_default && c.is_active);

  function select(item: any) {
    setSelected(item);
    const existing = item.regional_prices && typeof item.regional_prices === "object" ? item.regional_prices : {};
    const draft: Record<string, { price: string; compare_at_price: string }> = {};
    for (const c of nonDefault) {
      draft[c.code] = { price: existing[c.code]?.price != null ? String(existing[c.code].price) : "", compare_at_price: existing[c.code]?.compare_at_price != null ? String(existing[c.code].compare_at_price) : "" };
    }
    setOverrides(draft);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const regional_prices: Record<string, any> = {};
    for (const code of Object.keys(overrides)) {
      const { price, compare_at_price } = overrides[code];
      if (price.trim() === "") continue;
      regional_prices[code] = { price: Number(price), ...(compare_at_price.trim() !== "" ? { compare_at_price: Number(compare_at_price) } : {}) };
    }
    const idField = type === "course" ? selected.id : selected.id;
    const patchUrl = type === "course" ? `/admin/courses/${idField}` : type === "certification" ? `/admin/certifications/${idField}` : `/admin/programs/${idField}`;
    try {
      await api.patch(patchUrl, { regional_prices }, accessToken!);
      toast.success("Regional pricing saved");
    } catch (e: any) { toast.error(e.message ?? "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="card p-6">
      <h2 className="font-display font-bold text-navy-900 text-base mb-0.5">Regional Pricing</h2>
      <p className="text-slate-500 text-sm mb-5">
        Set a deliberate price in a specific currency (e.g. a round $259 CAD instead of a raw FX conversion) for
        a course, certification, or Program. Leave a currency blank to fall back to live FX conversion.
      </p>

      <div className="flex items-center gap-2 mb-4">
        {(["course", "certification", "program"] as ProductType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setSelected(null); setQ(""); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors ${type === t ? "bg-navy-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t}s
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${type}s…`} className="input-base !pl-8 !py-1.5 text-sm" />
          </div>
          <div className="border border-slate-100 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-50">
            {filtered.slice(0, 50).map((item) => (
              <button
                key={item.id}
                onClick={() => select(item)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${selected?.id === item.id ? "bg-navy-50 text-navy-900 font-semibold" : "hover:bg-slate-50 text-slate-700"}`}
              >
                <div className="truncate">{item.title}</div>
                <div className="text-xs text-slate-400">${Number(item.price).toFixed(2)} base</div>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-6 text-sm text-slate-400 text-center">No {type}s found.</p>}
          </div>
        </div>

        <div>
          {!selected ? (
            <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl p-8">
              <p className="text-sm text-slate-400 text-center">Select a {type} to set its regional pricing.</p>
            </div>
          ) : nonDefault.length === 0 ? (
            <p className="text-sm text-slate-400">No non-default active currencies yet — add one above first.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-navy-900 truncate">{selected.title}</p>
              {nonDefault.map((c) => (
                <div key={c.code} className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-slate-500 w-10 shrink-0">{c.code}</span>
                  <input
                    value={overrides[c.code]?.price ?? ""}
                    onChange={(e) => setOverrides((p) => ({ ...p, [c.code]: { ...p[c.code], price: e.target.value } }))}
                    placeholder="Price"
                    className="input-base !py-1.5 text-sm flex-1"
                  />
                  <input
                    value={overrides[c.code]?.compare_at_price ?? ""}
                    onChange={(e) => setOverrides((p) => ({ ...p, [c.code]: { ...p[c.code], compare_at_price: e.target.value } }))}
                    placeholder="Compare-at (optional)"
                    className="input-base !py-1.5 text-sm flex-1"
                  />
                </div>
              ))}
              <button onClick={save} disabled={saving} className="btn-primary !py-2 !text-sm w-full justify-center disabled:opacity-60 flex items-center gap-1.5">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />} Save Regional Pricing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CurrencySettingsPage() {
  const { accessToken } = useAuthStore();
  const { data: currencies } = useSWR<Currency[]>(
    accessToken ? ["/admin/currencies", accessToken] : null,
    ([url, t]: [string, string]) => fetcher(url, t),
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={20} className="text-navy-600" />
          <h1 className="text-2xl font-display font-black text-navy-900 tracking-tight">Currency</h1>
        </div>
        <p className="text-slate-500 text-sm">Multi-currency pricing, FX rates, and regional overrides.</p>
      </div>

      <CurrenciesSection />
      <RegionalPricingSection currencies={currencies ?? []} />
    </div>
  );
}
