import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'

export const getBusinessStats = unstable_cache(
    async (businessId: string) => {
        const supabase = createClient()

        // Use the branch_stats view — pre-aggregated, indexed
        const { data: branchStats, error } = await supabase
            .from('branch_stats')
            .select('*')
            .eq('business_id', businessId)

        if (error) throw error

        const totalReviews = branchStats?.reduce(
            (acc, curr) => acc + (curr.total_reviews ?? 0),
            0
        ) ?? 0

        const avgRating = branchStats && branchStats.length > 0
            ? branchStats.reduce((acc, curr) => acc + (Number(curr.avg_rating) ?? 0), 0) / branchStats.length
            : 0

        // Reviews in the last 30 days — scoped to this business via branch join
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const branchIds = branchStats?.map(b => b.branch_id) ?? []

        const { count: newReviews } = branchIds.length > 0
            ? await supabase
                .from('reviews')
                .select('*', { count: 'exact', head: true })
                .in('branch_id', branchIds)
                .gte('review_time', thirtyDaysAgo.toISOString())
            : { count: 0 }

        // Negative count from branch_stats view (reviews with rating ≤ 2)
        const negativeCount = branchStats?.reduce(
            (acc, curr) => acc + (curr.negative_count ?? 0),
            0
        ) ?? 0

        const negativePercent = totalReviews > 0
            ? Math.round((negativeCount / totalReviews) * 100)
            : 0

        return {
            totalReviews,
            avgRating: avgRating.toFixed(1),
            newReviews: newReviews ?? 0,
            negativePercent,
        }
    },
    ['business-stats'],
    { revalidate: 60, tags: ['stats'] }
)

export async function getMonthlyReviewTrend(businessId: string) {
    const supabase = createClient()

    const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('business_id', businessId)

    const branchIds = branches?.map(b => b.id) ?? []
    if (branchIds.length === 0) return []

    // Build 12-month trend from reviews table
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)

    const { data: reviews } = await supabase
        .from('reviews')
        .select('review_time, rating')
        .in('branch_id', branchIds)
        .gte('review_time', twelveMonthsAgo.toISOString())
        .order('review_time', { ascending: true })

    // Group by month
    const monthMap: Record<string, { count: number; totalRating: number }> = {}

    reviews?.forEach(r => {
        const d = new Date(r.review_time)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!monthMap[key]) monthMap[key] = { count: 0, totalRating: 0 }
        monthMap[key].count++
        monthMap[key].totalRating += r.rating
    })

    return Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { count, totalRating }]) => ({
            month,
            count,
            avgRating: count > 0 ? Number((totalRating / count).toFixed(1)) : 0,
        }))
}

export async function getRatingDistribution(businessId: string) {
    const supabase = createClient()

    const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('business_id', businessId)

    const branchIds = branches?.map(b => b.id) ?? []
    if (branchIds.length === 0) return []

    const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .in('branch_id', branchIds)

    const dist = [1, 2, 3, 4, 5].map(star => ({
        rating: star,
        count: reviews?.filter(r => r.rating === star).length ?? 0,
    }))

    return dist
}
