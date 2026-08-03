"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Loader2, Send, CheckCircle, Copy, Check, RefreshCw, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import { api, ApiError } from "@/lib/api";
import { MultiSelectPicker } from "@/components/ui/MultiSelectPicker";
import type { Certification, OrgInviteLink } from "@/types";

type InviteResult = { results: { email: string; status: "invited" | "enrolled" }[] };

function InviteLinkCard() {
  const { accessToken } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { data: link, mutate } = useSWR(
    accessToken ? ["/org/invite-link", accessToken] : null,
    ([url, token]) => api.get<OrgInviteLink>(url, token),
  );

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!confirm("Regenerating creates a new link and permanently deactivates the old one. Continue?")) return;
    setRegenerating(true);
    try {
      await api.post<OrgInviteLink>("/org/invite-link/regenerate", {}, accessToken!);
      toast.success("New link generated — the old one no longer works");
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to regenerate link";
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 size={16} className="text-gold-500" />
        <p className="font-semibold text-navy-900">Or share an invite link</p>
      </div>
      <p className="text-sm text-slate-500">
        Anyone with this link can sign up as an employee of your organization and pick their own
        certification(s), as long as seats are available. Regenerate it any time to deactivate an old link.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link?.url ?? "Loading…"}
          onClick={(e) => e.currentTarget.select()}
          className="input-base text-sm flex-1 font-mono !text-xs"
        />
        <button onClick={handleCopy} disabled={!link} className="btn-outline !py-2.5 !px-3 disabled:opacity-60" title="Copy link">
          {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
        </button>
        <button onClick={handleRegenerate} disabled={regenerating || !link} className="btn-outline !py-2.5 !px-3 disabled:opacity-60" title="Regenerate link">
          {regenerating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
        </button>
      </div>
    </div>
  );
}

export default function InviteEmployeesPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [emailsText, setEmailsText] = useState("");
  const [certIds, setCertIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);

  const { data: certs } = useSWR(
    "/courses/catalog",
    (url) => api.get<Certification[]>(url),
  );

  function parseEmails(text: string): string[] {
    return [...new Set(text.split(/[\s,;\n]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  }

  const emails = parseEmails(emailsText);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (emails.length === 0) { toast.error("Enter at least one email address"); return; }
    if (certIds.length === 0) { toast.error("Select at least one certification"); return; }
    setSending(true);
    setResult(null);
    try {
      const res = await api.post<InviteResult>("/org/employees/invite", { emails, certification_ids: certIds }, accessToken!);
      setResult(res);
      toast.success("Invitations sent");
      setEmailsText("");
      setCertIds([]);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to send invitations";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-display font-black text-navy-900">Invite Employees</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Enrolls each email into every certification you select below. Employees without a PAII account
          yet will get an email to set their password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Employee emails
          </label>
          <textarea
            className="input-base h-32 resize-none"
            placeholder={"one@company.com\ntwo@company.com\nthree@company.com"}
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1">
            One per line, or separated by commas/spaces. {emails.length > 0 && `${emails.length} email${emails.length !== 1 ? "s" : ""} detected.`}
          </p>
        </div>

        <MultiSelectPicker
          label="Certifications"
          items={certs ?? []}
          selected={certIds}
          onChange={setCertIds}
          getId={(c) => c.id}
          getLabel={(c: Certification) => `${c.acronym} — ${c.title}`}
        />

        <button type="submit" disabled={sending} className="btn-primary w-full !py-3">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? "Sending…" : "Send Invitations"}
        </button>
      </form>

      {result && (
        <div className="card p-6">
          <p className="font-semibold text-navy-900 mb-3">Results</p>
          <ul className="space-y-2">
            {result.results.map((r) => (
              <li key={r.email} className="flex items-center gap-2 text-sm">
                <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                <span className="text-slate-700">{r.email}</span>
                <span className="text-xs text-slate-400">
                  {r.status === "invited" ? "invited (email sent)" : "already had an account, enrolled"}
                </span>
              </li>
            ))}
          </ul>
          <button onClick={() => router.push("/employees")} className="btn-outline mt-4 w-full justify-center">
            View Employees
          </button>
        </div>
      )}

      <InviteLinkCard />
    </div>
  );
}
