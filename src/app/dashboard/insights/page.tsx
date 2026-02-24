import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BrainCircuit, TrendingUp, ThumbsUp, ThumbsDown, MessageCircle, MapPin } from 'lucide-react'
import type { BranchStats } from '@/types/database'

export default async function InsightsPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()

    if (!userData?.business_id) redirect('/onboarding')

    const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('business_id', userData.business_id)

    const branchIds = branches?.map(b => b.id) ?? []

    // Aggregate reviews + branch_stats in parallel
    const [reviewsResult, tagsResult, branchStatsResult] = await Promise.all([
        supabase
            .from('reviews')
            .select('id, sentiment, rating, branch_id')
            .in('branch_id', branchIds.length > 0 ? branchIds : ['00000000-0000-0000-0000-000000000000']),
        branchIds.length > 0
            ? supabase
                .from('review_tags')
                .select('tag, review_id')
            : Promise.resolve({ data: [] }),
        supabase
            .from('branch_stats')
            .select('*')
            .eq('business_id', userData.business_id)
            .order('total_reviews', { ascending: false }),
    ])

    const reviews = reviewsResult.data ?? []
    const allTags = tagsResult.data ?? []
    const branchStats: BranchStats[] = branchStatsResult.data ?? []

    // Filter tags to only those belonging to this business's reviews
    const reviewIdSet = new Set(reviews.map(r => r.id))
    const tags = allTags.filter(t => reviewIdSet.has(t.review_id))

    const sentiments = {
        positive: reviews.filter(r => r.sentiment === 'positive').length,
        neutral:  reviews.filter(r => r.sentiment === 'neutral').length,
        negative: reviews.filter(r => r.sentiment === 'negative').length,
    }

    const total = reviews.length || 1

    const tagCounts: Record<string, number> = {}
    tags.forEach(t => {
        tagCounts[t.tag] = (tagCounts[t.tag] ?? 0) + 1
    })
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

    // Per-branch sentiment derived from branch_stats view
    const branchSentimentMap: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {}
    reviews.forEach(r => {
        if (!r.branch_id) return
        if (!branchSentimentMap[r.branch_id]) {
            branchSentimentMap[r.branch_id] = { positive: 0, neutral: 0, negative: 0, total: 0 }
        }
        branchSentimentMap[r.branch_id].total++
        if (r.sentiment === 'positive') branchSentimentMap[r.branch_id].positive++
        else if (r.sentiment === 'neutral')  branchSentimentMap[r.branch_id].neutral++
        else if (r.sentiment === 'negative') branchSentimentMap[r.branch_id].negative++
    })

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
                <p className="text-muted-foreground">
                    Deep dive into customer sentiment and key topics across your reviews.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Overall Sentiment */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            Sentiment Distribution
                        </CardTitle>
                        <CardDescription>Overall customer mood breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-emerald-500 font-medium">
                                <ThumbsUp className="h-4 w-4" /> Positive
                            </span>
                            <span className="font-semibold">{sentiments.positive}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className="bg-emerald-500 h-2 rounded-full transition-all"
                                style={{ width: `${(sentiments.positive / total) * 100}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground font-medium">
                                <MessageCircle className="h-4 w-4" /> Neutral
                            </span>
                            <span className="font-semibold">{sentiments.neutral}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className="bg-slate-400 h-2 rounded-full transition-all"
                                style={{ width: `${(sentiments.neutral / total) * 100}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-destructive font-medium">
                                <ThumbsDown className="h-4 w-4" /> Negative
                            </span>
                            <span className="font-semibold">{sentiments.negative}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className="bg-destructive h-2 rounded-full transition-all"
                                style={{ width: `${(sentiments.negative / total) * 100}%` }}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                            Based on {reviews.length} reviews
                        </p>
                    </CardContent>
                </Card>

                {/* Trending Topics */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Trending Topics
                        </CardTitle>
                        <CardDescription>What customers mention most</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {sortedTags.map(([tag, count]) => (
                                <div
                                    key={tag}
                                    className="flex flex-col items-center p-4 border border-border rounded-xl min-w-[120px] bg-secondary/30"
                                >
                                    <span className="text-sm font-semibold capitalize">{tag}</span>
                                    <span className="text-2xl font-bold text-primary">{count}</span>
                                    <span className="text-xs text-muted-foreground">mentions</span>
                                </div>
                            ))}
                            {sortedTags.length === 0 && (
                                <p className="text-center text-muted-foreground italic w-full py-8">
                                    Not enough data yet. Topics appear once reviews are synced and analyzed.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Branch-by-Branch Breakdown */}
            {branchStats.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Sentiment by Branch
                        </CardTitle>
                        <CardDescription>Per-location customer mood overview</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5">
                            {branchStats.map(bs => {
                                const s = branchSentimentMap[bs.branch_id] ?? { positive: 0, neutral: 0, negative: 0, total: 0 }
                                const t = s.total || 1
                                const posPct  = Math.round((s.positive / t) * 100)
                                const neuPct  = Math.round((s.neutral  / t) * 100)
                                const negPct  = Math.round((s.negative / t) * 100)

                                return (
                                    <div key={bs.branch_id} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium truncate max-w-[60%]">{bs.branch_name}</span>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                                <span>★ {Number(bs.avg_rating).toFixed(1)}</span>
                                                <span>{bs.total_reviews} reviews</span>
                                            </div>
                                        </div>
                                        {/* Stacked progress bar */}
                                        <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-secondary">
                                            <div
                                                className="bg-emerald-500 transition-all"
                                                style={{ width: `${posPct}%` }}
                                                title={`Positive: ${posPct}%`}
                                            />
                                            <div
                                                className="bg-slate-400 transition-all"
                                                style={{ width: `${neuPct}%` }}
                                                title={`Neutral: ${neuPct}%`}
                                            />
                                            <div
                                                className="bg-red-500 transition-all"
                                                style={{ width: `${negPct}%` }}
                                                title={`Negative: ${negPct}%`}
                                            />
                                        </div>
                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                            <span className="text-emerald-500">{posPct}% positive</span>
                                            <span>{neuPct}% neutral</span>
                                            <span className="text-red-500">{negPct}% negative</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
