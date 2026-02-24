'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Shield, User as UserIcon, Trash2, Mail, Clock, Loader2 } from 'lucide-react'
import { inviteTeamMember, updateMemberRole, removeTeamMember, cancelInvitation } from '@/actions/team'
import { useToast } from '@/components/ui/use-toast'
import type { User, TeamInvitation, UserRole } from '@/types/database'

export default function TeamPage() {
    const { toast } = useToast()
    const [isPending, startTransition] = useTransition()
    const [currentUser, setCurrentUser] = useState<User | null>(null)
    const [team, setTeam] = useState<User[]>([])
    const [invitations, setInvitations] = useState<TeamInvitation[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff')
    const supabase = createClient()

    async function loadData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!userData) return
        setCurrentUser(userData as User)

        if (!['owner', 'manager'].includes(userData.role) || !userData.business_id) {
            setLoading(false)
            return
        }

        const businessId = userData.business_id

        const [{ data: teamData }, { data: inviteData }] = await Promise.all([
            supabase
                .from('users')
                .select('*')
                .eq('business_id', businessId)
                .order('role', { ascending: true }),
            supabase
                .from('team_invitations')
                .select('*')
                .eq('business_id', businessId)
                .eq('accepted', false)
                .order('created_at', { ascending: false }),
        ])

        setTeam((teamData as User[]) ?? [])
        setInvitations((inviteData as TeamInvitation[]) ?? [])
        setLoading(false)
    }

    useEffect(() => { loadData() }, [])

    const handleInvite = () => {
        if (!inviteEmail.trim()) return
        startTransition(async () => {
            try {
                await inviteTeamMember(inviteEmail.trim(), inviteRole)
                toast({ title: 'Invitation sent', description: `Invite sent to ${inviteEmail}` })
                setInviteOpen(false)
                setInviteEmail('')
                setInviteRole('staff')
                await loadData()
            } catch (err: unknown) {
                toast({
                    title: 'Invite failed',
                    description: err instanceof Error ? err.message : 'Unknown error',
                    variant: 'destructive',
                })
            }
        })
    }

    const handleRoleChange = (memberId: string, newRole: 'manager' | 'staff') => {
        startTransition(async () => {
            try {
                await updateMemberRole(memberId, newRole)
                setTeam(prev =>
                    prev.map(m => m.id === memberId ? { ...m, role: newRole as UserRole } : m)
                )
                toast({ title: 'Role updated' })
            } catch (err: unknown) {
                toast({
                    title: 'Failed to update role',
                    description: err instanceof Error ? err.message : 'Unknown error',
                    variant: 'destructive',
                })
            }
        })
    }

    const handleRemove = (memberId: string, name: string) => {
        if (!confirm(`Remove ${name} from your team?`)) return
        startTransition(async () => {
            try {
                await removeTeamMember(memberId)
                setTeam(prev => prev.filter(m => m.id !== memberId))
                toast({ title: 'Member removed' })
            } catch (err: unknown) {
                toast({
                    title: 'Failed to remove member',
                    description: err instanceof Error ? err.message : 'Unknown error',
                    variant: 'destructive',
                })
            }
        })
    }

    const handleCancelInvite = (inviteId: string) => {
        startTransition(async () => {
            try {
                await cancelInvitation(inviteId)
                setInvitations(prev => prev.filter(i => i.id !== inviteId))
                toast({ title: 'Invitation cancelled' })
            } catch (err: unknown) {
                toast({
                    title: 'Failed to cancel invitation',
                    description: err instanceof Error ? err.message : 'Unknown error',
                    variant: 'destructive',
                })
            }
        })
    }

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <div className="h-10 bg-secondary/30 rounded animate-pulse w-48" />
                <div className="h-48 bg-secondary/30 rounded-lg animate-pulse" />
            </div>
        )
    }

    if (!['owner', 'manager'].includes(currentUser?.role ?? '')) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground">You don&apos;t have access to team management.</p>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-muted-foreground">
                        Manage your team members and their access levels.
                    </p>
                </div>
                <Button className="gap-2" onClick={() => setInviteOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Invite Member
                </Button>
            </div>

            {/* Active Team Members */}
            <div className="rounded-md border border-border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            {currentUser?.role === 'owner' && (
                                <TableHead className="text-right">Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {team.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.avatar_url ?? ''} />
                                        <AvatarFallback className="bg-secondary text-foreground text-xs">
                                            {member.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm">
                                            {member.full_name}
                                            {member.id === currentUser?.id && (
                                                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                                            )}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {currentUser?.role === 'owner' && member.id !== currentUser?.id && member.role !== 'owner' ? (
                                        <Select
                                            defaultValue={member.role}
                                            onValueChange={(v) => handleRoleChange(member.id, v as 'manager' | 'staff')}
                                            disabled={isPending}
                                        >
                                            <SelectTrigger className="w-32 h-8 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manager">Manager</SelectItem>
                                                <SelectItem value="staff">Staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm capitalize">
                                            {member.role === 'owner' ? (
                                                <Shield className="h-3 w-3 text-primary" />
                                            ) : (
                                                <UserIcon className="h-3 w-3 text-muted-foreground" />
                                            )}
                                            {member.role}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="success">Active</Badge>
                                </TableCell>
                                {currentUser?.role === 'owner' && (
                                    <TableCell className="text-right">
                                        {member.id !== currentUser?.id && member.role !== 'owner' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                disabled={isPending}
                                                onClick={() => handleRemove(member.id, member.full_name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Pending Invitations
                    </h2>
                    <div className="rounded-md border border-border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell className="flex items-center gap-2 text-sm">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                            {invite.email}
                                        </TableCell>
                                        <TableCell className="capitalize text-sm">{invite.role}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(invite.expires_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive text-xs"
                                                onClick={() => handleCancelInvite(invite.id)}
                                                disabled={isPending}
                                            >
                                                Cancel
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="inviteEmail">Email Address</Label>
                            <Input
                                id="inviteEmail"
                                type="email"
                                placeholder="colleague@company.com"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={inviteRole}
                                onValueChange={(v) => setInviteRole(v as 'manager' | 'staff')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manager">Manager — can reply and manage settings</SelectItem>
                                    <SelectItem value="staff">Staff — view only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleInvite} disabled={isPending || !inviteEmail.trim()}>
                            {isPending
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                                : 'Send Invitation'
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
