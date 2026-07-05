"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Loader2, PlusCircle, Presentation, Users, Globe, MapPin, Calendar } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function fetcher(url: string, token: string) {
  return api.get<any>(url, token).then((r: any) => r.data ?? r);
}

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-600",
  published: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
  completed: "bg-navy-50 text-navy-700",
};

const TYPE_LABEL: Record<string, string> = {
  online: "Online",
  in_person: "In Person",
  hybrid: "Hybrid",
};

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminEventsPage() {
  const { accessToken } = useAuthStore();
  const router = useRouter();

  const { data: events, isLoading, mutate } = useSWR(
    accessToken ? ["/admin/events", accessToken] : null,
    ([url, token]) => fetcher(url, token),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startAt || !endAt) {
      toast.error("Title, start, and end date/time are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<any>("/admin/events", {
        title,
        slug: slugify(title),
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      }, accessToken!);
      const created = (res as any).data ?? res;
      toast.success("Event created");
      router.push(`/events/${created.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  const list: any[] = Array.isArray(events) ? events : [];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-navy-900">Events</h1>
          <p className="text-slate-500 text-sm mt-1">Live training events, workshops, and seminars.</p>
        </div>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="btn-primary !py-2 !px-4 !text-xs flex-shrink-0"
        >
          <PlusCircle size={13} /> New Event
        </button>
      </div>

      {createOpen && (
        <form onSubmit={handleCreate} className="card p-6 mb-6 border-navy-200 bg-navy-50/30 space-y-4">
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest">New Event</p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Title <span className="text-red-500">*</span></label>
            <input className="input-base" placeholder="The Future of AI in the Workplace" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Starts <span className="text-red-500">*</span></label>
              <input className="input-base" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ends <span className="text-red-500">*</span></label>
              <input className="input-base" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
            </div>
          </div>
          <p className="text-xs text-slate-400">Everything else — description, speakers, agenda, location, price — is set in the editor after creating.</p>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary !py-2 !px-5 !text-xs disabled:opacity-60">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <PlusCircle size={12} />} Create & Edit
            </button>
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-outline !py-2 !px-4 !text-xs">Cancel</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 size={24} className="animate-spin text-slate-300 mx-auto" />
        </div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          <Presentation size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-semibold">No events yet</p>
          <p className="text-sm mt-1">Create your first live training event, workshop, or seminar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((event: any) => {
            const start = new Date(event.start_at);
            const end = new Date(event.end_at);
            const regCount = event._count?.registrations ?? 0;
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="card px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <Presentation size={18} className="text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-navy-900 text-sm truncate">{event.title}</span>
                    <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_COLORS[event.status] ?? STATUS_COLORS.draft)}>
                      {event.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {start.toLocaleDateString()} {start.toDateString() !== end.toDateString() ? `– ${end.toLocaleDateString()}` : ""}</span>
                    <span className="flex items-center gap-1">
                      {event.event_type === "in_person" ? <MapPin size={10} /> : <Globe size={10} />}
                      {TYPE_LABEL[event.event_type] ?? event.event_type}
                    </span>
                    <span className="flex items-center gap-1"><Users size={10} /> {regCount} registered</span>
                    <span>{Number(event.price) > 0 ? `$${Number(event.price).toLocaleString()}` : "Free"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
