import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { syncBranches } from '@/lib/google/branches'
import { fetchBranchReviews } from '@/lib/google/reviews'
import { getValidAccessToken } from '@/lib/google/token'

export const dynamic = 'force-dynamic'

/**
 * One-shot setup + sync endpoint.
 * GET /api/debug/fix-and-sync
 *
 * 1. Creates the unique index on branches.google_location_id (if missing)
 * 2. Runs a full syncBranches + fetchBranchReviews
 * Returns a detailed JSON log of each step.
 */
export async function GET() {
    const supabase = createClient()
    const admin = createAdminClient()
    const log: Record<string, unknown> = {}

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const { data: userData } = await admin
        .from('users').select('business_id').eq('id', user.id).single()
    const businessId = userData?.business_id
    if (!businessId) return NextResponse.json({ error: 'No business found' }, { status: 404 })

    log.businessId = businessId

    log.note = 'Branch sync now uses select-then-update/insert (no unique index required)'

    let accessToken: string
    try {
        accessToken = await getValidAccessToken(businessId)
        log.token = '✅ Token retrieved'
    } catch (e) {
        log.token = `❌ ${(e as Error).message}`
        return NextResponse.json(log)
    }

    // Step 3: Sync branches
    try {
        const synced = await syncBranches(businessId, accessToken)
        log.syncBranches = `✅ ${synced} branches synced`
    } catch (e) {
        log.syncBranches = `❌ ${(e as Error).message}`
        return NextResponse.json(log)
    }

    // Step 4: Fetch branches from DB
    const { data: branches } = await admin
        .from('branches')
        .select('id, name, google_location_id, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true)

    log.branchesInDB = branches?.length
        ? `✅ ${branches.length} branches: ${branches.map(b => b.name).join(', ')}`
        : '❌ Still no branches in DB — index probably missing, run SQL manually'

    if (!branches || branches.length === 0) return NextResponse.json(log)

    // Step 5: Sync reviews for each branch
    const reviewResults: Record<string, unknown> = {}
    for (const branch of branches) {
        if (!branch.google_location_id) continue
        try {
            const result = await fetchBranchReviews(
                businessId,
                branch.id,
                branch.google_location_id,
                accessToken
            )
            reviewResults[branch.name] = `✅ Fetched: ${result.reviewsFetched}, Inserted: ${result.reviewsInserted}`
        } catch (e) {
            reviewResults[branch.name] = `❌ ${(e as Error).message}`
        }
    }
    log.reviews = reviewResults

    // Step 6: Count reviews now in DB
    const { count } = await admin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .in('branch_id', branches.map(b => b.id))
    log.totalReviewsInDB = count ?? 0

    return NextResponse.json(log, { status: 200 })
}
