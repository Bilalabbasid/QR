'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function inviteTeamMember(email: string, role: 'manager' | 'staff') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || !['owner', 'manager'].includes(userData.role ?? '')) {
    throw new Error('Unauthorized')
  }

  // Check if already a member
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', userData.business_id)

  // Insert invitation
  const { error } = await supabase
    .from('team_invitations')
    .insert({
      business_id: userData.business_id,
      email,
      role,
      invited_by: user.id,
    })

  if (error) {
    if (error.code === '23505') throw new Error('An invitation for this email already exists')
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/team')
}

export async function updateMemberRole(memberId: string, newRole: 'manager' | 'staff') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || userData.role !== 'owner') {
    throw new Error('Only owners can change roles')
  }

  if (memberId === user.id) throw new Error('Cannot change your own role')

  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('business_id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/team')
}

export async function removeTeamMember(memberId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || !['owner', 'manager'].includes(userData.role ?? '')) {
    throw new Error('Unauthorized')
  }

  if (memberId === user.id) throw new Error('Cannot remove yourself')

  const { error } = await supabase
    .from('users')
    .update({ business_id: null })
    .eq('id', memberId)
    .eq('business_id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/team')
}

export async function cancelInvitation(invitationId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || !['owner', 'manager'].includes(userData.role ?? '')) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('team_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('business_id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/team')
}
