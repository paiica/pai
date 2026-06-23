// ─────────────────────────────────────────────
// Shared types used by both frontend and backend
// ─────────────────────────────────────────────

export type Role = "super_admin" | "admin" | "professor" | "student";

export type ApplicationStatus =
  | "pending_payment"
  | "pending_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export type EnrollmentStatus = "active" | "completed" | "suspended" | "expired";

export type LessonType = "video" | "reading" | "quiz" | "assignment" | "live_session" | "download";

export type CertificationLevel = "foundation" | "advanced" | "executive" | "specialist";

export type CertificateStatus = "active" | "expired" | "revoked" | "suspended";

// ─────────────────────────────────────────────
// API response envelope
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────

export interface UserSummary {
  id: string;
  email: string;
  role: Role;
  profile?: {
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export interface CertificationSummary {
  id: string;
  slug: string;
  acronym: string;
  title: string;
  level: CertificationLevel;
  badge_icon: string;
  price: number;
  duration_weeks: number;
  total_lessons: number;
  total_hours: number;
  passing_score: number;
  exam_duration_minutes: number;
  validity_years: number;
  description: string;
}

export interface EnrollmentSummary {
  id: string;
  user_id: string;
  certification_id: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  enrolled_at: string;
  completed_at?: string;
  certification?: CertificationSummary;
}

export interface ApplicationSummary {
  id: string;
  user_id: string;
  certification_id: string;
  status: ApplicationStatus;
  full_name: string;
  email: string;
  country?: string;
  career_status?: string;
  created_at: string;
  certification?: CertificationSummary;
}

export interface CertificateSummary {
  id: string;
  certificate_number: string;
  holder_name: string;
  certification_title: string;
  certification_acronym: string;
  exam_score: number;
  status: CertificateStatus;
  issued_at: string;
  expires_at: string;
  verification_url: string;
  pdf_url?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
