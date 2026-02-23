import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, businesses(name)')
      .eq('id', user.id)
      .single()

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 })
    }

    const url = new URL(req.url)
    const branchId = url.searchParams.get('branch_id')
    const from = url.searchParams.get('from') ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)

    let query = supabase
      .from('reviews')
      .select(`
        reviewer_name, rating, review_text, review_date,
        sentiment, reply_status,
        branches!inner(name, business_id)
      `)
      .eq('branches.business_id', userData.business_id)
      .gte('review_date', from)
      .lte('review_date', to)
      .order('review_date', { ascending: false })
      .limit(200)

    if (branchId) query = query.eq('branch_id', branchId)

    const { data: reviews, error } = await query
    if (error) throw error

    const list = reviews ?? []
    const avgRating = list.length
      ? (list.reduce((s, r) => s + (r.rating ?? 0), 0) / list.length).toFixed(1)
      : 'N/A'
    const positive = list.filter((r) => r.sentiment === 'positive').length
    const negative = list.filter((r) => r.sentiment === 'negative').length
    const replied = list.filter((r) => r.reply_status !== 'not_replied').length

    const businessName = (userData.businesses as { name: string } | null)?.name ?? 'Your Business'

    // Generate simple HTML-based PDF content (rendered as HTML for now; replace with jspdf in edge-compatible ctx)
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reviews Report</title>
<style>
  body { font-family: sans-serif; padding: 40px; color: #1e293b; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
  .stats { display: flex; gap: 24px; margin-bottom: 32px; }
  .stat { background: #f8fafc; border-radius: 8px; padding: 16px 24px; flex: 1; }
  .stat-value { font-size: 28px; font-weight: 700; }
  .stat-label { font-size: 12px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 12px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  tr:hover { background: #f8fafc; }
  .pos { color: #16a34a; } .neg { color: #dc2626; } .neu { color: #9333ea; }
</style>
</head>
<body>
<h1>Reviews Report — ${businessName}</h1>
<p class="meta">Period: ${from} to ${to} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString()}</p>
<div class="stats">
  <div class="stat"><div class="stat-value">${list.length}</div><div class="stat-label">Total Reviews</div></div>
  <div class="stat"><div class="stat-value">${avgRating} ★</div><div class="stat-label">Avg Rating</div></div>
  <div class="stat"><div class="stat-value pos">${positive}</div><div class="stat-label">Positive</div></div>
  <div class="stat"><div class="stat-value neg">${negative}</div><div class="stat-label">Negative</div></div>
  <div class="stat"><div class="stat-value">${replied}</div><div class="stat-label">Replied</div></div>
</div>
<table>
<thead><tr><th>Reviewer</th><th>Rating</th><th>Date</th><th>Branch</th><th>Sentiment</th><th>Review</th></tr></thead>
<tbody>
${list.map(r => `<tr>
  <td>${r.reviewer_name ?? 'Anonymous'}</td>
  <td>${'★'.repeat(r.rating ?? 0)}</td>
  <td>${r.review_date ?? ''}</td>
  <td>${(r.branches as { name: string }).name ?? ''}</td>
  <td class="${r.sentiment ?? ''}">${r.sentiment ?? ''}</td>
  <td>${(r.review_text ?? '').slice(0, 120)}${(r.review_text ?? '').length > 120 ? '…' : ''}</td>
</tr>`).join('')}
</tbody>
</table>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="reviews-report-${Date.now()}.html"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/reports/export-pdf]', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
