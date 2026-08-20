"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Trash2, Eye, EyeOff, Save, X, CalendarDays } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";

type CommunityEvent = {
  id: string;
  title: string;
  description: string;
  event_date: string | null;
  location: string;
  link_url: string;
  is_published: boolean;
};

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function EventRow({ item, token, onMutate }: { item: CommunityEvent; token: string; onMutate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [eventDate, setEventDate] = useState(toDateInput(item.event_date));
  const [location, setLocation] = useState(item.location);
  const [linkUrl, setLinkUrl] = useState(item.link_url);

  async function save() {
    try {
      await api.patch(`/community-events/${item.id}`, { title, description, event_date: eventDate || undefined, location, link_url: linkUrl }, token);
      toast.success("Saved");
      onMutate();
      setEditing(false);
    } catch { toast.error("Failed to save"); }
  }

  async function togglePublished() {
    try {
      await api.patch(`/community-events/${item.id}`, { is_published: !item.is_published }, token);
      onMutate();
    } catch { toast.error("Failed to update"); }
  }

  async function remove() {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      await api.delete(`/community-events/${item.id}`, token);
      toast.success("Deleted");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  }

  return (
    <div className={`card p-3 mb-2 transition-colors ${!item.is_published ? "opacity-50" : ""}`}>
      {editing ? (
        <div className="space-y-2">
          <input className="input-base !py-1.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea className="input-base !py-1.5 text-sm resize-none h-16" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <div className="flex gap-2">
            <input type="date" className="input-base !py-1.5 text-xs flex-1" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            <input className="input-base !py-1.5 text-xs flex-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Online, Toronto)" />
          </div>
          <input className="input-base !py-1.5 text-xs" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link URL (RSVP / join link)" />
          <div className="flex gap-2">
            <button onClick={save} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={14} /></button>
            <button onClick={() => { setEditing(false); setTitle(item.title); setDescription(item.description); setEventDate(toDateInput(item.event_date)); setLocation(item.location); setLinkUrl(item.link_url); }} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy-900 text-sm">{item.title}</p>
              {item.event_date && <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">{toDateInput(item.event_date)}</span>}
              {item.location && <span className="text-[10px] text-slate-400">{item.location}</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
          </div>
          <button onClick={togglePublished} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors flex-shrink-0 ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {item.is_published ? <Eye size={11} /> : <EyeOff size={11} />}
            {item.is_published ? "Published" : "Hidden"}
          </button>
          <button onClick={() => setEditing(true)} className="p-1.5 text-slate-400 hover:text-navy-700 hover:bg-slate-50 rounded-lg text-xs font-medium flex-shrink-0">Edit</button>
          <button onClick={remove} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  );
}

function AddForm({ adding, onAdd, onCancel }: { adding: boolean; onAdd: (v: { title: string; description: string; event_date?: string; location: string; link_url: string }) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  return (
    <div className="card p-4 border-2 border-dashed border-slate-200 mt-2 space-y-2">
      <input className="input-base !py-1.5 text-sm" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input-base !py-1.5 text-sm resize-none h-16" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex gap-2">
        <input type="date" className="input-base !py-1.5 text-xs flex-1" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        <input className="input-base !py-1.5 text-xs flex-1" placeholder="Location (e.g. Online, Toronto)" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <input className="input-base !py-1.5 text-xs" placeholder="Link URL (RSVP / join link)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
      <div className="flex gap-2">
        <button
          onClick={() => { if (!title || !description) { toast.error("Title and description are required"); return; } onAdd({ title, description, event_date: eventDate || undefined, location, link_url: linkUrl }); setTitle(""); setDescription(""); setEventDate(""); setLocation(""); setLinkUrl(""); }}
          disabled={adding}
          className="btn-primary !py-1.5 !px-4 !text-xs disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add Event"}
        </button>
        <button onClick={onCancel} className="btn-outline !py-1.5 !px-4 !text-xs">Cancel</button>
      </div>
    </div>
  );
}

// Empty by default — lightweight community calendar (meetups, study groups,
// AMAs), distinct from the full paid-Event/webinar system elsewhere in admin.
// New entries default to unpublished until PAII confirms the event is real.
export default function CommunityEventsManager() {
  const { accessToken, refreshTokens } = useAuthStore();
  const { data, error, isLoading, mutate } = useSWR(
    accessToken ? ["/community-events", accessToken] : null,
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
    }
  );

  const items: CommunityEvent[] = data?.data ?? data ?? [];

  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  async function addItem(v: { title: string; description: string; event_date?: string; location: string; link_url: string }) {
    setAdding(true);
    try {
      await api.post("/community-events", v, accessToken!);
      toast.success("Added");
      setShowAdd(false);
      mutate();
    } catch { toast.error("Failed to add"); }
    setAdding(false);
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold text-navy-900 uppercase tracking-widest flex items-center gap-1.5">
            <CalendarDays size={13} className="text-slate-400" /> Community Events
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">New events start hidden — publish once the date/link are confirmed.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="btn-outline !py-1.5 !px-3 !text-xs">
          <Plus size={12} /> Add Event
        </button>
      </div>

      {showAdd && <AddForm adding={adding} onAdd={addItem} onCancel={() => setShowAdd(false)} />}

      {isLoading ? (
        <div className="p-10 text-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-navy-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-red-500 text-sm font-semibold">Failed to load community events.</p>
          <button onClick={() => mutate()} className="btn-outline !py-1.5 !px-4 !text-xs mt-4">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">No events yet — add one above.</p>
      ) : (
        <div className="mt-4">
          {items.map((item) => <EventRow key={item.id} item={item} token={accessToken!} onMutate={mutate} />)}
        </div>
      )}
    </div>
  );
}
