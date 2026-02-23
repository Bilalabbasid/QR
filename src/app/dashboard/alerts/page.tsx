import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export default async function AlertsPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()

    if (!userData?.business_id) redirect('/onboarding')

    const { data: alerts, error } = await supabase
        .from('alerts')
        .select('*, reviews(*, branches(*))')
        .eq('business_id', userData.business_id)
        .order('created_at', { ascending: false })

    if (error) throw error

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
                <p className="text-muted-foreground">
                    Monitor and address critical reviews that require immediate attention.
                </p>
            </div>

            <div className="space-y-4">
                {alerts?.map((alert) => (
                    <Card key={alert.id} className={alert.status === 'unread' ? 'border-l-4 border-l-destructive' : ''}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className={`mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                        alert.status === 'unread'
                                            ? 'bg-destructive/10 text-destructive'
                                            : 'bg-secondary text-muted-foreground'
                                    }`}>
                                        {alert.status === 'unread'
                                            ? <AlertTriangle className="h-5 w-5" />
                                            : <CheckCircle2 className="h-5 w-5" />
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">
                                                {alert.alert_type === 'low_rating' ? 'Critical Low Rating' : 'Alert'}
                                            </h3>
                                            {alert.status === 'unread' && <Badge variant="destructive">New</Badge>}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                                            <span>•</span>
                                            <span className="font-medium">{alert.reviews.branches.name}</span>
                                        </div>
                                        <p className="text-muted-foreground mt-2 line-clamp-2 italic">
                                            &ldquo;{alert.reviews.review_text}&rdquo;
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    <Button size="sm" asChild>
                                        <Link href={`/dashboard/reviews?id=${alert.review_id}`}>
                                            Reply
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm">Dismiss</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {alerts?.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-secondary/30">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                        <h3 className="text-lg font-medium">All clear!</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            You&apos;ve addressed all critical reviews. Keep up the great work!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
