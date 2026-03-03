import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncBranches } from '@/lib/google/branches'
import { fetchBranchReviews } from '@/lib/google/reviews'

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
            throw new Error('No refresh token received. Please revoke access in your Google account and try again.')
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

        // 4. Store tokens in google_tokens (upsert by business_id)
        // *** THIS IS THE CRITICAL STEP — must succeed for "connected" to show ***
        // Note: google_account_id is fetched lazily on first sync to avoid rate-limit issues
        const { error: tokenStoreError } = await adminSupabase
            .from('google_tokens')
            .upsert(
                {
                    business_id: userData.business_id,
                    access_token: tokenData.access_token,
                    refresh_token: tokenData.refresh_token,
                    expiry_date: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                    scope: tokenData.scope,
                },
                { onConflict: 'business_id' }
            )

        if (tokenStoreError) {
            console.error('Token store error:', tokenStoreError)
            throw new Error(`Failed to save Google token: ${tokenStoreError.message}`)
        }

        // 7. Run branch + review sync before redirecting so reviews are available immediately
        const businessId = userData.business_id as string
        try {
            await syncBranches(businessId, tokenData.access_token)

            const { data: branches } = await adminSupabase
                .from('branches')
                .select('id, google_location_id')
                .eq('business_id', businessId)
                .eq('is_active', true)

            if (branches && branches.length > 0) {
                for (const branch of branches) {
                    if (!branch.google_location_id) continue
                    try {
                        await fetchBranchReviews(
                            businessId,
                            branch.id,
                            branch.google_location_id,
                            tokenData.access_token
                        )
                    } catch (e) {
                        console.error(`Review sync failed for branch ${branch.id}:`, e)
                    }
                }
            }
        } catch (e) {
            // Non-fatal: sync failure should not block the "connected" success page
            console.error('Initial sync error after Google connect:', e)
        }

        // 8. Redirect to settings — "Connected" will show and reviews will already be populated
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=connected`

        return NextResponse.redirect(redirectUrl)


    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('Google OAuth callback error:', message)
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?google=error&message=${encodeURIComponent(message)}`
        )
    }
}
