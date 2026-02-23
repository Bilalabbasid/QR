import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = createClient()
    const { userId, fullName, businessName } = await request.json()

    // 1. Verify session (Double check for security)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // 2. Create business
        const { data: business, error: bizError } = await supabase
            .from('businesses')
            .insert({
                name: businessName,
                subscription_plan: 'free',
            })
            .select()
            .single()

        if (bizError) throw bizError

        // 3. Update user with business_id (User already exists due to trigger)
        const { error: userError } = await supabase
            .from('users')
            .update({
                business_id: business.id,
                full_name: fullName,
                role: 'owner', // First user is always owner
            })
            .eq('id', userId)

        if (userError) throw userError

        return NextResponse.json({ success: true, businessId: business.id })
    } catch (error: any) {
        console.error('Setup Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
