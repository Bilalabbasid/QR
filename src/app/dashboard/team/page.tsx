import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Shield, User as UserIcon, MoreVertical } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default async function TeamPage() {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('business_id, role')
        .eq('id', user.id)
        .single()

    if (!userData?.business_id) redirect('/onboarding')

    // Only owners and managers can see this page
    if (!['owner', 'manager'].includes(userData.role)) redirect('/dashboard')

    const { data: team, error } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', userData.business_id)
        .order('role', { ascending: true })

    if (error) throw error

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage your team members and their access levels.
                    </p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Invite Member
                </Button>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {team?.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar_url ?? ''} />
                                        <AvatarFallback className="bg-slate-200 dark:bg-slate-800 text-xs">
                                            {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">{member.full_name}</span>
                                        <span className="text-xs text-slate-500 italic">User ID: ...{member.id.slice(-6)}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm capitalize">
                                        {member.role === 'owner' ? (
                                            <Shield className="h-3 w-3 text-blue-600" />
                                        ) : (
                                            <UserIcon className="h-3 w-3 text-slate-400" />
                                        )}
                                        {member.role}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="success">Active</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
