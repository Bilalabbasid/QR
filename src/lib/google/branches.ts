import { createAdminClient } from '@/lib/supabase/server'

interface GoogleLocation {
    name: string
    title: string
    storefrontAddress?: {
        addressLines?: string[]
        locality?: string
        administrativeArea?: string
    }
}

export async function syncBranches(businessId: string, accessToken: string) {
    const supabase = createAdminClient()

    // ─── Step 1: Get account ID from DB (set during OAuth — avoids hitting the
    //             accounts API on every sync which causes 429 rate-limit errors) ───
    const { data: tokenRow } = await supabase
        .from('google_tokens')
        .select('google_account_id')
        .eq('business_id', businessId)
        .single()

    let accountId = tokenRow?.google_account_id as string | null

    // ─── Step 2: If no cached account ID, fetch once and store it ───
    if (!accountId) {
        console.log('[syncBranches] No cached account ID — fetching from accounts API (once)')
        const accountsRes = await fetch(
            'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const accountsData = await accountsRes.json()

        if (!accountsRes.ok) {
            throw new Error(`Failed to fetch Google accounts: HTTP ${accountsRes.status} — ${accountsData.error?.message ?? JSON.stringify(accountsData)}`)
        }

        const firstAccount = accountsData.accounts?.[0]
        if (!firstAccount) {
            throw new Error('No Google Business accounts found for this user. Ensure the connected Google account has a Google Business Profile.')
        }

        accountId = firstAccount.name as string
        const accountName = firstAccount.accountName as string

        // Cache in DB for future syncs (only google_account_id — avoids dependency on migration 005)
        await supabase
            .from('google_tokens')
            .update({ google_account_id: accountId })
            .eq('business_id', businessId)

        console.log(`[syncBranches] Cached account ID: ${accountId} (${accountName})`)
    } else {
        console.log(`[syncBranches] Using cached account ID: ${accountId}`)
    }

    // ─── Step 3: Fetch locations for this account ───
    let totalSynced = 0
    let nextPageToken = ''

    do {
        const locUrl =
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations` +
            `?readMask=name,title,storefrontAddress&pageSize=100` +
            (nextPageToken ? `&pageToken=${nextPageToken}` : '')

        console.log(`[syncBranches] Fetching locations: ${locUrl}`)

        const locationsRes = await fetch(locUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        const locationsData = await locationsRes.json()

        if (!locationsRes.ok) {
            throw new Error(`Locations API error: HTTP ${locationsRes.status} — ${locationsData.error?.message ?? JSON.stringify(locationsData)}`)
        }

        const locations: GoogleLocation[] = locationsData.locations ?? []
        console.log(`[syncBranches] Got ${locations.length} locations`)

        for (const loc of locations) {
            const addr = loc.storefrontAddress
            const addressString = addr
                ? [
                    ...(addr.addressLines ?? []),
                    addr.locality,
                    addr.administrativeArea,
                ]
                    .filter(Boolean)
                    .join(', ')
                : null

            // Full path for v4 reviews API: accounts/{id}/locations/{id}
            const googleLocationId = loc.name.startsWith('accounts/')
                ? loc.name
                : `${accountId}/${loc.name}`

            console.log(`[syncBranches] Syncing: ${loc.title} → ${googleLocationId}`)

            // Select-then-update-or-insert (no unique index required)
            const { data: existing } = await supabase
                .from('branches')
                .select('id')
                .eq('business_id', businessId)
                .eq('google_location_id', googleLocationId)
                .maybeSingle()

            if (existing) {
                const { error } = await supabase
                    .from('branches')
                    .update({ name: loc.title, address: addressString, city: addr?.locality ?? null, is_active: true })
                    .eq('id', existing.id)
                if (error) console.error(`[syncBranches] Update error for ${loc.title}:`, error.message)
                else totalSynced++
            } else {
                const { error } = await supabase
                    .from('branches')
                    .insert({ business_id: businessId, google_location_id: googleLocationId, name: loc.title, address: addressString, city: addr?.locality ?? null, is_active: true })
                if (error) console.error(`[syncBranches] Insert error for ${loc.title}:`, error.message)
                else totalSynced++
            }
        }

        nextPageToken = locationsData.nextPageToken ?? ''
    } while (nextPageToken)

    console.log(`[syncBranches] Done — ${totalSynced} branches synced`)
    return totalSynced
}
