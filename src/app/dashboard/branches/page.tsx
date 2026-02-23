import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, RefreshCw, ExternalLink, Star, MessageSquare, TrendingDown } from 'lucide-react'
import type { BranchStats } from '@/types/database'

export default async function BranchesPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

    if (!userData?.business_id) redirect('/onboarding')

    // Fetch branches + their stats from branch_stats view in parallel
    const [{ data: branches, error }, { data: stats }] = await Promise.all([
        supabase
            .from('branches')
            .select('*')
            .eq('business_id', userData.business_id)
            .order('name', { ascending: true }),
        supabase
            .from('branch_stats')
            .select('*')
            .eq('business_id', userData.business_id),
    ])

    if (error) throw error

    // Map stats by branch id for fast lookup
    const statsMap: Record<string, BranchStats> = {}
    stats?.forEach(s => { statsMap[s.branch_id] = s })

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
                    <p className="text-muted-foreground">
                        All your connected Google Business Profile locations.
                    </p>
                </div>
                {['owner', 'manager'].includes(userData.role) && (
                    <Button variant="outline" className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Sync All
                    </Button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {branches?.map((branch) => {
                    const s = statsMap[branch.id]
                    const avgRating = s ? Number(s.avg_rating).toFixed(1) : '—'
                    const totalReviews = s?.total_reviews ?? 0
                    const negPct = s ? Math.round(s.negative_percentage) : 0

                    return (
                        <Card key={branch.id} className="flex flex-col">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1 min-w-0">
                                    <CardTitle className="text-lg leading-tight">{branch.name}</CardTitle>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <MapPin className="mr-1 h-3 w-3 shrink-0" />
                                        <span className="truncate max-w-[200px]">{branch.address || 'No address'}</span>
                                    </div>
                                </div>
                                <Badge variant={branch.is_active ? 'default' : 'secondary'} className="shrink-0 ml-2">
                                    {branch.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </CardHeader>

                            <CardContent className="pt-2 flex-1 flex flex-col justify-between gap-4">
                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-2 text-center border border-border rounded-lg p-3 bg-secondary/30">
                                    <div>
                                        <div className="flex items-center justify-center gap-1 text-yellow-500">
                                            <Star className="h-3.5 w-3.5 fill-yellow-400" />
                                            <span className="font-bold text-sm text-foreground">{avgRating}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Avg Rating</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1">
                                            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                                            <span className="font-bold text-sm text-foreground">{totalReviews}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Reviews</p>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-center gap-1">
                                            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                                            <span className="font-bold text-sm text-foreground">{negPct}%</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">Negative</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" asChild>
                                        <Link href={`/dashboard/reviews?branch=${branch.id}`}>
                                            <MessageSquare className="h-3 w-3" />
                                            View Reviews
                                        </Link>
                                    </Button>
                                    {branch.google_location_id && (
                                        <Button variant="ghost" size="sm" className="px-2" asChild>
                                            <a
                                                href={`https://business.google.com/dashboard/l/${branch.google_location_id.split('/').pop()}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Visit Google Business Profile"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {branches?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-secondary/30">
                        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No branches connected</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            Connect your Google Business Profile to start managing your locations and reviews.
                        </p>
                        {userData.role === 'owner' && (
                            <Button className="mt-6" asChild>
                                <a href="/api/auth/google">Connect Google Account</a>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
