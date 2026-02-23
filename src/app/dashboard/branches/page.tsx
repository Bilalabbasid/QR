import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, RefreshCw, ExternalLink } from 'lucide-react'

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

    const { data: branches, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', userData.business_id)
        .order('name', { ascending: true })

    if (error) throw error

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
                    <p className="text-muted-foreground">
                        Manage your connected Google Business Profile locations.
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
                {branches?.map((branch) => (
                    <Card key={branch.id}>
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl">{branch.name}</CardTitle>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <MapPin className="mr-1 h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{branch.address || 'No address provided'}</span>
                                </div>
                            </div>
                            <Badge variant={branch.is_active ? 'success' : 'secondary'}>
                                {branch.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                                    <a
                                        href={`https://business.google.com/dashboard/l/${branch.google_location_id.split('/').pop()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Visit GBP
                                    </a>
                                </Button>
                                {['owner', 'manager'].includes(userData.role) && (
                                    <Button size="sm" className="w-full">Settings</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
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
