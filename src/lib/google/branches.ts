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

interface GoogleAccount {
    name: string
}

export async function syncBranches(businessId: string, accessToken: string) {
    const supabase = createAdminClient()

    // Use mybusinessaccountmanagement API (consistent with OAuth callback)
    const accountsRes = await fetch(
        'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const accountsData = await accountsRes.json()

    if (!accountsRes.ok) {
        throw new Error(`Failed to fetch Google accounts: ${JSON.stringify(accountsData)}`)
    }

    const accounts: GoogleAccount[] = accountsData.accounts ?? []
    let totalSynced = 0

    for (const account of accounts) {
        let nextPageToken = ''

        do {
            const locUrl =
                `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations` +
                `?readMask=name,title,storefrontAddress&pageSize=100` +
                (nextPageToken ? `&pageToken=${nextPageToken}` : '')

            const locationsRes = await fetch(locUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            const locationsData = await locationsRes.json()

            if (!locationsRes.ok) {
                console.error(`Failed to fetch locations for ${account.name}:`, locationsData)
                break
            }

            const locations: GoogleLocation[] = locationsData.locations ?? []

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

                const { error } = await supabase
                    .from('branches')
                    .upsert(
                        {
                            business_id: businessId,
                            google_location_id: loc.name,
                            name: loc.title,
                            address: addressString,
                            city: addr?.locality ?? null,
                            is_active: true,
                        },
                        { onConflict: 'google_location_id' }
                    )

                if (!error) totalSynced++
                else console.error('Branch upsert error:', error)
            }

            nextPageToken = locationsData.nextPageToken ?? ''
        } while (nextPageToken)
    }

    return totalSynced
}
