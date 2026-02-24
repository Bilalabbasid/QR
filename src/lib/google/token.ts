import { createAdminClient } from '@/lib/supabase/server'

export async function getValidAccessToken(businessId: string): Promise<string> {
    const supabase = createAdminClient()

    const { data: tokenData, error } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('business_id', businessId)
        .single()

    if (error || !tokenData) {
        throw new Error('Google account not connected for this business')
    }

    // Return current token if it has more than 1 minute remaining
    const now = Date.now()
    const expiry = new Date(tokenData.expiry_date).getTime()

    if (expiry - now > 60_000) {
        return tokenData.access_token
    }

    // Token expired — refresh it
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

        // Refresh token was revoked by the user — clear the token row
        if (newTokens.error === 'invalid_grant') {
            await supabase
                .from('google_tokens')
                .delete()
                .eq('business_id', businessId)

            // Alert the business owner
            try {
                await supabase.from('alerts').insert({
                    business_id: businessId,
                    alert_type: 'spike_detected', // Closest available type for auth issues
                })
            } catch {
                // ignore alert insertion failure
            }
        }

        throw new Error(
            newTokens.error === 'invalid_grant'
                ? 'Google access has been revoked. Please reconnect your account in Settings.'
                : `Failed to refresh Google token: ${newTokens.error_description ?? 'Unknown error'}`
        )
    }

    const newExpiry = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

    const { error: updateError } = await supabase
        .from('google_tokens')
        .update({
            access_token: newTokens.access_token,
            expiry_date: newExpiry,
        })
        .eq('business_id', businessId)

    if (updateError) throw updateError

    return newTokens.access_token
}
