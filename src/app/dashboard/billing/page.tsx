import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Check, ShieldCheck, Zap, AlertCircle } from 'lucide-react'
import type { SubscriptionPlan } from '@/types/database'

const PLAN_DETAILS: Record<SubscriptionPlan, {
    label: string
    price: string
    branches: string
    users: string
    aiReplies: string
    features: string[]
}> = {
    free: {
        label: 'Free',
        price: '$0/mo',
        branches: '1 branch',
        users: '1 user',
        aiReplies: '50 AI replies/mo',
        features: ['1 branch', '1 user', '50 AI replies/month', 'Basic support'],
    },
    starter: {
        label: 'Starter',
        price: '$29/mo',
        branches: '5 branches',
        users: '3 users',
        aiReplies: '500 AI replies/mo',
        features: ['5 branches', '3 users', '500 AI replies/month', 'Email support'],
    },
    pro: {
        label: 'Pro',
        price: '$99/mo',
        branches: '25 branches',
        users: '10 users',
        aiReplies: '5,000 AI replies/mo',
        features: ['25 branches', '10 users', '5,000 AI replies/month', 'Priority support'],
    },
    professional: {
        label: 'Professional',
        price: '$99/mo',
        branches: '25 branches',
        users: '10 users',
        aiReplies: '5,000 AI replies/mo',
        features: ['25 branches', '10 users', '5,000 AI replies/month', 'Priority support'],
    },
    enterprise: {
        label: 'Enterprise',
        price: 'Custom',
        branches: 'Unlimited',
        users: 'Unlimited',
        aiReplies: 'Unlimited',
        features: ['Unlimited branches', 'Unlimited users', 'Unlimited AI replies', 'Dedicated support'],
    },
}

function getStatusVariant(status: string | null) {
    if (status === 'active' || status === 'trialing') return 'success' as const
    if (status === 'past_due') return 'warning' as const
    if (status === 'canceled') return 'secondary' as const
    return 'secondary' as const
}

export default async function BillingPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('role, business_id, businesses(*)')
        .eq('id', user.id)
        .single()

    if (!userData?.businesses) redirect('/onboarding')
    if (userData.role !== 'owner') redirect('/dashboard')

    const biz = userData.businesses as {
        name: string
        subscription_plan: SubscriptionPlan
        subscription_status: string | null
        stripe_customer_id: string | null
    }

    const plan = biz.subscription_plan ?? 'free'
    const planInfo = PLAN_DETAILS[plan] ?? PLAN_DETAILS.free
    const status = biz.subscription_status
    const isActive = status === 'active' || status === 'trialing' || plan === 'free'

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
                <p className="text-muted-foreground">
                    Manage your subscription plan and billing information.
                </p>
            </div>

            {/* Payment failed warning */}
            {status === 'past_due' && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">
                        Your payment is past due. Please update your payment method to avoid service interruption.
                    </p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Current Plan
                        </CardTitle>
                        <CardDescription>Details about your active subscription</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start justify-between p-6 border border-border rounded-xl bg-secondary/30">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant={getStatusVariant(status)}>
                                            {status ? status.replace('_', ' ') : 'Active'}
                                        </Badge>
                                    </div>
                                    <h3 className="text-2xl font-bold">{planInfo.label} Plan</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {planInfo.features.map((f) => (
                                        <div key={f} className="flex items-center gap-2 text-sm">
                                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                                <p className="text-3xl font-bold">{planInfo.price}</p>
                                {plan !== 'free' && plan !== 'enterprise' && (
                                    <Button variant="outline" size="sm" className="mt-4" disabled>
                                        Manage Plan
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Plan limits */}
                        <div className="mt-6 space-y-3">
                            <h4 className="text-sm font-semibold">Plan Limits</h4>
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Branches', value: planInfo.branches },
                                    { label: 'Users', value: planInfo.users },
                                    { label: 'AI Replies', value: planInfo.aiReplies },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-3 border border-border rounded-lg text-center">
                                        <p className="text-sm font-semibold">{value}</p>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!biz.stripe_customer_id && plan === 'free' && (
                            <p className="text-xs text-muted-foreground mt-4 italic">
                                No billing info on file — you&apos;re on the free plan.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Upgrade CTA */}
                    {plan === 'free' && (
                        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary-foreground">
                                    <Zap className="h-5 w-5 fill-primary-foreground" />
                                    Upgrade to Starter
                                </CardTitle>
                                <CardDescription className="text-primary-foreground/70">
                                    More branches, users and AI replies.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ul className="space-y-2 text-sm">
                                    {PLAN_DETAILS.starter.features.map(f => (
                                        <li key={f} className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button className="w-full bg-background text-foreground hover:bg-secondary">
                                    Upgrade — $29/mo
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {(plan === 'starter' || plan === 'pro') && (
                        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-primary-foreground">
                                    <Zap className="h-5 w-5 fill-primary-foreground" />
                                    Upgrade to Professional
                                </CardTitle>
                                <CardDescription className="text-primary-foreground/70">
                                    Scale to 25 branches and 10 users.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ul className="space-y-2 text-sm">
                                    {PLAN_DETAILS.professional.features.map(f => (
                                        <li key={f} className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Button className="w-full bg-background text-foreground hover:bg-secondary">
                                    Upgrade — $99/mo
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Billing Support</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground mb-4">
                                Questions about your invoice or plan? We&apos;re here to help.
                            </p>
                            <Button variant="outline" size="sm" className="w-full">
                                Contact Support
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
