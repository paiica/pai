import type { AuditLogEntry } from "@/types";

function actorName(entry: AuditLogEntry): string {
  if (!entry.user) return "Someone";
  const p = entry.user.profile;
  return p?.first_name ? `${p.first_name} ${p.last_name ?? ""}`.trim() : entry.user.email;
}

// Institution-scoped audit actions read in plain English. Falls back to a
// humanized version of the raw action string for anything not covered here
// (including older action names from before this list existed, e.g. the
// pre-rename "institution.professor_invited").
export function describeActivity(entry: AuditLogEntry): string {
  const who = actorName(entry);
  const nv = entry.new_value as any;
  const ov = entry.old_value as any;

  switch (entry.action) {
    case "institution.member_invited":
      return `${who} invited ${nv?.email ?? "someone"} as ${nv?.role ?? "a member"}`;
    case "institution.invite_resent":
      return `${who} resent the invite to ${nv?.email ?? "a pending member"}`;
    case "institution.member_role_changed":
      return `${who} changed ${nv?.email ?? "a member"}'s role from ${ov?.role ?? "?"} to ${nv?.role ?? "?"}`;
    case "institution.professor_suspended":
      return `${who} suspended ${ov?.email ?? "a member"}`;
    case "institution.professor_invited": // legacy name, before role-aware invites
      return `${who} invited ${nv?.email ?? "a professor"}`;
    case "institution.owner_provisioned":
      return `${who} added ${nv?.email ?? "an owner"} as institution owner`;
    case "institution.subscription_created":
      return `Subscribed to a package`;
    case "institution.subscription_cancel_scheduled":
      return `${who} turned off auto-renewal`;
    case "institution.subscription_resumed":
      return `${who} resumed auto-renewal`;
    case "institution.subscription_plan_changed":
      return `${who} changed the subscription plan`;
    case "institution.subscription_ended":
      return `Subscription ended`;
    case "institution.term_created":
      return `${who} created the term "${nv?.name ?? ""}"`;
    default:
      return entry.action.replace(/^institution\./, "").replace(/_/g, " ");
  }
}
