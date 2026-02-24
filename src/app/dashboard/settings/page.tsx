'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Building2, Bell, Sparkles, Trash2, Loader2 } from 'lucide-react'
import { ConnectGoogleButton } from '@/components/dashboard/connect-google-button'
import { disconnectGoogle, deleteBusiness } from '@/actions/business'
import { updateSettings } from '@/actions/settings'
import { useToast } from '@/components/ui/use-toast'
import type { Business, User } from '@/types/database'

type UserWithBusiness = User & { businesses: Business | null }

export default function SettingsPage() {
    const { toast } = useToast()
    const [isPending, startTransition] = useTransition()
    const [userData, setUserData] = useState<UserWithBusiness | null>(null)
    const [isGoogleConnected, setIsGoogleConnected] = useState(false)
    const [googleAccountId, setGoogleAccountId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const [businessName, setBusinessName] = useState('')
    const [notificationEmail, setNotificationEmail] = useState('')
    const [notificationWhatsapp, setNotificationWhatsapp] = useState('')
    const [autoReplyEnabled, setAutoReplyEnabled] = useState(false)
    const [lowRatingThreshold, setLowRatingThreshold] = useState(2)

    const supabase = createClient()

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('users')
                .select('*, businesses(*)')
                .eq('id', user.id)
                .single()

            if (!data?.businesses) return

            const biz = data.businesses as Business
            setUserData(data as UserWithBusiness)
            setBusinessName(biz.name ?? '')
            setNotificationEmail(biz.notification_email ?? '')
            setNotificationWhatsapp(biz.notification_whatsapp ?? '')
            setAutoReplyEnabled(biz.auto_reply_enabled ?? false)
            setLowRatingThreshold(biz.low_rating_threshold ?? 2)

            const { data: tokenData } = await supabase
                .from('google_tokens')
                .select('google_account_id')
                .eq('business_id', biz.id)
                .maybeSingle()

            setIsGoogleConnected(!!tokenData)
            setGoogleAccountId(tokenData?.google_account_id ?? null)
            setLoading(false)
        }
        load()
    }, [])

    const handleSaveSettings = () => {
        startTransition(async () => {
            try {
                await updateSettings({
                    businessName,
                    notificationEmail,
                    notificationWhatsapp,
                    autoReplyEnabled,
                    lowRatingThreshold,
                })
                toast({ title: 'Settings saved', description: 'Your preferences have been updated.' })
            } catch (err: unknown) {
                toast({
                    title: 'Failed to save',
                    description: err instanceof Error ? err.message : 'Unknown error',
                    variant: 'destructive',
                })
            }
        })
    }

    const handleDeleteBusiness = () => {
        if (!confirm('This will permanently delete your business and all data. Are you sure?')) return
        startTransition(async () => {
            try {
                await deleteBusiness()
            } catch (err: unknown) {
                toast({
                    title: 'Delete failed',
                    description: err instanceof Error ? err.message : 'Unknown error',
                    variant: 'destructive',
                })
            }
        })
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-secondary/30 rounded-xl animate-pulse" />
                ))}
            </div>
        )
    }

    const biz = userData?.businesses as Business | null
    const role = userData?.role

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your business configuration and preferences.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Business Profile */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            Business Profile
                        </CardTitle>
                        <CardDescription>Core details about your organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            {['owner', 'manager'].includes(role ?? '') ? (
                                <Input
                                    id="businessName"
                                    value={businessName}
                                    onChange={e => setBusinessName(e.target.value)}
                                    placeholder="Your Business Name"
                                />
                            ) : (
                                <div className="p-2 border border-border rounded bg-secondary text-sm">
                                    {businessName}
                                </div>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground italic">
                            Subscription Plan:{' '}
                            <span className="capitalize font-semibold text-primary">
                                {biz?.subscription_plan ?? 'free'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* AI & Automation */}
                {['owner', 'manager'].includes(role ?? '') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI &amp; Automation
                            </CardTitle>
                            <CardDescription>Configure review analysis behavior</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <div>
                                    <p className="text-sm font-medium">Enable Auto-Replies</p>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically post AI-generated replies to Google
                                    </p>
                                </div>
                                <Switch
                                    checked={autoReplyEnabled}
                                    onCheckedChange={setAutoReplyEnabled}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="threshold">
                                    Low Rating Alert Threshold (1–3 stars)
                                </Label>
                                <Input
                                    id="threshold"
                                    type="number"
                                    min={1}
                                    max={3}
                                    value={lowRatingThreshold}
                                    onChange={e =>
                                        setLowRatingThreshold(Number(e.target.value))
                                    }
                                    className="w-24"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Reviews at or below this rating generate an alert.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Notifications */}
                {['owner', 'manager'].includes(role ?? '') && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-primary" />
                                Notification Settings
                            </CardTitle>
                            <CardDescription>How and when you&apos;ll be alerted</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="notifEmail">Notification Email</Label>
                                <Input
                                    id="notifEmail"
                                    type="email"
                                    placeholder="alerts@yourbusiness.com"
                                    value={notificationEmail}
                                    onChange={e => setNotificationEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notifWhatsapp">WhatsApp Number</Label>
                                <Input
                                    id="notifWhatsapp"
                                    type="tel"
                                    placeholder="+1234567890"
                                    value={notificationWhatsapp}
                                    onChange={e => setNotificationWhatsapp(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Google Connection */}
                {role === 'owner' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Google Business Connection</CardTitle>
                            <CardDescription>
                                Manage your Google Business Profile authentication
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ConnectGoogleButton
                                isConnected={isGoogleConnected}
                                googleAccountId={googleAccountId}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Save button */}
            {['owner', 'manager'].includes(role ?? '') && (
                <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={isPending} className="gap-2">
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </div>
            )}

            {/* Danger Zone — owner only */}
            {role === 'owner' && (
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>
                            Irreversible actions — proceed with caution.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            className="gap-2"
                            onClick={handleDeleteBusiness}
                            disabled={isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Business &amp; All Data
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
