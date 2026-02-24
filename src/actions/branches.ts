'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteBranch(branchId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || userData.role !== 'owner') {
    throw new Error('Only owners can delete branches')
  }

  // Verify branch belongs to this business
  const { data: branch } = await supabase
    .from('branches')
    .select('business_id')
    .eq('id', branchId)
    .single()

  if (!branch || branch.business_id !== userData.business_id) {
    throw new Error('Branch not found')
  }

  const { error } = await supabase.from('branches').delete().eq('id', branchId)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/branches')
  revalidatePath('/dashboard')
}

export async function toggleBranchActive(branchId: string, isActive: boolean) {
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
    .from('branches')
    .update({ is_active: isActive })
    .eq('id', branchId)
    .eq('business_id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/branches')
}

export async function triggerAllSync() {
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

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-reviews`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ business_id: userData.business_id }),
    }
  )

  if (!response.ok) throw new Error('Sync failed')
  revalidatePath('/dashboard/branches')
  revalidatePath('/dashboard/reviews')
  revalidatePath('/dashboard')
}

export async function triggerBranchSync(branchId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  // Call the sync Edge Function for a specific branch
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-reviews`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ business_id: userData?.business_id, branch_id: branchId }),
    }
  )

  if (!response.ok) throw new Error('Sync failed')
  revalidatePath('/dashboard/branches')
  revalidatePath('/dashboard/reviews')
}
