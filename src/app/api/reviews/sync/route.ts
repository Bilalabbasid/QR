import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/google/token'
import { fetchBranchReviews } from '@/lib/google/reviews'
import { syncBranches } from '@/lib/google/branches'

export const dynamic = 'force-dynamic'

export async function POST() {
    const supabase = createClient()
    const adminSupabase = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await adminSupabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()

    if (userError || !userData?.business_id) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const businessId = userData.business_id as string

    try {
        const accessToken = await getValidAccessToken(businessId)

        // Always re-sync branches first to ensure location IDs are correct
        await syncBranches(businessId, accessToken)

        const { data: branches } = await adminSupabase
            .from('branches')
            .select('id, google_location_id, name')
            .eq('business_id', businessId)
            .eq('is_active', true)

        if (!branches || branches.length === 0) {
            return NextResponse.json({ error: 'No branches found. Ensure your Google Business Profile has locations.' }, { status: 404 })
        }

        let totalInserted = 0
        const errors: string[] = []

        for (const branch of branches) {
            if (!branch.google_location_id) continue
            try {
                const result = await fetchBranchReviews(
                    businessId,
                    branch.id,
                    branch.google_location_id,
                    accessToken
                )
                totalInserted += result.reviewsInserted
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                errors.push(`${branch.name}: ${msg}`)
                console.error(`Review sync failed for branch ${branch.name}:`, e)
            }
        }

        return NextResponse.json({
            success: true,
            newReviews: totalInserted,
            branchesSynced: branches.length,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sync failed'
        console.error('Sync route error:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
