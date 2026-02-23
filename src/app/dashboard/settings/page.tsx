import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch' // I'll search for this or implement a quick version
import { Settings as SettingsIcon, Building2, Bell, Google, Sparkles } from 'lucide-react'

// Simple Switch implementation since it's not in UI yet
const CustomSwitch = ({ checked, label }: { checked: boolean; label: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0 border-slate-100 dark:border-slate-800">
        <div className="flex flex-col">
            <span className="text-sm font-medium">{label}</span>
        </div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 h-4 w-4 bg-white rounded-full transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
        </div>
    </div>
)

export default async function SettingsPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: business } = await supabase
        .from('users')
        .select('*, businesses(*)')
        .eq('id', user.id)
        .single()

    if (!business?.businesses) redirect('/onboarding')

    const biz = business.businesses

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Manage your business configurations and core preferences.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-slate-500" />
                            Business Profile
                        </CardTitle>
                        <CardDescription>Core details about your organization</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Business Name</label>
                            <div className="p-2 border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700">{biz.name}</div>
                        </div>
                        <div className="grid gap-2 text-xs text-slate-500 italic">
                            Subscription Plan: <span className="capitalize font-semibold text-blue-600">{biz.subscription_plan}</span>
                        </div>
                    </CardContent>
                </Card>
                {['owner', 'manager'].includes(business.role) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                AI & Automation
                            </CardTitle>
                            <CardDescription>Configure how review analysis behaves</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <CustomSwitch label="Enable Auto-Replies" checked={biz.auto_reply_enabled || false} />
                            <CustomSwitch label="Analyze Sentiment Automatically" checked={true} />
                            <CustomSwitch label="Extract Topic Tags" checked={true} />
                            <div className="pt-4">
                                <Button size="sm" variant="outline" className="w-full">Adjust Thresholds</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {business.role === 'owner' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                Google Connection
                            </CardTitle>
                            <CardDescription>Manage your Google Business Profile authentication</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border shadow-sm shrink-0">
                                        <span className="font-bold text-red-500 text-xl font-google">G</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">Google Account Connected</p>
                                        <p className="text-xs text-slate-500">Reviews are syncing automatically</p>
                                    </div>
                                </div>
                                <Badge variant="success">Healthy</Badge>
                            </div>
                            <Button variant="outline" size="sm" className="w-full">Reconnect Account</Button>
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
                        <CustomSwitch label="Daily Summary Email" checked={true} />
                        <CustomSwitch label="Critical Rating Alerts (Email)" checked={true} />
                        <CustomSwitch label="New Review Push Notifications" checked={false} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
