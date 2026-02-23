import { createAdminClient } from '@/lib/supabase/server'

export async function getValidAccessToken(businessId: string) {
    const supabase = createAdminClient()

    // 1. Fetch token from DB
    const { data: tokenData, error } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('business_id', businessId)
        .single()

    if (error || !tokenData) {
        throw new Error('Google account not connected')
    }

    // 2. Check if expired (with 1 minute buffer)
    const now = new Date()
    const expiry = new Date(tokenData.expiry_date)

    if (expiry.getTime() - now.getTime() > 60 * 1000) {
        return tokenData.access_token
    }

    // 3. Refresh token
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
        }),
    })

    const newTokens = await response.json()

    if (!response.ok) {
        console.error('Token refresh failed:', newTokens)
        throw new Error('Failed to refresh Google token')
    }

    // 4. Update DB
    const { error: updateError } = await supabase
        .from('google_tokens')
        .update({
            access_token: newTokens.access_token,
            expiry_date: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('business_id', businessId)

    if (updateError) throw updateError

    return newTokens.access_token
}
