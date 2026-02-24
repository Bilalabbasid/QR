import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BrainCircuit, TrendingUp, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'

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
        .select('id')
        .eq('business_id', userData.business_id)

    const branchIds = branches?.map(b => b.id) ?? []

    // Fetch reviews with id included so we can join to review_tags
    const { data: reviews } = await supabase
        .from('reviews')
        .select('id, sentiment, rating')
        .in('branch_id', branchIds.length > 0 ? branchIds : ['00000000-0000-0000-0000-000000000000'])

    const reviewIds = reviews?.map(r => r.id) ?? []

    const { data: tags } = reviewIds.length > 0
        ? await supabase
            .from('review_tags')
            .select('tag')
            .in('review_id', reviewIds)
        : { data: [] }

    const sentiments = {
        positive: reviews?.filter(r => r.sentiment === 'positive').length ?? 0,
        neutral:  reviews?.filter(r => r.sentiment === 'neutral').length  ?? 0,
        negative: reviews?.filter(r => r.sentiment === 'negative').length ?? 0,
    }

    const total = (reviews?.length ?? 0) || 1

    const tagCounts: Record<string, number> = {}
    tags?.forEach(t => {
        tagCounts[t.tag] = (tagCounts[t.tag] ?? 0) + 1
    })
    const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
                <p className="text-muted-foreground">
                    Deep dive into customer sentiment and key topics across your reviews.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                            Based on {reviews?.length ?? 0} reviews
                        </p>
                    </CardContent>
                </Card>

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
        </div>
    )
}
