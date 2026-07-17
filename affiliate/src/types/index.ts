// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AffiliateUser {
  id: string;
  email: string;
  role: "sales_rep";
  status: "pending" | "approved" | "suspended";
  referral_code: string;
  commission_rate: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  payout_method?: string | null;
  payout_details?: string | null;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_earnings: number;
  earnings_change: number;
  pending_commissions: number;
  total_leads: number;
  leads_change: number;
  conversions: number;
  conversions_change: number;
  conversion_rate: number;
  conversion_rate_change: number;
  total_clicks: number;
  clicks_change: number;
  invites_sent: number;
  active_promo_codes: number;
  active_products: number;
}

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface DashboardCharts {
  earnings: ChartDataPoint[];
  leads: ChartDataPoint[];
  clicks: ChartDataPoint[];
  conversions: ChartDataPoint[];
}

// ── Products ──────────────────────────────────────────────────────────────────

export interface AffiliateProduct {
  assignment_id: string;
  type: "certification" | "course";
  id: string;
  title: string;
  slug: string;
  price: number;
  status: string;
  image_url?: string | null;
  commission_rate: number;
  referral_url: string;
}

// ── Promo Codes ───────────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "fixed";
export type PromoStatus = "active" | "expired" | "exhausted";

export interface AffiliatePromoCode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  description?: string | null;
  min_order_value?: number | null;
  is_stackable: boolean;
  expires_at?: string | null;
  uses_count: number;
  max_uses?: number | null;
  status: PromoStatus;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadStatus = "invited" | "registered" | "purchased";
export type ReferralSource = "link" | "promo_code" | "invite" | "direct";

export interface Lead {
  id: string;
  name?: string | null;
  email: string;
  status: LeadStatus;
  source?: ReferralSource | null;
  product_name?: string | null;
  created_at: string;
}

// ── Commissions ───────────────────────────────────────────────────────────────

export type CommissionStatus = "pending" | "approved" | "paid";

export interface Commission {
  id: string;
  lead_name?: string | null;
  product_name?: string | null;
  sale_amount: number;
  amount: number;
  commission_rate: number;
  status: CommissionStatus;
  created_at: string;
  paid_at?: string | null;
}

export interface CommissionSummary {
  total_earned: number;
  pending: number;
  approved: number;
  paid: number;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface TopProduct {
  product_id: string;
  product_name: string;
  sales: number;
  revenue: number;
  conversion_rate: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
}

export interface AnalyticsData {
  revenue_over_time: ChartDataPoint[];
  clicks_vs_conversions: { date: string; clicks: number; conversions: number }[];
  funnel: FunnelStep[];
  top_products: TopProduct[];
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | "new_lead"
  | "lead_converted"
  | "commission_approved"
  | "commission_paid"
  | "promo_expiring"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ── Invites ───────────────────────────────────────────────────────────────────

export interface InviteStats {
  total_sent: number;
  pending: number;
  registered: number;
  converted: number;
}

export interface Invite {
  id: string;
  email: string;
  name?: string | null;
  status: "pending" | "registered" | "converted";
  created_at: string;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
}

// ── API Response ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
