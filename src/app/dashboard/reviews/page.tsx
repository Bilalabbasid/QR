import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Suspense } from 'react'
import { ReviewsFilterBar } from '@/components/dashboard/reviews-filter-bar'
import { ReviewsTableClient } from '@/components/dashboard/reviews-table-client'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReviewWithBranch } from '@/types/database'

const PAGE_SIZE = 25

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userData } = await supabase
    .from('users')
    .select('business_id, role')
    .eq('id', user.id)
    .single()

  if (!userData?.business_id) redirect('/onboarding')

  // Fetch branches for filter dropdown
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('business_id', userData.business_id)
    .order('name')

  // Parse filters from URL
  const selectedBranch    = typeof searchParams.branch    === 'string' ? searchParams.branch    : undefined
  const selectedRating    = typeof searchParams.rating    === 'string' ? searchParams.rating    : undefined
  const selectedSentiment = typeof searchParams.sentiment === 'string' ? searchParams.sentiment : undefined
  const cursor            = typeof searchParams.cursor    === 'string' ? searchParams.cursor    : undefined
  const highlightId       = typeof searchParams.id        === 'string' ? searchParams.id        : undefined

  // Build query — include branch + replies
  let query = supabase
    .from('reviews')
    .select('*, branches!inner(*), replies(*)')
    .eq('branches.business_id', userData.business_id)
    .order('review_time', { ascending: false })
    .limit(PAGE_SIZE + 1)

  if (selectedBranch)    query = query.eq('branch_id', selectedBranch)
  if (selectedRating)    query = query.eq('rating', parseInt(selectedRating))
  if (selectedSentiment) query = query.eq('sentiment', selectedSentiment as 'positive' | 'neutral' | 'negative')
  if (cursor)            query = query.lt('review_time', cursor)

  const { data: reviewsRaw, error } = await query
  if (error) throw error

  const hasNextPage = (reviewsRaw?.length ?? 0) > PAGE_SIZE
  const reviews = (hasNextPage ? reviewsRaw!.slice(0, PAGE_SIZE) : reviewsRaw ?? []) as ReviewWithBranch[]
  const nextCursor = hasNextPage ? reviewsRaw![PAGE_SIZE - 1].review_time : null

  const canReply = ['owner', 'manager'].includes(userData.role ?? '')

  // If coming from an alert link (?id=...), fetch that specific review to auto-open its modal
  let autoOpenReview: ReviewWithBranch | null = null
  if (highlightId) {
    const { data: found } = await supabase
      .from('reviews')
      .select('*, branches!inner(*), replies(*)')
      .eq('id', highlightId)
      .eq('branches.business_id', userData.business_id)
      .single()
    if (found) autoOpenReview = found as ReviewWithBranch
  }

  const buildUrl = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (selectedBranch)    params.set('branch',    selectedBranch)
    if (selectedRating)    params.set('rating',    selectedRating)
    if (selectedSentiment) params.set('sentiment', selectedSentiment)
    Object.entries(extra).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k))
    const qs = params.toString()
    return `/dashboard/reviews${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
        <p className="text-muted-foreground">
          Manage and respond to all your Google Business Profile reviews.
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<Skeleton className="h-10 w-full max-w-[520px]" />}>
        <ReviewsFilterBar branches={branches ?? []} />
      </Suspense>

      {/* Results summary */}
      <p className="text-sm text-muted-foreground">
        Showing {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        {selectedBranch && branches
          ? ` · ${branches.find(b => b.id === selectedBranch)?.name ?? ''}`
          : ''}
        {selectedRating    ? ` · ${selectedRating}★`    : ''}
        {selectedSentiment ? ` · ${selectedSentiment}` : ''}
      </p>

      {/* Table with Reply modal wired in */}
      <ReviewsTableClient reviews={reviews} canReply={canReply} autoOpenReview={autoOpenReview} />

      {/* Pagination */}
      <div className="flex gap-2">
        {cursor && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildUrl({ cursor: undefined })}>← First Page</Link>
          </Button>
        )}
        {hasNextPage && nextCursor && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildUrl({ cursor: nextCursor })}>Next Page →</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

