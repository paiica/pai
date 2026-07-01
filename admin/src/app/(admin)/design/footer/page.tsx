"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Certifications",
    links: [
      { label: "Certified AI Professional (CAIP)", href: "/certifications/certified-ai-professional" },
      { label: "Certified AI Manager (CAIM)", href: "/certifications/certified-ai-manager" },
      { label: "Certified AI Executive (CAIE)", href: "/certifications/certified-ai-executive" },
      { label: "Certified AI Data Analyst (CAIDA)", href: "/certifications/certified-ai-data-analyst" },
      { label: "View All Certifications", href: "/certifications" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About PAII", href: "/about" },
      { label: "Our Mission", href: "/about#mission" },
      { label: "Advisory Board", href: "/about#board" },
      { label: "Accreditation", href: "/about#accreditation" },
      { label: "Press & Media", href: "/press" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog & Insights", href: "/blog" },
      { label: "AI Glossary", href: "/resources/glossary" },
      { label: "Study Guides", href: "/resources/study-guides" },
      { label: "Verify Certificate", href: "/verify" },
      { label: "FAQs", href: "/faq" },
    ],
  },
  {
    title: "Organizations",
    links: [
      { label: "Corporate Training", href: "/corporate" },
      { label: "Group Enrollment", href: "/corporate#group" },
      { label: "Volume Pricing", href: "/corporate#pricing" },
      { label: "Become a Partner", href: "/partners" },
    ],
  },
];

const DEFAULT_TRUST_ITEMS = [
  "Globally Recognized Credentials",
  "ISO 17024 Aligned Framework",
  "3,200+ Certified Professionals",
  "30-Day Money-Back Guarantee",
];

const DEFAULT_BOTTOM_LINKS: FooterLink[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Accessibility", href: "/accessibility" },
];

export default function FooterPage() {
  const { accessToken, refreshTokens } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/page-blocks", accessToken] : null,
    async ([url, token]) => {
      try {
        return await api.get<any>(url, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (ok) return api.get<any>(url, useAuthStore.getState().accessToken!);
        }
        throw err;
      }
    },
    {
      onSuccess: async (res) => {
        const blocks: any[] = res?.data ?? [];
        const footerBlock = blocks.find((b: any) => b.key === "footer");
        if (!footerBlock) {
          try {
            await api.post("/page-blocks", { key: "footer", label: "Footer", sort_order: 99 }, useAuthStore.getState().accessToken!);
            mutate();
          } catch {}
        }
      },
    }
  );

  const blocks: any[] = data?.data ?? [];
  const footerBlock = blocks.find((b: any) => b.key === "footer");
  const c = footerBlock?.content ?? {};

  const [tagline, setTagline] = useState<string | null>(null);
  const [socialLinkedin,  setSocialLinkedin]  = useState<string | null>(null);
  const [socialTwitter,   setSocialTwitter]   = useState<string | null>(null);
  const [socialInstagram, setSocialInstagram] = useState<string | null>(null);
  const [socialEmail,     setSocialEmail]     = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactLocation, setContactLocation] = useState<string | null>(null);
  const [columns, setColumns] = useState<FooterColumn[] | null>(null);
  const [trustItems, setTrustItems] = useState<string[] | null>(null);
  const [copyright, setCopyright] = useState<string | null>(null);
  const [bottomLinks, setBottomLinks] = useState<FooterLink[] | null>(null);
  const [activeCol, setActiveCol] = useState(0);
  const [saving, setSaving] = useState(false);

  const resolvedTagline = tagline ?? c.tagline ?? "The credential standard for AI professionals worldwide.";
  const resolvedLinkedin  = socialLinkedin  ?? c.social_linkedin  ?? "https://linkedin.com/company/professional-ai-institute";
  const resolvedTwitter   = socialTwitter   ?? c.social_twitter   ?? "https://x.com/paii_ca";
  const resolvedInstagram = socialInstagram ?? c.social_instagram ?? "";
  const resolvedEmail     = socialEmail     ?? c.social_email     ?? "info@paii.ca";
  const resolvedContactEmail = contactEmail ?? c.contact_email ?? "info@paii.ca";
  const resolvedContactLocation = contactLocation ?? c.contact_location ?? "Toronto, ON · Canada";
  const resolvedColumns: FooterColumn[] = columns ?? (Array.isArray(c.columns) ? c.columns : DEFAULT_COLUMNS);
  const resolvedTrustItems: string[] = trustItems ?? (Array.isArray(c.trust_items) ? c.trust_items : DEFAULT_TRUST_ITEMS);
  const resolvedCopyright = copyright ?? c.copyright ?? "Professional Artificial Intelligence Institute. All rights reserved.";
  const resolvedBottomLinks: FooterLink[] = bottomLinks ?? (Array.isArray(c.bottom_links) ? c.bottom_links : DEFAULT_BOTTOM_LINKS);

  function initFromBlock() {
    if (!footerBlock) return;
    setTagline(c.tagline ?? "The credential standard for AI professionals worldwide.");
    setSocialLinkedin(c.social_linkedin   ?? "https://linkedin.com/company/professional-ai-institute");
    setSocialTwitter(c.social_twitter    ?? "https://x.com/paii_ca");
    setSocialInstagram(c.social_instagram ?? "");
    setSocialEmail(c.social_email        ?? "info@paii.ca");
    setContactEmail(c.contact_email ?? "info@paii.ca");
    setContactLocation(c.contact_location ?? "Toronto, ON · Canada");
    setColumns(Array.isArray(c.columns) ? c.columns : DEFAULT_COLUMNS);
    setTrustItems(Array.isArray(c.trust_items) ? c.trust_items : DEFAULT_TRUST_ITEMS);
    setCopyright(c.copyright ?? "Professional Artificial Intelligence Institute. All rights reserved.");
    setBottomLinks(Array.isArray(c.bottom_links) ? c.bottom_links : DEFAULT_BOTTOM_LINKS);
  }

  if (footerBlock && tagline === null) {
    initFromBlock();
  }

  function updateColumn(idx: number, field: keyof FooterColumn, value: string) {
    setColumns((prev) => {
      const next = [...(prev ?? resolvedColumns)];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function updateLink(colIdx: number, linkIdx: number, field: keyof FooterLink, value: string) {
    setColumns((prev) => {
      const next = [...(prev ?? resolvedColumns)];
      const links = [...next[colIdx].links];
      links[linkIdx] = { ...links[linkIdx], [field]: value };
      next[colIdx] = { ...next[colIdx], links };
      return next;
    });
  }

  function addLink(colIdx: number) {
    setColumns((prev) => {
      const next = [...(prev ?? resolvedColumns)];
      next[colIdx] = { ...next[colIdx], links: [...next[colIdx].links, { label: "", href: "" }] };
      return next;
    });
  }

  function removeLink(colIdx: number, linkIdx: number) {
    setColumns((prev) => {
      const next = [...(prev ?? resolvedColumns)];
      next[colIdx] = { ...next[colIdx], links: next[colIdx].links.filter((_, i) => i !== linkIdx) };
      return next;
    });
  }

  function addColumn() {
    if (resolvedColumns.length >= 4) return;
    const next = [...resolvedColumns, { title: "", links: [{ label: "", href: "" }] }];
    setColumns(next);
    setActiveCol(next.length - 1);
  }

  function removeColumn() {
    if (resolvedColumns.length <= 1) return;
    const next = resolvedColumns.filter((_, i) => i !== activeCol);
    setColumns(next);
    setActiveCol(Math.max(0, activeCol - 1));
  }

  function updateTrustItem(idx: number, value: string) {
    setTrustItems((prev) => {
      const next = [...(prev ?? resolvedTrustItems)];
      next[idx] = value;
      return next;
    });
  }

  function addTrustItem() {
    setTrustItems([...resolvedTrustItems, ""]);
  }

  function removeTrustItem(idx: number) {
    setTrustItems(resolvedTrustItems.filter((_, i) => i !== idx));
  }

  function updateBottomLink(idx: number, field: keyof FooterLink, value: string) {
    setBottomLinks((prev) => {
      const next = [...(prev ?? resolvedBottomLinks)];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addBottomLink() {
    setBottomLinks([...resolvedBottomLinks, { label: "", href: "" }]);
  }

  function removeBottomLink(idx: number) {
    setBottomLinks(resolvedBottomLinks.filter((_, i) => i !== idx));
  }

  async function save() {
    setSaving(true);
    let token = accessToken!;
    try {
      await api.patch(
        "/page-blocks/footer",
        {
          content: {
            tagline: resolvedTagline,
            social_linkedin: resolvedLinkedin,
            social_twitter: resolvedTwitter,
            social_instagram: resolvedInstagram,
            social_email: resolvedEmail,
            contact_email: resolvedContactEmail,
            contact_location: resolvedContactLocation,
            columns: resolvedColumns,
            trust_items: resolvedTrustItems,
            copyright: resolvedCopyright,
            bottom_links: resolvedBottomLinks,
          },
        },
        token
      );
      toast.success("Footer saved");
      mutate();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const ok = await refreshTokens();
        if (ok) {
          token = useAuthStore.getState().accessToken!;
          try {
            await api.patch(
              "/page-blocks/footer",
              {
                content: {
                  tagline: resolvedTagline,
                  social_linkedin: resolvedLinkedin,
                  social_twitter: resolvedTwitter,
                  social_instagram: resolvedInstagram,
                  social_email: resolvedEmail,
                  contact_email: resolvedContactEmail,
                  contact_location: resolvedContactLocation,
                  columns: resolvedColumns,
                  trust_items: resolvedTrustItems,
                  copyright: resolvedCopyright,
                  bottom_links: resolvedBottomLinks,
                },
              },
              token
            );
            toast.success("Footer saved");
            mutate();
          } catch {
            toast.error("Failed to save footer");
          }
        } else {
          toast.error("Session expired — please sign in again");
        }
      } else {
        toast.error("Failed to save footer");
      }
    }
    setSaving(false);
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="card p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load footer data.</p>
          <p className="text-slate-400 text-xs mt-1 font-mono">{error?.message}</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-black text-navy-900">Footer</h1>
        <p className="text-slate-500 text-sm mt-1">Manage the marketing site footer content.</p>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Branding & Contact</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tagline</label>
              <textarea
                className="input-base resize-none h-16"
                value={resolvedTagline}
                onChange={(e) => setTagline(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">LinkedIn URL</label>
              <input
                className="input-base"
                value={resolvedLinkedin}
                onChange={(e) => setSocialLinkedin(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">X (Twitter) URL</label>
              <input
                className="input-base"
                value={resolvedTwitter}
                onChange={(e) => setSocialTwitter(e.target.value)}
                placeholder="https://x.com/yourhandle"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Instagram URL</label>
              <input
                className="input-base"
                value={resolvedInstagram}
                onChange={(e) => setSocialInstagram(e.target.value)}
                placeholder="https://instagram.com/yourhandle"
              />
              <p className="text-xs text-slate-400 mt-1">Leave empty to hide the icon.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email (social icon link)</label>
              <input
                className="input-base"
                value={resolvedEmail}
                onChange={(e) => setSocialEmail(e.target.value)}
                placeholder="info@paii.ca"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Email</label>
              <input
                className="input-base"
                value={resolvedContactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Location</label>
              <input
                className="input-base"
                value={resolvedContactLocation}
                onChange={(e) => setContactLocation(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Link Columns</h2>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {resolvedColumns.map((col, i) => (
              <button
                key={i}
                onClick={() => setActiveCol(i)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  activeCol === i ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {col.title || `Column ${i + 1}`}
              </button>
            ))}
            <button
              onClick={addColumn}
              disabled={resolvedColumns.length >= 4}
              className="btn-outline !py-1 !px-3 !text-xs disabled:opacity-40"
            >
              <Plus size={11} /> Add Column
            </button>
          </div>

          {resolvedColumns[activeCol] && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Column Title</label>
                <input
                  className="input-base"
                  value={resolvedColumns[activeCol].title}
                  onChange={(e) => updateColumn(activeCol, "title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Links</p>
                {resolvedColumns[activeCol].links.map((link, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <input
                      className="input-base flex-1"
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => updateLink(activeCol, li, "label", e.target.value)}
                    />
                    <input
                      className="input-base flex-1"
                      placeholder="/path"
                      value={link.href}
                      onChange={(e) => updateLink(activeCol, li, "href", e.target.value)}
                    />
                    <button
                      onClick={() => removeLink(activeCol, li)}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addLink(activeCol)}
                  className="text-xs text-slate-500 hover:text-navy-700 flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg"
                >
                  <Plus size={11} /> Add Link
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={removeColumn}
                  disabled={resolvedColumns.length <= 1}
                  className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 disabled:opacity-40"
                >
                  <Trash2 size={11} /> Remove this column
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Trust Bar</h2>
          <div className="space-y-2">
            {resolvedTrustItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input-base flex-1"
                  value={item}
                  onChange={(e) => updateTrustItem(i, e.target.value)}
                />
                <button
                  onClick={() => removeTrustItem(i)}
                  className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={addTrustItem}
              className="text-xs text-slate-500 hover:text-navy-700 flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg"
            >
              <Plus size={11} /> Add Item
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-bold text-navy-900 mb-4">Bottom Bar</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Copyright Text</label>
              <input
                className="input-base"
                value={resolvedCopyright}
                onChange={(e) => setCopyright(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal Links</p>
              {resolvedBottomLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="input-base flex-1"
                    placeholder="Label"
                    value={link.label}
                    onChange={(e) => updateBottomLink(i, "label", e.target.value)}
                  />
                  <input
                    className="input-base flex-1"
                    placeholder="/path"
                    value={link.href}
                    onChange={(e) => updateBottomLink(i, "href", e.target.value)}
                  />
                  <button
                    onClick={() => removeBottomLink(i)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={addBottomLink}
                className="text-xs text-slate-500 hover:text-navy-700 flex items-center gap-1 px-3 py-1.5 border border-dashed border-slate-200 rounded-lg"
              >
                <Plus size={11} /> Add Link
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-white border-t border-slate-100 mt-6 z-10">
        <button onClick={save} disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
