import { createAdminClient } from '@/lib/supabase/server'
import { analyzeReview } from '@/lib/ai/analyze'

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
            console.error(`Failed to fetch reviews for branch ${branchId}:`, data)
            throw new Error(`Google API Error: ${data.error?.message || 'Unknown error'}`)
        }

        const googleReviews = data.reviews || []
        reviewsFetched += googleReviews.length

        for (const review of googleReviews) {
            // 1. Check if review already exists
            const { data: existingReview } = await supabase
                .from('reviews')
                .select('id')
                .eq('google_review_id', review.reviewId)
                .single()

            if (existingReview) continue

            // 2. Insert new review
            const { data: newReview, error: insertError } = await supabase
                .from('reviews')
                .insert({
                    branch_id: branchId,
                    google_review_id: review.reviewId,
                    reviewer_name: review.reviewer.displayName,
                    reviewer_profile_photo: review.reviewer.profilePhotoUrl,
                    rating: review.starRating === 'FIVE' ? 5 :
                        review.starRating === 'FOUR' ? 4 :
                            review.starRating === 'THREE' ? 3 :
                                review.starRating === 'TWO' ? 2 : 1,
                    review_text: review.comment,
                    review_time: review.createTime,
                })
                .select()
                .single()

            if (insertError) {
                console.error('Failed to insert review:', insertError)
                continue
            }

            reviewsInserted++

            // 3. Trigger AI Analysis
            try {
                const aiResult = await analyzeReview(review.comment || '')

                await supabase
                    .from('reviews')
                    .update({
                        sentiment: aiResult.sentiment,
                        ai_suggested_reply: aiResult.suggestedReply,
                    })
                    .eq('id', newReview.id)

                // Store tags
                if (aiResult.tags && aiResult.tags.length > 0) {
                    const tagInserts = aiResult.tags.map((tag: string) => ({
                        review_id: newReview.id,
                        tag: tag,
                    }))
                    await supabase.from('review_tags').insert(tagInserts)
                }

                // 4. Create alert for low ratings
                if (newReview.rating <= 2) {
                    await supabase.from('alerts').insert({
                        business_id: businessId,
                        branch_id: branchId,
                        review_id: newReview.id,
                        alert_type: 'low_rating',
                    })
                }
            } catch (aiError) {
                console.error(`AI Analysis failed for review ${newReview.id}:`, aiError)
            }
        }

        nextPageToken = data.nextPageToken
    } while (nextPageToken)

    return { reviewsFetched, reviewsInserted }
}

export async function postReplyToGoogle(
    businessId: string,
    googleReviewName: string,
    replyText: string
) {
    const { getValidAccessToken } = await import('@/lib/google/token')
    const accessToken = await getValidAccessToken(businessId)

    const url = `https://mybusiness.googleapis.com/v1/${googleReviewName}/reply`
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: replyText }),
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`Google API Error: ${err.error?.message ?? 'Unknown error'}`)
    }

    return await response.json()
}
