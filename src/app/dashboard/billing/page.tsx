import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Check, ShieldCheck, Zap } from 'lucide-react'

export default async function BillingPage() {
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
                <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Manage your subscription plan and billing information.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Current Plan
                        </CardTitle>
                        <CardDescription>Details about your active subscription</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between p-6 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Badge variant="success" className="mb-2">Active</Badge>
                                    <h3 className="text-2xl font-bold capitalize">{biz.subscription_plan} Plan</h3>
                                    <p className="text-sm text-slate-500">Perfect for growing businesses managing multiple locations.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-500" />
                                        Unlimited Review Sync
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-500" />
                                        AI Sentiment Analysis
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-500" />
                                        Up to 5 Branches
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-emerald-500" />
                                        Standard Support
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">$29<span className="text-sm font-normal text-slate-500">/mo</span></p>
                                <Button variant="outline" size="sm" className="mt-4">Change Plan</Button>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <h4 className="text-sm font-semibold">Payment Method</h4>
                            <div className="flex items-center gap-4 p-4 border rounded-lg">
                                <div className="h-10 w-14 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center font-bold text-xs italic">VISA</div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                                    <p className="text-xs text-slate-500">Expires 12/26</p>
                                </div>
                                <Button variant="link" size="sm">Update</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Zap className="h-5 w-5 fill-white" />
                                Upgrade to Pro
                            </CardTitle>
                            <CardDescription className="text-blue-100">Unlock advanced features for large scale operations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    White-label Reports
                                </li>
                                <li className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Custom AI Training
                                </li>
                                <li className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Priority API Access
                                </li>
                            </ul>
                            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">Go Pro</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Billing Support</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-slate-500 mb-4">Have questions about your invoice? Our team is here to help.</p>
                            <Button variant="outline" size="sm" className="w-full">Contact Support</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
