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
        const url = `https://mybusiness.googleapis.com/v1/${googleLocationName}/reviews?pageSize=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`

        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })

        const data = await response.json()

        if (!response.ok) {
            // 404 → branch removed from Google; mark inactive
            if (response.status === 404) {
                await supabase
                    .from('branches')
                    .update({ is_active: false })
                    .eq('id', branchId)
                console.warn(`Branch ${branchId} not found on Google — marked inactive`)
                break
            }
            // 429 → rate limit; abort this branch
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

            // Deduplication: ON CONFLICT handled by UNIQUE constraint on google_review_id
            const { data: newReview, error: insertError } = await supabase
                .from('reviews')
                .insert({
                    branch_id: branchId,
                    google_review_id: googleReviewId,
                    google_review_name: review.name as string ?? null,
                    reviewer_name: (review.reviewer as Record<string, string>)?.displayName ?? 'Anonymous',
                    reviewer_profile_photo: (review.reviewer as Record<string, string>)?.profilePhotoUrl ?? null,
                    rating: STAR_MAP[(review.starRating as string)?.toUpperCase()] ?? 3,
                    review_text: review.comment as string ?? null,
                    review_time: review.createTime as string,
                    reply_status: 'not_replied',
                })
                .select()
                .single()

            if (insertError) {
                // Unique violation = duplicate → skip silently
                if (insertError.code === '23505') continue
                console.error('Failed to insert review:', insertError)
                continue
            }

            reviewsInserted++

            // AI analysis
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
                console.error(`AI analysis failed for review ${newReview.id}:`, aiError)
            }
        }

        nextPageToken = (data.nextPageToken as string) ?? ''
    } while (nextPageToken)

    return { reviewsFetched, reviewsInserted }
}
