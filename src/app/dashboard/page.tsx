import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatsCard } from '@/components/dashboard/stats-card'
import { getDashboardStats } from '@/lib/analytics'
import {
    Users,
    MessageSquare,
    Star,
    TrendingUp,
    AlertCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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

    const stats = await getDashboardStats(userData.business_id)

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user.user_metadata.full_name || 'User'}. Here&apos;s what&apos;s happening with your reviews.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Average Rating"
                    value={stats.avgRating}
                    icon={Star}
                    trend={{ value: 2.1, label: 'from last month', isPositive: true }}
                />
                <StatsCard
                    title="Total Reviews"
                    value={stats.totalReviews}
                    icon={MessageSquare}
                    trend={{ value: 12, label: 'from last month', isPositive: true }}
                />
                <StatsCard
                    title="New Reviews"
                    value={stats.newReviews}
                    icon={TrendingUp}
                    description="In the last 30 days"
                />
                <StatsCard
                    title="Positive Sentiment"
                    value={`${stats.positivePercent}%`}
                    icon={Users}
                    trend={{ value: 5, label: 'from last month', isPositive: true }}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Rating Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-lg m-6">
                        <div className="text-center space-y-2">
                            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">Chart implementation in progress...</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-border rounded-lg">
                            <div className="text-center space-y-2">
                                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                                <p className="text-sm text-muted-foreground">No critical alerts at the moment.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
