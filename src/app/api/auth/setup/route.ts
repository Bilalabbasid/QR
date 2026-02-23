import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

// Pure service-role client — bypasses RLS, has full access
function getAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const { userId, fullName, businessName } = await request.json()

  if (!userId || !fullName || !businessName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getAdminClient()

  try {
    // 1. Verify user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError || !authUser?.user) {
      return NextResponse.json({ error: 'User not found in auth' }, { status: 401 })
    }

    // 2. Check if already set up (idempotent)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, business_id')
      .eq('id', userId)
      .maybeSingle()

    if (existingUser?.business_id) {
      return NextResponse.json({ success: true, businessId: existingUser.business_id })
    }

    // 3. Create business
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert({ name: businessName, subscription_plan: 'free' })
      .select('id')
      .single()

    if (bizError) throw new Error(`Business creation failed: ${bizError.message}`)

    // 4. Upsert user row — works whether the trigger created it or not
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        full_name: fullName,
        business_id: business.id,
        role: 'owner',
      }, { onConflict: 'id' })

    if (userError) throw new Error(`User setup failed: ${userError.message}`)

    return NextResponse.json({ success: true, businessId: business.id })
  } catch (error: any) {
    console.error('[Setup Error]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
