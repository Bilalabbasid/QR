import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/google/token'

export const dynamic = 'force-dynamic'

export async function GET() {
    const supabase = createClient()
    const admin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const { data: userData } = await admin
        .from('users').select('business_id').eq('id', user.id).single()

    const businessId = userData?.business_id
    if (!businessId) return NextResponse.json({ error: 'No business found' }, { status: 404 })

    const result: Record<string, unknown> = { businessId, steps: {} }

    // Step 1: Token
    let accessToken: string | null = null
    try {
        accessToken = await getValidAccessToken(businessId)
        result.steps = { ...result.steps as object, token: '✅ Token retrieved' }
    } catch (e) {
        result.steps = { ...result.steps as object, token: `❌ ${(e as Error).message}` }
        return NextResponse.json(result)
    }

    // Step 2: Use cached account ID from DB (avoids 429 rate limit)
    const { data: tokenRow } = await admin
        .from('google_tokens')
        .select('google_account_id')
        .eq('business_id', businessId)
        .single()

    let accountId = tokenRow?.google_account_id as string | null

    if (!accountId) {
        // Only call accounts API if not cached
        try {
            const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
                { headers: { Authorization: `Bearer ${accessToken}` } })
            const data = await res.json()
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`)
            accountId = data.accounts?.[0]?.name ?? null
            result.steps = { ...result.steps as object, accounts: `✅ Fetched from API — account: ${accountId}` }
        } catch (e) {
            result.steps = { ...result.steps as object, accounts: `❌ ${(e as Error).message}` }
            return NextResponse.json(result)
        }
    } else {
        result.steps = { ...result.steps as object, accounts: `✅ Using cached account ID: ${accountId}` }
    }

    if (!accountId) {
        result.steps = { ...result.steps as object, accounts: '❌ No Google account found — ensure the connected Google account has a Business Profile' }
        return NextResponse.json(result)
    }

    // Step 3: Locations API
    let firstLocationPath: string | null = null
    try {
        const locUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storefrontAddress&pageSize=100`
        const res = await fetch(locUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
        const data = await res.json()
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`)
        const locations = data.locations ?? []
        if (locations.length > 0) {
            const loc = locations[0]
            firstLocationPath = loc.name.startsWith('accounts/') ? loc.name : `${accountId}/${loc.name}`
        }
        result.steps = {
            ...result.steps as object,
            locations: {
                status: locations.length > 0 ? '✅ OK' : '⚠️ No locations found',
                count: locations.length,
                list: locations.map((l: { name: string; title: string }) => ({ name: l.name, title: l.title }))
            }
        }
    } catch (e) {
        result.steps = { ...result.steps as object, locations: `❌ ${(e as Error).message}` }
        return NextResponse.json(result)
    }

    // Step 4: Reviews API test
    if (firstLocationPath) {
        try {
            const url = `https://mybusiness.googleapis.com/v4/${firstLocationPath}/reviews?pageSize=5`
            const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
            const data = await res.json()
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`)
            result.steps = { ...result.steps as object, reviewsAPI: `✅ ${data.reviews?.length ?? 0} reviews returned for ${firstLocationPath}` }
        } catch (e) {
            result.steps = { ...result.steps as object, reviewsAPI: `❌ ${(e as Error).message}` }
        }
    } else {
        result.steps = { ...result.steps as object, reviewsAPI: '⚠️ Skipped — no locations found' }
    }

    // Step 5: Branches in DB
    const { data: branches } = await admin
        .from('branches').select('id, name, google_location_id, is_active').eq('business_id', businessId)
    result.steps = { ...result.steps as object, branchesInDB: { count: branches?.length ?? 0, rows: branches } }

    // Step 6: Reviews count in DB
    const { count } = await admin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .in('branch_id', (branches ?? []).map(b => b.id))
    result.steps = { ...result.steps as object, reviewsInDB: count ?? 0 }

    return NextResponse.json(result, { status: 200 })
}
