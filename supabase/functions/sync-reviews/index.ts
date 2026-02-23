import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Note: These would usually be in a shared helper, but defined here for Edge Function portability
async function getValidAccessToken(supabaseAdmin: any, businessId: string) {
    const { data: tokenData, error } = await supabaseAdmin
        .from('google_tokens')
        .select('*')
        .eq('business_id', businessId)
        .single()

    if (error || !tokenData) throw new Error('Token not found')

    const now = new Date()
    const expiry = new Date(tokenData.expiry_date)

    if (expiry.getTime() - now.getTime() > 60 * 1000) {
        return tokenData.access_token
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
            client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
            client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
            refresh_token: tokenData.refresh_token,
            grant_type: 'refresh_token',
        }),
    })

    const newTokens = await response.json()
    if (!response.ok) throw new Error('Failed to refresh token')

    const { error: updateError } = await supabaseAdmin
        .from('google_tokens')
        .update({
            access_token: newTokens.access_token,
            expiry_date: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq('business_id', businessId)

    if (updateError) throw updateError
    return newTokens.access_token
}

async function analyzeWithAI(text: string) {
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) return null

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: 'You are a professional reputation manager. Analyze the sentiment and topics of the following customer review. Return JSON: {"sentiment": "positive"|"neutral"|"negative", "tags": string[], "suggestedReply": string}'
                },
                { role: "user", content: text }
            ],
            response_format: { type: "json_object" }
        })
    })

    if (!res.ok) return null
    const data = await res.json()
    return JSON.parse(data.choices[0].message.content)
}

serve(async (req) => {
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    try {
        // 1. Get businesses to sync
        const { data: businesses, error: bizError } = await supabaseAdmin
            .from('businesses')
            .select('id')
            .neq('subscription_plan', 'inactive')

        if (bizError) throw bizError

        const summary = []

        for (const biz of businesses) {
            try {
                const accessToken = await getValidAccessToken(supabaseAdmin, biz.id)

                const { data: branches, error: branchError } = await supabaseAdmin
                    .from('branches')
                    .select('*')
                    .eq('business_id', biz.id)
                    .eq('is_active', true)

                if (branchError) throw branchError

                for (const branch of branches) {
                    // Trigger Review Sync (Implementing inline here for Edge Function)
                    let nextPageToken = ''
                    let inserted = 0

                    do {
                        const url = `https://mybusiness.googleapis.com/v1/${branch.google_location_id}/reviews?pageSize=50${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`
                        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
                        const data = await res.json()

                        if (!res.ok) break

                        for (const review of (data.reviews || [])) {
                            // Check if exists
                            const { data: existing } = await supabaseAdmin
                                .from('reviews')
                                .select('id')
                                .eq('google_review_id', review.reviewId)
                                .single()

                            if (existing) continue

                            const { data: newReview, error } = await supabaseAdmin.from('reviews').insert({
                                branch_id: branch.id,
                                google_review_id: review.reviewId,
                                reviewer_name: review.reviewer.displayName,
                                rating: review.starRating === 'FIVE' ? 5 : review.starRating === 'FOUR' ? 4 : review.starRating === 'THREE' ? 3 : review.starRating === 'TWO' ? 2 : 1,
                                review_text: review.comment,
                                review_time: review.createTime,
                            }).select().single()

                            if (!error && newReview) {
                                inserted++

                                // AI Analysis
                                const ai = await analyzeWithAI(review.comment || '')
                                if (ai) {
                                    await supabaseAdmin.from('reviews').update({
                                        sentiment: ai.sentiment,
                                        ai_suggested_reply: ai.suggestedReply
                                    }).eq('id', newReview.id)

                                    if (ai.tags?.length > 0) {
                                        await supabaseAdmin.from('review_tags').insert(
                                            ai.tags.map((t: string) => ({ review_id: newReview.id, tag: t }))
                                        )
                                    }
                                }

                                // Alert
                                if (newReview.rating <= 2) {
                                    await supabaseAdmin.from('alerts').insert({
                                        business_id: biz.id,
                                        branch_id: branch.id,
                                        review_id: newReview.id,
                                        alert_type: 'low_rating'
                                    })
                                }
                            }
                        }
                        nextPageToken = data.nextPageToken
                    } while (nextPageToken)

                    summary.push({ branchId: branch.id, inserted })
                }

                // 3. Revalidate dashboard if changes occurred
                const bizBranches = branches.map((b: { id: string }) => b.id)
                const totalInserted = summary
                    .filter(s => bizBranches.includes(s.branchId))
                    .reduce((acc, curr) => acc + curr.inserted, 0)

                if (totalInserted > 0) {
                    const revalidateUrl = `${Deno.env.get("NEXT_PUBLIC_SITE_URL") || 'http://localhost:3000'}/api/revalidate?tag=stats&secret=${Deno.env.get("REVALIDATION_SECRET")}`
                    await fetch(revalidateUrl, { method: 'POST' }).catch(console.error)
                }

            } catch (e) {
                console.error(`Error syncing business ${biz.id}:`, e)
            }
        }

        return new Response(JSON.stringify({ success: true, summary }), { headers: { "Content-Type": "application/json" } })
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
