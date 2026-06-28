"use client";

import { useState } from "react";
import { Mail, Users, UserCheck, Clock, Send, QrCode, Link2, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useInvites } from "@/hooks/useInvites";
import { useAuthStore } from "@/store/auth.store";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import CopyButton from "@/components/ui/CopyButton";
import { buildInviteLink, getQRCodeUrl, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api";

export default function InvitesPage() {
  const user = useAuthStore((s) => s.user);
  const { stats, invites, isLoading, sendInvite, resendInvite, deleteInvite } = useInvites();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const inviteLink = buildInviteLink(user?.referral_code ?? "");
  const qrUrl = getQRCodeUrl(inviteLink);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await sendInvite(email.trim(), name.trim() || undefined);
      toast.success("Invite sent!");
      setEmail("");
      setName("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send invite.");
    } finally {
      setSending(false);
    }
  }

  async function handleResend(id: string) {
    setResending(id);
    try {
      await resendInvite(id);
      toast.success("Invite resent!");
    } catch {
      toast.error("Failed to resend invite.");
    } finally {
      setResending(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteInvite(id);
      toast.success("Invite deleted.");
    } catch {
      toast.error("Failed to delete invite.");
    } finally {
      setDeleting(null);
    }
  }

  const statCards = [
    { label: "Total Sent",    value: stats?.total_sent    ?? 0, icon: Send },
    { label: "Pending",       value: stats?.pending        ?? 0, icon: Clock },
    { label: "Registered",   value: stats?.registered     ?? 0, icon: Users },
    { label: "Converted",    value: stats?.converted      ?? 0, icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <s.icon size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
            </div>
            {isLoading
              ? <Skeleton className="h-7 w-12" />
              : <p className="text-2xl font-display font-black text-navy-900">{s.value}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Your Invite Link</p>
            <p className="text-xs text-slate-400 mb-3">Share this link and earn commissions when contacts sign up and purchase.</p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
              <Link2 size={13} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-600 flex-1 truncate font-mono">{inviteLink}</p>
              <CopyButton text={inviteLink} label="Copy" size="xs" />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <QrCode size={15} /> QR Code
            </p>
            <div className="flex items-start gap-4">
              <div className="p-2 border border-slate-200 rounded-xl bg-white">
                <Image src={qrUrl} alt="Invite QR" width={120} height={120} unoptimized />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Print or share this QR code at events, on business cards, or in presentations.</p>
                <a href={qrUrl} download="invite-qr.png" className="btn-outline !py-1.5 !px-3 !text-xs inline-flex">
                  Download QR
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Send Email Invite</p>
            <div className="grid grid-cols-1 gap-2">
              <input
                className="input-base"
                placeholder="Recipient name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="email"
                required
                className="input-base"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
              <Mail size={14} />
              {sending ? "Sending…" : "Send Invite"}
            </button>
          </form>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Recent Invites</p>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : invites.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No invites sent yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invites.map((inv) => (
                <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{inv.email}</p>
                    {inv.name && <p className="text-xs text-slate-400">{inv.name}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(inv.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge capitalize ${
                      inv.status === "converted" ? "bg-emerald-50 text-emerald-700"
                      : inv.status === "registered" ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{inv.status}</span>
                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={resending === inv.id}
                      title="Resend invite"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={13} className={resending === inv.id ? "animate-spin" : ""} />
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      disabled={deleting === inv.id}
                      title="Delete invite"
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
