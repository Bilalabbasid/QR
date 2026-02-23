import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

export const getBusinessStats = unstable_cache(
    async (businessId: string) => {
        const supabase = createClient()

        // 1. Get all reviews for this business
        const { data: reviews, error } = await supabase
            .from('branch_stats')
            .select('*')
            .eq('business_id', businessId)

        if (error) throw error

        const totalReviews = reviews.reduce((acc, curr) => acc + (curr.total_reviews || 0), 0)
        const avgRating = reviews.length > 0
            ? reviews.reduce((acc, curr) => acc + (Number(curr.avg_rating) || 0), 0) / reviews.length
            : 0

        // 2. Get monthly trend (simplified for now)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { count: newReviews } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .gte('review_time', thirtyDaysAgo.toISOString())

        // 3. Positive sentiment count
        const { count: positiveReviews } = await supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('sentiment', 'positive')

        const positivePercent = totalReviews > 0
            ? Math.round(((positiveReviews || 0) / totalReviews) * 100)
            : 0

        return {
            totalReviews,
            avgRating: avgRating.toFixed(1),
            newReviews: newReviews || 0,
            positivePercent,
        }
    },
    ['business-stats'],
    { revalidate: 3600, tags: ['stats'] }
)

export async function getAIInsights(businessId: string) {
    const supabase = createClient()

    // 1. Sentiment Distribution
    const { data: sentimentData } = await supabase
        .from('reviews')
        .select('sentiment, count', { count: 'exact' })
        .eq('branches.business_id', businessId)
    // .innerJoin('branches', 'reviews.branch_id', 'branches.id')
    // Note: Supabase JS select with inner join is tricky, easier to query reviews and filter by branch set

    // Alternative: Get branch IDs first
    const { data: branches } = await supabase.from('branches').select('id').eq('business_id', businessId)
    const branchIds = branches?.map((b: { id: string }) => b.id) || []

    const { data: sentimentCounts } = await supabase
        .rpc('get_sentiment_distribution', { branch_ids: branchIds })

    // 2. Top Tags
    const { data: topTags } = await supabase
        .rpc('get_top_review_tags', { branch_ids: branchIds, tag_limit: 10 })

    return {
        sentimentDistribution: sentimentCounts || [],
        topTags: topTags || [],
    }
}
