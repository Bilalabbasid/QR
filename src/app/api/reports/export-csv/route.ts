import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single()

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 })
    }

    const url = new URL(req.url)
    const branchId = url.searchParams.get('branch_id')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    let query = supabase
      .from('reviews')
      .select(`
        id, reviewer_name, rating, review_text, review_date,
        sentiment, tags, reply_status, created_at,
        branches!inner(name, business_id)
      `)
      .eq('branches.business_id', userData.business_id)
      .order('review_date', { ascending: false })

    if (branchId) query = query.eq('branch_id', branchId)
    if (from) query = query.gte('review_date', from)
    if (to) query = query.lte('review_date', to)

    const { data: reviews, error } = await query.limit(5000)
    if (error) throw error

    // Build CSV manually (avoids papaparse SSR issues)
    const headers = [
      'ID', 'Reviewer', 'Rating', 'Review', 'Date',
      'Sentiment', 'Tags', 'Reply Status', 'Branch',
    ]

    const rows = (reviews ?? []).map((r) => [
      r.id,
      `"${(r.reviewer_name ?? '').replace(/"/g, '""')}"`,
      r.rating,
      `"${(r.review_text ?? '').replace(/"/g, '""')}"`,
      r.review_date,
      r.sentiment ?? '',
      `"${(r.tags ?? []).join(', ')}"`,
      r.reply_status ?? '',
      `"${((r.branches as { name: string }).name ?? '').replace(/"/g, '""')}"`,
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reviews-export-${Date.now()}.csv"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/reports/export-csv]', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
