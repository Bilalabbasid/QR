'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function markAlertRead(alertId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id) throw new Error('No business found')

  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('id', alertId)
    .eq('business_id', userData.business_id)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/alerts')
}

export async function markAllAlertsRead() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id) throw new Error('No business found')

  const { error } = await supabase
    .from('alerts')
    .update({ is_read: true })
    .eq('business_id', userData.business_id)
    .eq('is_read', false)

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/alerts')
}
