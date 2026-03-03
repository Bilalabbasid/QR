import { createAdminClient } from '@/lib/supabase/server'
import { analyzeReview } from '@/lib/ai/analyze'
import type { SentimentType } from '@/types/database'

const STAR_MAP: Record<string, number> = {
    FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1,
}

export async function fetchBranchReviews(
    businessId: string,
    branchId: string,
    googleLocationName: string,
    accessToken: string
) {
    const supabase = createAdminClient()
    let nextPageToken = ''
    let reviewsInserted = 0
    let reviewsFetched = 0

    do {
        const url = `https://mybusiness.googleapis.com/v4/${googleLocationName}/reviews?pageSize=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        const data = await response.json()

        if (!response.ok) {
            // 404 - branch removed from Google; mark inactive
            if (response.status === 404) {
                await supabase
                    .from('branches')
                    .update({ is_active: false })
                    .eq('id', branchId)
                console.warn(`Branch ${branchId} not found on Google - marked inactive`)
                break
            }
            // 429 - rate limit; abort this branch
            if (response.status === 429) {
                console.warn(`Rate limited fetching reviews for branch ${branchId}`)
                break
            }
            throw new Error(`Google API Error: ${data.error?.message ?? 'Unknown error'}`)
        }

        const googleReviews: Record<string, unknown>[] = data.reviews ?? []
        reviewsFetched += googleReviews.length

        for (const review of googleReviews) {
            const googleReviewId = review.reviewId as string
            // Google sends a reviewReply field if the owner has already replied
            const googleReply = review.reviewReply as Record<string, string> | undefined
            const hasGoogleReply = !!googleReply?.comment

            // --- Upsert review ---
            const { data: newReview, error: insertError } = await supabase
                .from('reviews')
                .insert({
                    branch_id: branchId,
                    google_review_id: googleReviewId,
                    google_review_name: (review.name as string | undefined) ?? null,
                    reviewer_name: (review.reviewer as Record<string, string>)?.displayName ?? 'Anonymous',
                    reviewer_profile_photo: (review.reviewer as Record<string, string>)?.profilePhotoUrl ?? null,
                    rating: STAR_MAP[(review.starRating as string)?.toUpperCase()] ?? 3,
                    review_text: (review.comment as string | undefined) ?? null,
                    review_time: review.createTime as string,
                    // Reflect any reply made directly on Google
                    reply_status: hasGoogleReply ? 'manual_replied' : 'not_replied',
                })
                .select()
                .single()

            if (insertError) {
                if (insertError.code === '23505') {
                    // Duplicate review - but still sync any reply from Google we might be missing
                    if (hasGoogleReply) {
                        const { data: existing } = await supabase
                            .from('reviews')
                            .select('id, reply_status')
                            .eq('google_review_id', googleReviewId)
                            .single()

                        if (existing && existing.reply_status === 'not_replied') {
                            await supabase.from('replies').upsert(
                                {
                                    review_id: existing.id,
                                    reply_text: googleReply!.comment,
                                    reply_source: 'manual',
                                    posted_to_google: true,
                                    posted_at: googleReply!.updateTime ?? null,
                                },
                                { onConflict: 'review_id' }
                            )
                            await supabase
                                .from('reviews')
                                .update({ reply_status: 'manual_replied' })
                                .eq('id', existing.id)
                        }
                    }
                    continue
                }
                console.error('Failed to insert review:', insertError)
                continue
            }

            reviewsInserted++

            // --- Save Google reply if present ---
            if (hasGoogleReply) {
                await supabase.from('replies').upsert(
                    {
                        review_id: newReview.id,
                        reply_text: googleReply!.comment,
                        reply_source: 'manual',
                        posted_to_google: true,
                        posted_at: googleReply!.updateTime ?? null,
                    },
                    { onConflict: 'review_id' }
                )
            }

            // --- AI analysis (optional: silently skipped when key not configured) ---
            try {
                const aiResult = await analyzeReview((review.comment as string) ?? '')

                await supabase
                    .from('reviews')
                    .update({
                        sentiment: aiResult.sentiment as SentimentType,
                        ai_suggested_reply: aiResult.suggestedReply,
                    })
                    .eq('id', newReview.id)

                if (aiResult.tags.length > 0) {
                    await supabase.from('review_tags').insert(
                        aiResult.tags.map((tag) => ({ review_id: newReview.id, tag }))
                    )
                }

                // Alert for low-rated reviews
                if (newReview.rating <= 2) {
                    await supabase.from('alerts').insert({
                        business_id: businessId,
                        branch_id: branchId,
                        review_id: newReview.id,
                        alert_type: 'low_rating',
                    })
                }
            } catch (aiError) {
                console.error(`AI analysis skipped for review ${newReview.id}:`, aiError)
            }
        }

        nextPageToken = (data.nextPageToken as string) ?? ''
    } while (nextPageToken)

    return { reviewsFetched, reviewsInserted }
}
