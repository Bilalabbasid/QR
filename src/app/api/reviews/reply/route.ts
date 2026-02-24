import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { postReplyToGoogle } from '@/lib/ai/post-reply'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { reviewId, replyText } = await req.json()
    if (!reviewId || !replyText?.trim()) {
      return NextResponse.json({ error: 'reviewId and replyText are required' }, { status: 400 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.business_id || !['owner', 'manager'].includes(userData.role ?? '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get review + branch + google name
    const { data: review } = await supabase
      .from('reviews')
      .select('google_review_id, google_review_name, branch_id, branches!inner(business_id, google_location_id)')
      .eq('id', reviewId)
      .single()

    if (!review || (review.branches as { business_id: string }).business_id !== userData.business_id) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Post to Google if credentials exist
    let postedToGoogle = false
    try {
      const locationId = (review.branches as { google_location_id: string | null }).google_location_id ?? ''
      await postReplyToGoogle(userData.business_id, locationId, review.google_review_id, replyText)
      postedToGoogle = true
    } catch (googleErr) {
      console.error('Google reply failed:', googleErr)
      // Still save reply locally even if Google post fails
    }

    // Upsert reply record
    const { error: upsertError } = await supabase
      .from('replies')
      .upsert({
        review_id: reviewId,
        reply_text: replyText,
        reply_source: 'manual',
        posted_to_google: postedToGoogle,
      })

    if (upsertError) throw upsertError

    // Update review status
    await supabase
      .from('reviews')
      .update({ reply_status: 'manual_replied' })
      .eq('id', reviewId)

    return NextResponse.json({ success: true, postedToGoogle })
  } catch (err) {
    console.error('[POST /api/reviews/reply]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
