import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncBranches } from '@/lib/google/branches'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // user ID passed as state

    if (!code) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=error&message=No+authorization+code+received`
        )
    }

    const supabase = createClient()
    const adminSupabase = createAdminClient()

    // 1. Verify the session matches the state to prevent CSRF
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== state) {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=error&message=Session+mismatch`
        )
    }

    try {
        // 2. Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', tokenData)
            throw new Error(tokenData.error_description || 'Token exchange failed')
        }

        if (!tokenData.refresh_token) {
            throw new Error('No refresh token received. Ensure prompt=consent and access_type=offline are set.')
        }

        // 3. Get the authenticated user's business ID
        const { data: userData, error: userError } = await adminSupabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single()

        if (userError || !userData?.business_id) {
            throw new Error('Business not found for this user')
        }

        // 4. Fetch the Google Business Account ID
        const accountsResponse = await fetch(
            'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
        )
        const accountsData = await accountsResponse.json()

        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch Google accounts: ${accountsData.error?.message ?? 'Unknown error'}`)
        }

        const firstAccount = accountsData.accounts?.[0]
        const googleAccountId: string | null = firstAccount?.name ?? null

        // 5. Store tokens + account ID in google_tokens (upsert by business_id)
        const { error: tokenStoreError } = await adminSupabase
            .from('google_tokens')
            .upsert(
                {
                    business_id: userData.business_id,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expiry_date: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                    scope: tokenData.scope,
                    google_account_id: googleAccountId,
                },
                { onConflict: 'business_id' }
            )

        if (tokenStoreError) throw tokenStoreError

        // 6. Mirror account ID on the businesses row for easy lookups
        if (googleAccountId) {
            await adminSupabase
                .from('businesses')
                .update({ google_account_id: googleAccountId })
                .eq('id', userData.business_id)
        }

        // 7. Initial branch sync — upserts all locations from all accounts
        await syncBranches(userData.business_id, tokenData.access_token)

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=connected`
        )
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Google OAuth callback error:', message)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=error&message=${encodeURIComponent(message)}`
        )
    }
}
