"use client";

import { Fragment, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  Save, Loader2, Mail, Plus, Trash2, Upload, Users, Calendar,
  GripVertical, ChevronDown, Briefcase, GraduationCap, MapPin, Receipt,
  Eye, EyeOff, Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type Speaker = { id: string; name: string; title: string; company: string; bio: string; photo_url: string };
type AgendaItem = { id: string; day_label: string; time: string; title: string; description: string };
type Language = { code: string; name: string; native_name: string; is_rtl: boolean };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Photo upload button ──────────────────────────────────────────────────────

function PhotoUpload({ url, onChange, token }: { url: string; onChange: (url: string) => void; token: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/uploads/local?purpose=event_image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      const fileUrl: string = data?.url ?? data?.data?.url;
      if (!fileUrl) throw new Error("No URL in response");
      onChange(fileUrl);
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <Users size={18} className="text-slate-300" />}
      </div>
      <label className="btn-outline !py-1.5 !px-3 !text-xs cursor-pointer">
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {url ? "Replace Photo" : "Upload Photo"}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, refreshTokens } = useAuthStore();

  const { data: event, mutate } = useSWR(
    accessToken && id ? [`/admin/events/${id}`, accessToken] : null,
    ([url, token]) => fetcher(url, token),
  );

  const { data: languagesData } = useSWR<Language[]>(
    accessToken ? ["/languages", accessToken] : null,
    ([url, token]: [string, string]) => api.get<any>(url, token).then((r: any) => r.data ?? r)
  );
  const languages = languagesData ?? [];
  const nonEnglishLanguages = languages.filter((l) => l.code !== "en");

  const [activeLocale, setActiveLocale] = useState("");
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, Record<string, any>>>({});
  const [translationsInitialized, setTranslationsInitialized] = useState(false);
  const [savingTranslation, setSavingTranslation] = useState<string | null>(null);
  const [retranslating, setRetranslating] = useState<string | null>(null);
  const [translationJsonErrors, setTranslationJsonErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (event && !translationsInitialized) {
      setTranslationDrafts(event.translations ?? {});
      setTranslationsInitialized(true);
    }
  }, [event, translationsInitialized]);

  useEffect(() => {
    if (!activeLocale && nonEnglishLanguages.length > 0) setActiveLocale(nonEnglishLanguages[0].code);
  }, [nonEnglishLanguages, activeLocale]);

  function getTranslatedField(locale: string, field: string): any {
    return translationDrafts[locale]?.[field];
  }
  function setTranslatedField(locale: string, field: string, value: any) {
    setTranslationDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [field]: value } }));
  }
  function getTranslatedText(locale: string, field: string): string {
    return getTranslatedField(locale, field) ?? "";
  }
  function getTranslatedStringList(locale: string, field: string): string {
    const val = getTranslatedField(locale, field);
    return Array.isArray(val) ? val.join("\n") : (val ?? "");
  }
  function setTranslatedStringList(locale: string, field: string, text: string) {
    setTranslatedField(locale, field, text.split("\n"));
  }
  function getTranslatedJsonText(locale: string, field: string): string {
    const val = getTranslatedField(locale, field);
    return val !== undefined ? JSON.stringify(val, null, 2) : "";
  }
  function setTranslatedJsonText(locale: string, field: string, text: string) {
    const key = `${locale}:${field}`;
    try {
      const parsed = text.trim() ? JSON.parse(text) : undefined;
      setTranslatedField(locale, field, parsed);
      setTranslationJsonErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } catch {
      setTranslationDrafts((prev) => ({ ...prev, [locale]: { ...prev[locale], [`__raw_${field}`]: text } }));
      setTranslationJsonErrors((prev) => ({ ...prev, [key]: "Invalid JSON — not saved until fixed" }));
    }
  }
  function getTranslatedJsonTextValue(locale: string, field: string): string {
    const raw = translationDrafts[locale]?.[`__raw_${field}`];
    return raw !== undefined ? raw : getTranslatedJsonText(locale, field);
  }

  async function saveTranslation(locale: string) {
    setSavingTranslation(locale);
    try {
      let token = accessToken!;
      const rawDraft = translationDrafts[locale] ?? {};
      const fields = Object.fromEntries(Object.entries(rawDraft).filter(([k]) => !k.startsWith("__raw_")));
      try {
        await api.patch(`/translations/event/${id}?locale=${locale}`, { fields }, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          await api.patch(`/translations/event/${id}?locale=${locale}`, { fields }, token);
        } else throw err;
      }
      toast.success("Translation saved");
    } catch {
      toast.error("Failed to save translation");
    } finally {
      setSavingTranslation(null);
    }
  }

  async function retranslate(locale: string) {
    setRetranslating(locale);
    try {
      let token = accessToken!;
      let res: any;
      try {
        res = await api.post<any>(`/translations/event/${id}?locale=${locale}`, {}, token);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const ok = await refreshTokens();
          if (!ok) throw err;
          token = useAuthStore.getState().accessToken!;
          res = await api.post<any>(`/translations/event/${id}?locale=${locale}`, {}, token);
        } else throw err;
      }
      const updated = res?.data ?? res;
      setTranslationDrafts((prev) => ({ ...prev, [locale]: updated?.translations?.[locale] ?? {} }));
      setTranslationJsonErrors({});
      toast.success("Translated with AI — review and save");
    } catch {
      toast.error("Translation failed");
    } finally {
      setRetranslating(null);
    }
  }

  const [tab, setTab] = useState<"details" | "speakers" | "agenda" | "registrations" | "translations">("details");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedReg, setExpandedReg] = useState<string | null>(null);

  // Details
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [promoVideo, setPromoVideo] = useState("");
  const [eventNature, setEventNature] = useState<"" | "training" | "seminar" | "workshop" | "conference" | "meetup" | "webinar" | "other">("");
  const [eventType, setEventType] = useState<"online" | "in_person" | "hybrid">("online");
  const [city, setCity] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState<"" | "zoom" | "teams" | "google_meet" | "other">("");
  const [timezone, setTimezone] = useState("America/Toronto");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "cancelled" | "completed">("draft");
  const [topicsInput, setTopicsInput] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Speakers / Agenda
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  useEffect(() => {
    if (!event || initialized) return;
    setTitle(event.title ?? "");
    setSlug(event.slug ?? "");
    setSubtitle(event.subtitle ?? "");
    setSummary(event.summary ?? "");
    setDescription(event.description ?? "");
    setCoverImage(event.cover_image_url ?? "");
    setPromoVideo(event.promo_video_url ?? "");
    setEventNature(event.event_nature ?? "");
    setEventType(event.event_type ?? "online");
    setCity(event.city ?? "");
    setLocationAddress(event.location_address ?? "");
    setMeetingLink(event.meeting_link ?? "");
    setMeetingPlatform(event.meeting_platform ?? "");
    setTimezone(event.timezone ?? "America/Toronto");
    setStartAt(toLocalInputValue(event.start_at));
    setEndAt(toLocalInputValue(event.end_at));
    setPrice(String(event.price ?? 0));
    setCapacity(event.capacity != null ? String(event.capacity) : "");
    setStatus(event.status ?? "draft");
    setTopicsInput((event.topics ?? []).join(", "));
    setIsFeatured(event.is_featured ?? false);
    const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
    setSpeakers(Array.isArray(event.speakers) ? event.speakers.filter(isRecord) : []);
    setAgenda(Array.isArray(event.agenda) ? event.agenda.filter(isRecord) : []);
    setInitialized(true);
  }, [event, initialized]);

  const { data: registrations, isLoading: regsLoading } = useSWR(
    accessToken && id && tab === "registrations" ? [`/admin/events/${id}/registrations`, accessToken] : null,
    ([url, token]) => fetcher(url, token),
  );

  async function save() {
    if (!title.trim() || !slug.trim()) { toast.error("Title and slug are required."); return; }
    setSaving(true);
    try {
      await api.put(`/admin/events/${id}`, {
        title, slug, subtitle, summary, description,
        cover_image_url: coverImage, promo_video_url: promoVideo,
        event_nature: eventNature || undefined,
        event_type: eventType, city, location_address: locationAddress, meeting_link: meetingLink,
        meeting_platform: meetingPlatform || undefined,
        timezone, start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString(),
        price: parseFloat(price) || 0,
        capacity: capacity ? parseInt(capacity) : undefined,
        status,
        topics: topicsInput.split(",").map((t) => t.trim()).filter(Boolean),
        is_featured: isFeatured,
        speakers, agenda,
      }, accessToken!);
      toast.success("Event saved");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  async function notifyStudents() {
    if (!confirm(`Email every active student about "${title}"? This sends once — there's no undo.`)) return;
    setNotifying(true);
    try {
      const res = await api.post<any>(`/admin/events/${id}/notify`, {}, accessToken!);
      const result = (res as any).data ?? res;
      toast.success(result.message ?? "Announcement sent");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send announcement");
    } finally {
      setNotifying(false);
    }
  }

  // Public listing only shows status === "published" — this is the actual
  // "hide" mechanism (the Status dropdown in the Details tab does the same
  // thing, but buried in a form field isn't discoverable as "hide").
  async function toggleVisibility() {
    const nextStatus = status === "published" ? "draft" : "published";
    setTogglingVisibility(true);
    try {
      await api.put(`/admin/events/${id}`, {
        title, slug, subtitle, summary, description,
        cover_image_url: coverImage, promo_video_url: promoVideo,
        event_nature: eventNature || undefined,
        event_type: eventType, city, location_address: locationAddress, meeting_link: meetingLink,
        meeting_platform: meetingPlatform || undefined,
        timezone, start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString(),
        price: parseFloat(price) || 0,
        capacity: capacity ? parseInt(capacity) : undefined,
        status: nextStatus,
        topics: topicsInput.split(",").map((t) => t.trim()).filter(Boolean),
        is_featured: isFeatured,
        speakers, agenda,
      }, accessToken!);
      setStatus(nextStatus);
      toast.success(nextStatus === "draft" ? "Event hidden from the public site" : "Event published to the public site");
      mutate();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update event visibility");
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function deleteEvent() {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone. Registrations for this event will also be removed.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/events/${id}`, accessToken!);
      toast.success("Event deleted");
      router.push("/events");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete event");
      setDeleting(false);
    }
  }

  function addSpeaker() {
    setSpeakers((prev) => [...prev, { id: uid(), name: "", title: "", company: "", bio: "", photo_url: "" }]);
  }
  function updateSpeaker(id: string, field: keyof Speaker, value: string) {
    setSpeakers((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }
  function removeSpeaker(id: string) {
    setSpeakers((prev) => prev.filter((s) => s.id !== id));
  }

  function addAgendaItem() {
    setAgenda((prev) => [...prev, { id: uid(), day_label: "", time: "", title: "", description: "" }]);
  }
  function updateAgendaItem(id: string, field: keyof AgendaItem, value: string) {
    setAgenda((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  }
  function removeAgendaItem(id: string) {
    setAgenda((prev) => prev.filter((a) => a.id !== id));
  }

  if (!event) {
    return (
      <div className="p-8">
        <div className="card p-8 animate-pulse h-64 bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">{title || "Untitled Event"}</h1>
          <p className="text-slate-500 text-sm mt-0.5">/events/{slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={notifyStudents} disabled={notifying} className="btn-outline !py-2 !px-3 !text-xs disabled:opacity-60">
            {notifying ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Notify Students
          </button>
          <button
            onClick={toggleVisibility}
            disabled={togglingVisibility}
            title={status === "published" ? "Hide from the public site (sets status to Draft)" : "Publish to the public site"}
            className="btn-outline !py-2 !px-3 !text-xs disabled:opacity-60"
          >
            {togglingVisibility ? <Loader2 size={12} className="animate-spin" /> : status === "published" ? <EyeOff size={12} /> : <Eye size={12} />}
            {status === "published" ? "Hide" : "Show"}
          </button>
          <button onClick={save} disabled={saving} className="btn-primary !py-2 !px-4 !text-xs disabled:opacity-60">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
          <button
            onClick={deleteEvent}
            disabled={deleting}
            title="Permanently delete this event"
            className="btn-outline !py-2 !px-3 !text-xs !text-red-600 !border-red-200 hover:!bg-red-50 disabled:opacity-60"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
          </button>
        </div>
      </div>

      <>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {(["details", "speakers", "agenda", "registrations", "translations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t ? "border-navy-800 text-navy-900" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Identity</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title</label>
              <input className="input-base" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slug</label>
              <input className="input-base" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Subtitle</label>
              <input className="input-base" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Short tagline shown under the title" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Summary</label>
              <textarea className="input-base h-16 resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One to two sentences for event cards and email announcements" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea className="input-base h-32 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Full description shown on the event detail page" />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Media</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cover Image URL</label>
              <input className="input-base" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Promo / Recap Video URL</label>
              <input className="input-base" value={promoVideo} onChange={(e) => setPromoVideo(e.target.value)} placeholder="YouTube or direct video URL" />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Format & Location</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Event Nature</label>
                <select className="input-base" value={eventNature} onChange={(e) => setEventNature(e.target.value as any)}>
                  <option value="">Select…</option>
                  <option value="training">Training</option>
                  <option value="seminar">Seminar</option>
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                  <option value="meetup">Meetup</option>
                  <option value="webinar">Webinar</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
                <select className="input-base" value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
                  <option value="online">Online</option>
                  <option value="in_person">In Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Timezone</label>
                <input className="input-base" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Toronto" />
              </div>
            </div>
            {eventType !== "online" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                  <input className="input-base" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toronto" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</label>
                  <input className="input-base" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} placeholder="123 Main St, ON M5V 2T6" />
                </div>
              </div>
            )}
            {eventType !== "in_person" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Meeting Platform</label>
                  <select className="input-base" value={meetingPlatform} onChange={(e) => setMeetingPlatform(e.target.value as any)}>
                    <option value="">Select…</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Meeting Link</label>
                  <input className="input-base" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://zoom.us/…" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Starts</label>
                <input className="input-base" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ends</label>
                <input className="input-base" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">Settings</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (USD)</label>
                <input className="input-base" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = free" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Capacity</label>
                <input className="input-base" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Unlimited" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
                <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Topics (comma-separated)</label>
              <input className="input-base" value={topicsInput} onChange={(e) => setTopicsInput(e.target.value)} placeholder="AI Strategy, Leadership, Automation" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-700">Featured (highlighted on the events list)</span>
            </label>
          </div>
        </div>
      )}

      {tab === "speakers" && (
        <div className="space-y-3">
          {speakers.map((speaker) => (
            <div key={speaker.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <PhotoUpload url={speaker.photo_url} onChange={(url) => updateSpeaker(speaker.id, "photo_url", url)} token={accessToken!} />
                <button onClick={() => removeSpeaker(speaker.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-base text-sm" placeholder="Name" value={speaker.name} onChange={(e) => updateSpeaker(speaker.id, "name", e.target.value)} />
                <input className="input-base text-sm" placeholder="Title / Role" value={speaker.title} onChange={(e) => updateSpeaker(speaker.id, "title", e.target.value)} />
              </div>
              <input className="input-base text-sm" placeholder="Company" value={speaker.company} onChange={(e) => updateSpeaker(speaker.id, "company", e.target.value)} />
              <textarea className="input-base text-sm h-20 resize-none" placeholder="Short bio" value={speaker.bio} onChange={(e) => updateSpeaker(speaker.id, "bio", e.target.value)} />
            </div>
          ))}
          <button onClick={addSpeaker} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-navy-300 text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all text-sm font-medium">
            <Plus size={14} /> Add Speaker
          </button>
        </div>
      )}

      {tab === "agenda" && (
        <div className="space-y-3">
          {agenda.map((item, i) => (
            <div key={item.id} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <GripVertical size={13} className="text-slate-300" /> Item {i + 1}
                </span>
                <button onClick={() => removeAgendaItem(item.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-base text-sm" placeholder="Day label (optional, e.g. Day 1)" value={item.day_label} onChange={(e) => updateAgendaItem(item.id, "day_label", e.target.value)} />
                <input className="input-base text-sm" placeholder="Time (e.g. 9:00 AM)" value={item.time} onChange={(e) => updateAgendaItem(item.id, "time", e.target.value)} />
              </div>
              <input className="input-base text-sm" placeholder="Title" value={item.title} onChange={(e) => updateAgendaItem(item.id, "title", e.target.value)} />
              <textarea className="input-base text-sm h-16 resize-none" placeholder="Description" value={item.description} onChange={(e) => updateAgendaItem(item.id, "description", e.target.value)} />
            </div>
          ))}
          <button onClick={addAgendaItem} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-navy-300 text-slate-500 hover:text-navy-700 hover:bg-navy-50 transition-all text-sm font-medium">
            <Plus size={14} /> Add Agenda Item
          </button>
        </div>
      )}

      {tab === "registrations" && (
        <div className="card overflow-hidden">
          {regsLoading ? (
            <div className="p-10 text-center"><Loader2 size={22} className="animate-spin text-slate-300 mx-auto" /></div>
          ) : !registrations?.length ? (
            <div className="p-10 text-center text-slate-500">
              <Users size={32} className="mx-auto mb-3 text-slate-200" />
              <p className="font-semibold text-sm">No registrations yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-50 border-b border-slate-200">
                    <th className="w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-navy-800">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-navy-800">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-navy-800">Phone</th>
                    <th className="text-left px-4 py-3 font-semibold text-navy-800">Paid</th>
                    <th className="text-left px-4 py-3 font-semibold text-navy-800">Registered</th>
                    <th className="text-left px-4 py-3 font-semibold text-navy-800">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {registrations.map((r: any) => {
                    const isOpen = expandedReg === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr onClick={() => setExpandedReg(isOpen ? null : r.id)}
                          className="hover:bg-slate-50 cursor-pointer">
                          <td className="pl-4">
                            <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                          </td>
                          <td className="px-4 py-3 font-medium text-navy-900">{r.name}</td>
                          <td className="px-4 py-3 text-slate-600">{r.email}</td>
                          <td className="px-4 py-3 text-slate-500">{r.phone ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{Number(r.amount_paid) > 0 ? `$${Number(r.amount_paid).toLocaleString()}` : "Free"}</td>
                          <td className="px-4 py-3 text-slate-500"><span className="flex items-center gap-1"><Calendar size={11} /> {formatDate(r.registered_at)}</span></td>
                          <td className="px-4 py-3">
                            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", r.status === "registered" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-slate-50/60">
                            <td></td>
                            <td colSpan={6} className="px-4 py-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={10} /> Address</p>
                                  <p className="text-slate-700">
                                    {[r.address_line1, r.city, r.state_province, r.postal_code, r.country].filter(Boolean).join(", ") || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase size={10} /> Profession</p>
                                  <p className="text-slate-700">{r.profession ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase size={10} /> Job title</p>
                                  <p className="text-slate-700">{r.job_title ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><GraduationCap size={10} /> Education</p>
                                  <p className="text-slate-700">{r.education ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Years of experience</p>
                                  <p className="text-slate-700">{r.years_experience ?? "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Receipt size={10} /> Receipt</p>
                                  {r.stripe_receipt_url ? (
                                    <a href={r.stripe_receipt_url} target="_blank" rel="noopener noreferrer" className="text-navy-700 hover:underline">View receipt</a>
                                  ) : (
                                    <p className="text-slate-700">—</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "translations" && (
        <div className="space-y-4">
          {nonEnglishLanguages.length === 0 ? (
            <div className="card p-6 text-center text-slate-500 text-sm">
              No additional languages are enabled yet. Add one in Site Settings → Languages.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {nonEnglishLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLocale(lang.code)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      activeLocale === lang.code ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {lang.native_name}
                  </button>
                ))}
              </div>

              {activeLocale && (() => {
                const lang = nonEnglishLanguages.find((l) => l.code === activeLocale);
                const jsonErr = (field: string) => translationJsonErrors[`${activeLocale}:${field}`];
                return (
                  <div className="card p-5 space-y-4" dir={lang?.is_rtl ? "rtl" : "ltr"}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">{lang?.name} Translation</p>
                      <button
                        onClick={() => retranslate(activeLocale)}
                        disabled={retranslating === activeLocale}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-navy-200 text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-50"
                      >
                        {retranslating === activeLocale ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Re-translate from English
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Auto-translated by AI when this event is saved or when {lang?.name} is enabled. Edit directly here, or re-translate to overwrite with a fresh AI pass — English stays the source of truth. Speaker names/bios are not translated.
                    </p>
                    <Field label="Title">
                      <input className="input-base" value={getTranslatedText(activeLocale, "title")} onChange={(e) => setTranslatedField(activeLocale, "title", e.target.value)} />
                    </Field>
                    <Field label="Subtitle">
                      <input className="input-base" value={getTranslatedText(activeLocale, "subtitle")} onChange={(e) => setTranslatedField(activeLocale, "subtitle", e.target.value)} />
                    </Field>
                    <Field label="Summary">
                      <textarea className="input-base h-20 resize-none" value={getTranslatedText(activeLocale, "summary")} onChange={(e) => setTranslatedField(activeLocale, "summary", e.target.value)} />
                    </Field>
                    <Field label="Description">
                      <textarea className="input-base h-36 resize-none" value={getTranslatedText(activeLocale, "description")} onChange={(e) => setTranslatedField(activeLocale, "description", e.target.value)} />
                    </Field>
                    <Field label="Topics" hint="One per line">
                      <textarea className="input-base h-24 resize-none" value={getTranslatedStringList(activeLocale, "topics")} onChange={(e) => setTranslatedStringList(activeLocale, "topics", e.target.value)} />
                    </Field>
                    <Field label="Agenda" hint="JSON — array of { day_label, time, title, description }">
                      <textarea
                        className="input-base h-48 resize-y font-mono text-xs"
                        value={getTranslatedJsonTextValue(activeLocale, "agenda")}
                        onChange={(e) => setTranslatedJsonText(activeLocale, "agenda", e.target.value)}
                        dir="ltr"
                      />
                      {jsonErr("agenda") && <p className="text-[11px] text-red-500 mt-1">{jsonErr("agenda")}</p>}
                    </Field>
                    <div className="flex justify-end">
                      <button onClick={() => saveTranslation(activeLocale)} disabled={savingTranslation === activeLocale} className="btn-primary !py-2 !px-4 !text-xs">
                        {savingTranslation === activeLocale ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Translation
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
      </>
    </div>
  );
}
