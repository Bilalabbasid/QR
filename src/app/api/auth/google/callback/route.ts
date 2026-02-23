import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncBranches } from '@/lib/google/branches'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the user ID

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    const supabase = createClient()
    const adminSupabase = createAdminClient()

    // 1. Verify session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== state) {
        return NextResponse.json({ error: 'Unauthorized session mismatch' }, { status: 401 })
    }

    try {
        // 2. Exchange code for tokens
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
            }),
        })

        const tokenData = await response.json()

        if (!response.ok) {
            console.error('Token exchange failed:', tokenData)
            return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 })
        }

        // 3. Get user's business ID
        const { data: userData, error: userError } = await adminSupabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (userError || !userData?.business_id) {
            throw new Error('Business not found for user')
        }

        // 4. Store tokens
        const { error: tokenStoreError } = await adminSupabase
            .from('google_tokens')
            .upsert({
                business_id: userData.business_id,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expiry_date: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                scope: tokenData.scope,
            }, {
                onConflict: 'business_id',
            })

        if (tokenStoreError) throw tokenStoreError

        // 5. Initial branch sync
        await syncBranches(userData.business_id, tokenData.access_token)

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=connected`)
    } catch (error: any) {
        console.error('OAuth Callback Error:', error)
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=error&message=${encodeURIComponent(error.message)}`)
    }
}
