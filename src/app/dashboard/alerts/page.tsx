'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle2, ArrowRight, BellOff } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { markAlertRead, markAllAlertsRead } from '@/actions/alerts'
import type { Alert } from '@/types/database'

type AlertWithRelations = Alert & {
    reviews: {
        review_text: string | null
        branches: { name: string } | null
    } | null
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<AlertWithRelations[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()
    const supabase = createClient()

    async function loadAlerts() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (!userData?.business_id) return

        const { data } = await supabase
            .from('alerts')
            .select('*, reviews(review_text, branches(name))')
            .eq('business_id', userData.business_id)
            .order('created_at', { ascending: false })

        setAlerts((data ?? []) as unknown as AlertWithRelations[])
        setLoading(false)
    }

    useEffect(() => { loadAlerts() }, [])

    const unreadCount = alerts.filter(a => !a.is_read).length

    const handleMarkRead = (alertId: string) => {
        startTransition(async () => {
            await markAlertRead(alertId)
            setAlerts(prev =>
                prev.map(a => a.id === alertId ? { ...a, is_read: true } : a)
            )
        })
    }

    const handleMarkAllRead = () => {
        startTransition(async () => {
            await markAllAlertsRead()
            setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
        })
    }

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-secondary/30 rounded-lg animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        Alerts
                        {unreadCount > 0 && (
                            <Badge variant="destructive">{unreadCount} new</Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground">
                        Critical reviews that require immediate attention.
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                    >
                        Mark all as read
                    </Button>
                )}
            </div>

            <div className="space-y-4">
                {alerts.map((alert) => (
                    <Card
                        key={alert.id}
                        className={!alert.is_read ? 'border-l-4 border-l-destructive' : ''}
                    >
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className={`mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                                        !alert.is_read
                                            ? 'bg-destructive/10 text-destructive'
                                            : 'bg-secondary text-muted-foreground'
                                    }`}>
                                        {!alert.is_read
                                            ? <AlertTriangle className="h-5 w-5" />
                                            : <CheckCircle2 className="h-5 w-5" />
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">
                                                {alert.alert_type === 'low_rating'
                                                    ? 'Critical Low Rating'
                                                    : alert.alert_type === 'negative_sentiment'
                                                        ? 'Negative Sentiment Detected'
                                                        : alert.alert_type === 'no_reply'
                                                            ? 'Review Awaiting Reply'
                                                            : 'Spike Detected'}
                                            </h3>
                                            {!alert.is_read && (
                                                <Badge variant="destructive">New</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                                            {alert.reviews?.branches?.name && (
                                                <>
                                                    <span>•</span>
                                                    <span className="font-medium">
                                                        {alert.reviews.branches.name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {alert.reviews?.review_text && (
                                            <p className="text-muted-foreground mt-2 line-clamp-2 italic text-sm">
                                                &ldquo;{alert.reviews.review_text}&rdquo;
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    {alert.review_id && (
                                        <Button size="sm" asChild>
                                            <Link href={`/dashboard/reviews?id=${alert.review_id}`}>
                                                Reply
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                    {!alert.is_read && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleMarkRead(alert.id)}
                                            disabled={isPending}
                                        >
                                            Dismiss
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {alerts.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg bg-secondary/30">
                        <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No alerts</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            You&apos;ll see alerts here when low-rated reviews need attention.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
