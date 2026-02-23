// Shared Google API helper for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

export async function refreshAccessToken(businessId: string): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('business_id', businessId)
    .single()

  if (error || !tokenRow) throw new Error(`No Google token for business ${businessId}`)

  const expiresAt = new Date(tokenRow.expires_at).getTime()
  const now = Date.now()

  // If token expires in more than 5 minutes, reuse it
  if (expiresAt - now > 5 * 60 * 1000) return tokenRow.access_token

  // Refresh the token
  const params = new URLSearchParams({
    client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
    client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    refresh_token: tokenRow.refresh_token,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Token refresh failed: ${err.error_description ?? err.error}`)
  }

  const tokens = await res.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
    .from('google_tokens')
    .update({
      access_token: tokens.access_token,
      expires_at: newExpiresAt,
    })
    .eq('business_id', businessId)

  return tokens.access_token
}
