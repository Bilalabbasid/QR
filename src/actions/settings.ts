'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateSettings(data: {
  autoReplyEnabled?: boolean
  lowRatingThreshold?: number
  notificationEmail?: string
  notificationWhatsapp?: string
  businessName?: string
  industry?: string
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
  if (data.businessName) updates.name = data.businessName
  if (data.industry) updates.industry = data.industry

  const { error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
}
