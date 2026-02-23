import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Bell, Sparkles } from 'lucide-react'
import { ConnectGoogleButton } from '@/components/dashboard/connect-google-button'

export default async function SettingsPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('*, businesses(*)')
        .eq('id', user.id)
        .single()

    if (!userData?.businesses) redirect('/onboarding')

    const biz = userData.businesses
    const role = userData.role

    const { data: googleToken } = await supabase
        .from('google_tokens')
        .select('google_account_id')
        .eq('business_id', biz.id)
        .maybeSingle()

    const isGoogleConnected = !!googleToken

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your business configurations and core preferences.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            Business Profile
                        </CardTitle>
                        <CardDescription>Core details about your organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Business Name</label>
                            <div className="p-2 border border-border rounded bg-secondary">
                                {biz.name}
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground italic">
                            Subscription Plan:{' '}
                            <span className="capitalize font-semibold text-primary">
                                {biz.subscription_plan}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {['owner', 'manager'].includes(role) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI &amp; Automation
                            </CardTitle>
                            <CardDescription>Configure how review analysis behaves</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <span className="text-sm font-medium">Enable Auto-Replies</span>
                                <div className={`w-10 h-5 rounded-full relative ${biz.auto_reply_enabled ? 'bg-primary' : 'bg-secondary'}`}>
                                    <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all ${biz.auto_reply_enabled ? 'left-[22px]' : 'left-0.5'}`} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <span className="text-sm font-medium">Analyze Sentiment Automatically</span>
                                <div className="w-10 h-5 rounded-full relative bg-primary">
                                    <div className="absolute top-0.5 left-[22px] h-4 w-4 bg-white rounded-full" />
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button size="sm" variant="outline" className="w-full">Adjust Thresholds</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                                googleAccountId={googleToken?.google_account_id}
                            />
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-amber-500" />
                            Notification Settings
                        </CardTitle>
                        <CardDescription>How and when you want to be alerted</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between py-3 border-b border-border">
                            <span className="text-sm font-medium">Daily Summary Email</span>
                            <div className="w-10 h-5 rounded-full relative bg-primary">
                                <div className="absolute top-0.5 left-[22px] h-4 w-4 bg-white rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-border">
                            <span className="text-sm font-medium">Critical Rating Alerts (Email)</span>
                            <div className="w-10 h-5 rounded-full relative bg-primary">
                                <div className="absolute top-0.5 left-[22px] h-4 w-4 bg-white rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-3 border-border">
                            <span className="text-sm font-medium">New Review Push Notifications</span>
                            <div className="w-10 h-5 rounded-full relative bg-secondary">
                                <div className="absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
