import { createAdminClient } from '@/lib/supabase/server'

export async function syncBranches(businessId: string, accessToken: string) {
    const supabase = createAdminClient()

    // 1. Fetch Google Accounts
    const accountsRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    const accountsData = await accountsRes.json()

    if (!accountsRes.ok) {
        throw new Error(`Failed to fetch Google accounts: ${JSON.stringify(accountsData)}`)
    }

    const accounts = accountsData.accounts || []
    let totalSynced = 0

    // 2. For each account, fetch locations
    for (const account of accounts) {
        let nextPageToken = ''

        do {
            const locationsRes = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress,storeCode&pageSize=100${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            const locationsData = await locationsRes.json()

            if (!locationsRes.ok) {
                console.error(`Failed to fetch locations for ${account.name}:`, locationsData)
                break
            }

            const locations = locationsData.locations || []

            // 3. Upsert into DB
            for (const loc of locations) {
                const { error } = await supabase
                    .from('branches')
                    .upsert({
                        business_id: businessId,
                        google_location_id: loc.name,
                        name: loc.title,
                        address: loc.storefrontAddress
                            ? `${loc.storefrontAddress.addressLines?.join(', ')}, ${loc.storefrontAddress.locality}, ${loc.storefrontAddress.administrativeArea}`
                            : null,
                        is_active: true,
                    }, {
                        onConflict: 'google_location_id',
                    })

                if (!error) totalSynced++
            }

            nextPageToken = locationsData.nextPageToken
        } while (nextPageToken)
    }

    return totalSynced
}
