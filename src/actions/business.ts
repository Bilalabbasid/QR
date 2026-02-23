'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateBusiness(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || userData.role !== 'owner') {
    throw new Error('Unauthorized')
  }

  const updates: Record<string, unknown> = {}
  const name = formData.get('name') as string
  const industry = formData.get('industry') as string

  if (name) updates.name = name
  if (industry) updates.industry = industry

  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function updateBusinessSettings(data: {
  autoReplyEnabled?: boolean
  lowRatingThreshold?: number
  notificationEmail?: string
  notificationWhatsapp?: string
}) {
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

  const updates: Record<string, unknown> = {}
  if (data.autoReplyEnabled !== undefined) updates.auto_reply_enabled = data.autoReplyEnabled
  if (data.lowRatingThreshold !== undefined) updates.low_rating_threshold = data.lowRatingThreshold
  if (data.notificationEmail !== undefined) updates.notification_email = data.notificationEmail
  if (data.notificationWhatsapp !== undefined) updates.notification_whatsapp = data.notificationWhatsapp

  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function deleteBusiness() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || userData.role !== 'owner') {
    throw new Error('Only owners can delete a business')
  }

  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', userData.business_id)

  if (error) throw new Error(error.message)
  redirect('/auth/login')
}

export async function disconnectGoogle() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id || userData.role !== 'owner') {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('google_tokens')
    .delete()
    .eq('business_id', userData.business_id)

  if (error) throw new Error(error.message)

  await supabase
    .from('businesses')
    .update({ google_account_id: null })
    .eq('id', userData.business_id)

  revalidatePath('/dashboard/settings')
}
