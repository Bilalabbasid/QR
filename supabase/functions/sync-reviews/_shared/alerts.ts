// Shared alerts helper for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

export type AlertType =
  | 'low_rating'
  | 'negative_sentiment'
  | 'no_reply'
  | 'spike_detected'

export async function createAlert(params: {
  businessId: string
  branchId: string
  reviewId: string
  alertType: AlertType
}) {
  const { error } = await supabase
    .from('alerts')
    .upsert(
      {
        business_id: params.businessId,
        branch_id: params.branchId,
        review_id: params.reviewId,
        alert_type: params.alertType,
        is_read: false,
      },
      { onConflict: 'review_id,alert_type' }
    )

  if (error) {
    console.error('Failed to create alert:', error)
  }
}

export async function checkNoReplyAlerts(businessId: string) {
  // Find reviews older than 48h with no reply
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, branch_id, branches!inner(business_id)')
    .eq('branches.business_id', businessId)
    .eq('reply_status', 'not_replied')
    .lt('review_time', cutoff)

  for (const review of reviews ?? []) {
    await createAlert({
      businessId,
      branchId: review.branch_id,
      reviewId: review.id,
      alertType: 'no_reply',
    })
  }
}
