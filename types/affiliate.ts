export type AffiliatePartnerStatus = "pending" | "active" | "suspended";

export type AffiliateReferralStatus = "registered" | "trialing" | "subscribed" | "churned";

export type AffiliateCommissionStatus = "pending" | "approved" | "paid" | "cancelled";

export type AffiliatePartner = {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  brand_name: string;
  referral_code: string;
  slug: string;
  commission_rate_percent: number;
  status: AffiliatePartnerStatus;
  payout_min_eur: number;
  total_earned_eur: number;
  created_at: string;
  stripe_connect_account_id?: string | null;
  stripe_connect_onboarded?: boolean;
};

export type AffiliateStats = {
  clicks_30d: number;
  signups_total: number;
  trials_active: number;
  subscribers_active: number;
  mrr_attributed_eur: number;
  commissions_pending_eur: number;
  commissions_paid_eur: number;
  conversion_rate: number;
};

export type AffiliateReferralRow = {
  id: string;
  status: AffiliateReferralStatus;
  subscribed_plan: string | null;
  created_at: string;
  converted_at: string | null;
};

export type AffiliateCommissionRow = {
  id: string;
  gross_amount_eur: number;
  commission_eur: number;
  status: AffiliateCommissionStatus;
  created_at: string;
};

export type AffiliateMonthlyPoint = {
  month: string;
  clicks: number;
  signups: number;
  commissions_eur: number;
};
