import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/stats-card'
import { getBusinessStats, getMonthlyReviewTrend, getRatingDistribution } from '@/lib/analytics'
import { Star, MessageSquare, TrendingDown, TrendingUp, MapPin, AlertTriangle, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { RatingBarChart } from '@/components/dashboard/charts/rating-bar-chart'
import { MonthlyLineChart } from '@/components/dashboard/charts/monthly-line-chart'
import { BranchTable } from '@/components/dashboard/branch-table'
import type { BranchStats } from '@/types/database'

type AlertWithDetails = {
    id: string
    alert_type: string
    review_id: string | null
    reviews: { review_text: string | null; branches: { name: string } | null } | null
    created_at: string
}

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

    const [stats, monthlyTrend, ratingDist, branchStatsResult, alertsResult] = await Promise.all([
        getBusinessStats(userData.business_id),
        getMonthlyReviewTrend(userData.business_id),
        getRatingDistribution(userData.business_id),
        supabase
            .from('branch_stats')
            .select('*')
            .eq('business_id', userData.business_id)
            .order('total_reviews', { ascending: false })
            .limit(5),
        supabase
            .from('alerts')
            .select('*, reviews(review_text, branches(name))')
            .eq('business_id', userData.business_id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5),
    ])

    const topBranches: BranchStats[] = branchStatsResult.data ?? []
    const recentAlerts = (alertsResult.data ?? []) as unknown as AlertWithDetails[]

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

            {/* Unread Alerts widget */}
            {recentAlerts.length > 0 && (
                <Card className="border-l-4 border-l-destructive">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Unread Alerts
                            <Badge variant="destructive">{recentAlerts.length}</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/alerts" className="flex items-center gap-1 text-xs">
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentAlerts.map((alert) => (
                            <div key={alert.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {alert.alert_type === 'low_rating' ? 'Critical Low Rating' : 'Alert'}
                                        {alert.reviews?.branches?.name && (
                                            <span className="text-muted-foreground font-normal"> · {alert.reviews.branches.name}</span>
                                        )}
                                    </p>
                                    {alert.reviews?.review_text && (
                                        <p className="text-xs text-muted-foreground truncate max-w-[400px] italic mt-0.5">
                                            &ldquo;{alert.reviews.review_text}&rdquo;
                                        </p>
                                    )}
                                </div>
                                {alert.review_id && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" asChild>
                                        <Link href={`/dashboard/reviews?id=${alert.review_id}`}>Reply</Link>
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

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
