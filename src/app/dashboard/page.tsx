import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/stats-card'
import { getBusinessStats, getMonthlyReviewTrend, getRatingDistribution } from '@/lib/analytics'
import { Star, MessageSquare, TrendingDown, TrendingUp, MapPin } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RatingBarChart } from '@/components/dashboard/charts/rating-bar-chart'
import { MonthlyLineChart } from '@/components/dashboard/charts/monthly-line-chart'
import { BranchTable } from '@/components/dashboard/branch-table'
import type { BranchStats } from '@/types/database'

export const revalidate = 60

export default async function DashboardPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('*, businesses(*)')
        .eq('id', user.id)
        .single()

    if (!userData?.business_id) redirect('/onboarding')

    const [stats, monthlyTrend, ratingDist, branchStatsResult] = await Promise.all([
        getBusinessStats(userData.business_id),
        getMonthlyReviewTrend(userData.business_id),
        getRatingDistribution(userData.business_id),
        supabase
            .from('branch_stats')
            .select('*')
            .eq('business_id', userData.business_id)
            .order('total_reviews', { ascending: false })
            .limit(5),
    ])

    const topBranches: BranchStats[] = branchStatsResult.data ?? []

    const hasBranches = topBranches.length > 0

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user.user_metadata?.full_name || 'User'}. Here&apos;s what&apos;s happening with your reviews.
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Average Rating"
                    value={stats.avgRating}
                    icon={Star}
                    description="Across all branches"
                />
                <StatsCard
                    title="Total Reviews"
                    value={stats.totalReviews}
                    icon={MessageSquare}
                    description="All time"
                />
                <StatsCard
                    title="New This Month"
                    value={stats.newReviews}
                    icon={TrendingUp}
                    description="In the last 30 days"
                />
                <StatsCard
                    title="Negative Rate"
                    value={`${stats.negativePercent}%`}
                    icon={TrendingDown}
                    description="1–2 star reviews"
                />
            </div>

            {/* Charts */}
            {hasBranches ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Card className="col-span-4">
                        <CardHeader>
                            <CardTitle>Monthly Review Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MonthlyLineChart data={monthlyTrend} />
                        </CardContent>
                    </Card>

                    <Card className="col-span-3">
                        <CardHeader>
                            <CardTitle>Rating Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RatingBarChart data={ratingDist} />
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Branch comparison table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        Top Branches by Review Count
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {hasBranches ? (
                        <BranchTable branches={topBranches} />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg">
                            <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
                            <h3 className="font-medium">No branches connected yet</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Connect your Google Business Profile in{' '}
                                <a href="/dashboard/settings" className="text-primary underline">
                                    Settings
                                </a>{' '}
                                to start syncing reviews.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
