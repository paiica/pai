// ── Auth ──────────────────────────────────────────────────────────────────────

export interface OrgUser {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  organization_name: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface OrgDashboard {
  name: string;
  seats_purchased: number;
  seats_used: number;
  seats_available: number;
  status_counts: { status: string; count: number }[];
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface OrgInviteLink {
  token: string;
  url: string;
}

export interface OrgBilling {
  price_per_seat: string | null;
  seats_purchased: number;
  seats_used: number;
  renewal_period_months: number;
  subscription_expires_at: string | null;
  is_expired: boolean;
}

// ── Employees ─────────────────────────────────────────────────────────────────

export type EnrollmentStatus = "active" | "completed" | "suspended" | "expired" | "registration_expired" | "retake_expired";

export interface Employee {
  id: string;
  user_id: string;
  certification_id: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  user: {
    id: string;
    email: string;
    profile: { first_name: string | null; last_name: string | null } | null;
  };
  certification: { id: string; title: string; acronym: string };
}

export interface Certification {
  id: string;
  title: string;
  acronym: string;
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
