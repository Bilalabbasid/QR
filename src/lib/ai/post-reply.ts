import { getValidAccessToken } from '@/lib/google/token'

export async function postReplyToGoogle(
    businessId: string,
    googleLocationName: string,
    googleReviewId: string,
    replyText: string
) {
    const accessToken = await getValidAccessToken(businessId)

    const url = `https://mybusiness.googleapis.com/v1/${googleLocationName}/reviews/${googleReviewId}/reply`

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            comment: replyText,
        }),
    })

    const data = await response.json()

    if (!response.ok) {
        console.error(`Failed to post reply to Google for review ${googleReviewId}:`, data)
        throw new Error(`Google API Error: ${data.error?.message || 'Unknown error'}`)
    }

    return data
}
