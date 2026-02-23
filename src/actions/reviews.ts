'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function postReply(reviewId: string, replyText: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || !['owner', 'manager'].includes(userData.role ?? '')) {
    throw new Error('Unauthorized: only owners and managers can reply')
  }

  // Verify review belongs to this business
  const { data: review } = await supabase
    .from('reviews')
    .select('id, branch_id, branches!inner(business_id)')
    .eq('id', reviewId)
    .single()

  if (!review || (review.branches as { business_id: string }).business_id !== userData.business_id) {
    throw new Error('Review not found')
  }

  // Upsert reply
  const { error: replyError } = await supabase
    .from('replies')
    .upsert({
      review_id: reviewId,
      reply_text: replyText,
      reply_source: 'manual',
      posted_to_google: false,
    })

  if (replyError) throw new Error(replyError.message)

  // Update review reply_status
  await supabase
    .from('reviews')
    .update({ reply_status: 'manual_replied' })
    .eq('id', reviewId)

  revalidatePath('/dashboard/reviews')
  revalidatePath('/dashboard/alerts')
}

export async function markReviewRead(reviewId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('review_id', reviewId)

  revalidatePath('/dashboard/alerts')
}
