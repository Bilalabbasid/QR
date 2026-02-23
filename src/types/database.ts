export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'owner' | 'manager' | 'staff'
export type ReplyStatus = 'not_replied' | 'auto_replied' | 'manual_replied'
export type SentimentType = 'positive' | 'neutral' | 'negative'
export type ReplySource = 'auto' | 'manual'
export type AlertType = 'low_rating' | 'negative_sentiment' | 'no_reply' | 'spike_detected'
export type NotificationChannel = 'email' | 'whatsapp'
export type SummaryType = 'monthly' | 'weekly'
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string; name: string; logo_url: string | null; industry: string | null
          subscription_plan: SubscriptionPlan; subscription_status: SubscriptionStatus | null
          google_account_id: string | null; auto_reply_enabled: boolean
          low_rating_threshold: number; notification_email: string | null
          notification_whatsapp: string | null; stripe_customer_id: string | null
          stripe_subscription_id: string | null; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; name: string; logo_url?: string | null; industry?: string | null
          subscription_plan?: SubscriptionPlan; subscription_status?: SubscriptionStatus | null
          google_account_id?: string | null; auto_reply_enabled?: boolean
          low_rating_threshold?: number; notification_email?: string | null
          notification_whatsapp?: string | null; stripe_customer_id?: string | null
          stripe_subscription_id?: string | null; created_at?: string; updated_at?: string
        }
        Update: {
          name?: string; logo_url?: string | null; industry?: string | null
          subscription_plan?: SubscriptionPlan; subscription_status?: SubscriptionStatus | null
          google_account_id?: string | null; auto_reply_enabled?: boolean
          low_rating_threshold?: number; notification_email?: string | null
          notification_whatsapp?: string | null; stripe_customer_id?: string | null
          stripe_subscription_id?: string | null; updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: { id: string; business_id: string | null; full_name: string; role: UserRole; avatar_url: string | null; created_at: string }
        Insert: { id: string; business_id?: string | null; full_name: string; role?: UserRole; avatar_url?: string | null; created_at?: string }
        Update: { business_id?: string | null; full_name?: string; role?: UserRole; avatar_url?: string | null }
        Relationships: []
      }
      branches: {
        Row: { id: string; business_id: string; google_location_id: string | null; name: string; address: string | null; phone: string | null; city: string | null; is_active: boolean; created_at: string }
        Insert: { id?: string; business_id: string; google_location_id?: string | null; name: string; address?: string | null; phone?: string | null; city?: string | null; is_active?: boolean; created_at?: string }
        Update: { business_id?: string; google_location_id?: string | null; name?: string; address?: string | null; phone?: string | null; city?: string | null; is_active?: boolean }
        Relationships: []
      }
      google_tokens: {
        Row: { id: string; business_id: string; access_token: string; refresh_token: string; expires_at: string; expiry_date: string | null; scope: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; business_id: string; access_token: string; refresh_token: string; expires_at: string; expiry_date?: string | null; scope?: string | null; created_at?: string; updated_at?: string }
        Update: { access_token?: string; refresh_token?: string; expires_at?: string; expiry_date?: string | null; scope?: string | null; updated_at?: string }
        Relationships: []
      }
      reviews: {
        Row: { id: string; branch_id: string; google_review_id: string; google_review_name: string | null; reviewer_name: string; reviewer_profile_photo: string | null; rating: number; review_text: string | null; review_date: string | null; review_time: string | null; reply_status: ReplyStatus; sentiment: SentimentType | null; tags: string[] | null; ai_suggested_reply: string | null; created_at: string }
        Insert: { id?: string; branch_id: string; google_review_id: string; google_review_name?: string | null; reviewer_name: string; reviewer_profile_photo?: string | null; rating: number; review_text?: string | null; review_date?: string | null; review_time?: string | null; reply_status?: ReplyStatus; sentiment?: SentimentType | null; tags?: string[] | null; ai_suggested_reply?: string | null; created_at?: string }
        Update: { google_review_name?: string | null; reviewer_name?: string; rating?: number; review_text?: string | null; review_date?: string | null; review_time?: string | null; reply_status?: ReplyStatus; sentiment?: SentimentType | null; tags?: string[] | null; ai_suggested_reply?: string | null }
        Relationships: []
      }
      replies: {
        Row: { id: string; review_id: string; reply_text: string; reply_source: ReplySource; posted_to_google: boolean; posted_at: string | null; created_at: string }
        Insert: { id?: string; review_id: string; reply_text: string; reply_source: ReplySource; posted_to_google?: boolean; posted_at?: string | null; created_at?: string }
        Update: { reply_text?: string; reply_source?: ReplySource; posted_to_google?: boolean; posted_at?: string | null }
        Relationships: []
      }
      review_tags: {
        Row: { id: string; review_id: string; tag: string; created_at: string }
        Insert: { id?: string; review_id: string; tag: string; created_at?: string }
        Update: { tag?: string }
        Relationships: []
      }
      alerts: {
        Row: { id: string; business_id: string; branch_id: string | null; review_id: string | null; alert_type: AlertType; sent_via: NotificationChannel | null; is_read: boolean; created_at: string }
        Insert: { id?: string; business_id: string; branch_id?: string | null; review_id?: string | null; alert_type: AlertType; sent_via?: NotificationChannel | null; is_read?: boolean; created_at?: string }
        Update: { alert_type?: AlertType; sent_via?: NotificationChannel | null; is_read?: boolean }
        Relationships: []
      }
      ai_summaries: {
        Row: { id: string; branch_id: string; summary_type: SummaryType; summary_text: string; period_start: string | null; period_end: string | null; created_at: string }
        Insert: { id?: string; branch_id: string; summary_type: SummaryType; summary_text: string; period_start?: string | null; period_end?: string | null; created_at?: string }
        Update: { summary_text?: string; period_start?: string | null; period_end?: string | null }
        Relationships: []
      }
      team_invitations: {
        Row: { id: string; business_id: string; email: string; role: UserRole; invited_by: string | null; token: string; accepted: boolean; expires_at: string; created_at: string }
        Insert: { id?: string; business_id: string; email: string; role: UserRole; invited_by?: string | null; token?: string; accepted?: boolean; expires_at?: string; created_at?: string }
        Update: { role?: UserRole; accepted?: boolean; expires_at?: string }
        Relationships: []
      }
      sync_logs: {
        Row: { id: string; business_id: string; branch_id: string | null; status: string; reviews_fetched: number; reviews_inserted: number; error_message: string | null; started_at: string; completed_at: string | null }
        Insert: { id?: string; business_id: string; branch_id?: string | null; status: string; reviews_fetched?: number; reviews_inserted?: number; error_message?: string | null; started_at?: string; completed_at?: string | null }
        Update: { status?: string; reviews_fetched?: number; reviews_inserted?: number; error_message?: string | null; completed_at?: string | null }
        Relationships: []
      }
    }
    Views: {
      branch_stats: {
        Row: { branch_id: string; branch_name: string; business_id: string; total_reviews: number; avg_rating: number; negative_count: number; positive_count: number; negative_percentage: number; last_review_date: string | null }
        Relationships: []
      }
    }
    Functions: {
      get_user_business_id: { Args: Record<PropertyKey, never>; Returns: string }
      get_user_role: { Args: Record<PropertyKey, never>; Returns: UserRole }
      get_branch_stats_for_user: { Args: Record<PropertyKey, never>; Returns: Database['public']['Views']['branch_stats']['Row'][] }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

export type Business = Database['public']['Tables']['businesses']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Branch = Database['public']['Tables']['branches']['Row']
export type GoogleToken = Database['public']['Tables']['google_tokens']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Reply = Database['public']['Tables']['replies']['Row']
export type ReviewTag = Database['public']['Tables']['review_tags']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type AiSummary = Database['public']['Tables']['ai_summaries']['Row']
export type TeamInvitation = Database['public']['Tables']['team_invitations']['Row']
export type SyncLog = Database['public']['Tables']['sync_logs']['Row']
export type BranchStats = Database['public']['Views']['branch_stats']['Row']

export type ReviewWithBranch = Review & {
  branches: Branch
  replies?: Reply[]
  review_tags?: ReviewTag[]
}

export type AlertWithReview = Alert & {
  reviews?: ReviewWithBranch | null
  branches?: Branch | null
}
