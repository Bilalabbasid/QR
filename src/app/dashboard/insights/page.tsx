import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAIInsights } from '@/lib/analytics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

    // Using a simplified fetch for now as custom RPCs might not be deployed yet
    const { data: branches } = await supabase.from('branches').select('id').eq('business_id', userData.business_id)
    const branchIds = branches?.map(b => b.id) || []

    const { data: reviews } = await supabase
        .from('reviews')
        .select('sentiment, rating')
        .in('branch_id', branchIds)

    const { data: tags } = await supabase
        .from('review_tags')
        .select('tag')
        .in('review_id', reviews?.map(r => r.id) || [])

    // Process data manually for now
    const sentiments = {
        positive: reviews?.filter(r => r.sentiment === 'positive').length || 0,
        neutral: reviews?.filter(r => r.sentiment === 'neutral').length || 0,
        negative: reviews?.filter(r => r.sentiment === 'negative').length || 0,
    }

    const tagCounts: Record<string, number> = {}
    tags?.forEach(t => {
        tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1
    })
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Deep dive into the customer sentiment and key topics mentioned in your reviews.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-purple-500" />
                            Sentiment distribution
                        </CardTitle>
                        <CardDescription>Overall customer mood breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-emerald-600 font-medium">
                                <ThumbsUp className="h-4 w-4" /> Positive
                            </span>
                            <span>{sentiments.positive}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                            <div
                                className="bg-emerald-500 h-2 rounded-full"
                                style={{ width: `${(sentiments.positive / (reviews?.length || 1)) * 100}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-slate-600 font-medium">
                                <MessageCircle className="h-4 w-4" /> Neutral
                            </span>
                            <span>{sentiments.neutral}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                            <div
                                className="bg-slate-400 h-2 rounded-full"
                                style={{ width: `${(sentiments.neutral / (reviews?.length || 1)) * 100}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-red-600 font-medium">
                                <ThumbsDown className="h-4 w-4" /> Negative
                            </span>
                            <span>{sentiments.negative}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                            <div
                                className="bg-red-500 h-2 rounded-full"
                                style={{ width: `${(sentiments.negative / (reviews?.length || 1)) * 100}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            Trending Topics
                        </CardTitle>
                        <CardDescription>What customers are talking about most</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {sortedTags.map(([tag, count]) => (
                                <div key={tag} className="flex flex-col items-center p-4 border rounded-xl min-w-[120px] bg-slate-50/50 dark:bg-slate-900/50">
                                    <span className="text-sm font-semibold capitalize">{tag}</span>
                                    <span className="text-2xl font-bold text-blue-600">{count}</span>
                                    <span className="text-xs text-slate-500">mentions</span>
                                </div>
                            ))}
                            {sortedTags.length === 0 && (
                                <p className="text-center text-slate-500 italic w-full py-8">
                                    Not enough data yet to identify common topics.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
