export interface Certification {
  id: string;
  slug: string;
  title: string;
  acronym: string;
  description: string;
  long_description: string;
  level: "foundation" | "professional" | "specialist" | "executive";
  status: "active" | "coming_soon";
  price: number;
  duration_weeks: number;
  exam_duration_minutes: number;
  passing_score: number;
  validity_years: number;
  stripe_price_id: string | null;
  badge_icon: string;
  color_scheme: string;
  learning_outcomes: string[];
  curriculum: CurriculumModule[];
  faqs: FAQ[];
  created_at: string;
  updated_at: string;
}

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  duration_hours: number;
  lessons: Lesson[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: "video" | "reading" | "quiz" | "assignment";
  duration_minutes: number;
  is_preview?: boolean;
  video_url?: string;
  content?: string;
  quiz_questions?: QuizQuestion[];
}

export interface Certificate {
  id: string;
  certificate_id: string;
  user_id: string;
  certification_id: string;
  student_name: string;
  student_email: string;
  certification_title: string;
  certification_acronym: string;
  issue_date: string;
  expiry_date: string;
  status: "active" | "expired" | "revoked";
  score: number;
  certificate_url: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  certification_id: string;
  status: "enrolled" | "in_progress" | "completed" | "failed";
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  payment_id: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: "student" | "admin";
  company: string | null;
  job_title: string | null;
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar_url: string | null;
  certification_acronym: string;
  featured: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface VerificationResult {
  found: boolean;
  certificate?: Certificate;
  error?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  certification_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  created_at: string;
}
