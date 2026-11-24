// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AcademiaUser {
  id: string;
  email: string;
  role: string;
  profile: { first_name: string | null; last_name: string | null; avatar_url?: string | null } | null;
  created_at: string;
}

export type InstitutionRole = "owner" | "admin" | "professor" | "student";

export interface Institution {
  id: string;
  name: string;
  code: string;
  slug: string;
  logo_url: string | null;
}

export interface InstitutionMembership {
  institution: Institution;
  role: InstitutionRole;
}

// ── Dashboard / Activity ────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  action: string;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
  user: { email: string; profile: { first_name: string | null; last_name: string | null } | null } | null;
}

export interface InstitutionDashboard {
  institution: Institution & { description: string | null; website: string | null; contact_email: string | null; status: string };
  professor_count: number;
  student_count: number;
  course_count: number;
  pending_invite_count: number;
  onboarding: { has_professors: boolean; sso_enabled: boolean; has_active_subscription: boolean };
  subscription_status: "active" | "past_due" | "canceled" | null;
  recent_activity: AuditLogEntry[];
}

// ── Professors / Students ────────────────────────────────────────────────────

export interface InstitutionPerson {
  membership_id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role?: InstitutionRole;
  status: "invited" | "active" | "suspended";
  course_count?: number;
  joined_at: string;
}

// ── Courses ───────────────────────────────────────────────────────────────────

export interface InstitutionCourse {
  id: string;
  title: string;
  slug: string;
  visibility: "private" | "public";
  approval_status: "none" | "pending" | "approved" | "rejected";
  status: string;
  is_listed: boolean;
  price: string | number;
  created_at: string;
  creator: { email: string; profile: { first_name: string | null; last_name: string | null } | null } | null;
  term: { id: string; name: string } | null;
  instructors: { user_id: string; is_lead: boolean; user: { email: string; profile: { first_name: string | null; last_name: string | null } | null } }[];
  _count: { enrollments: number };
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
