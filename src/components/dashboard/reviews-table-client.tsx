'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ReplyModal } from '@/components/dashboard/reply-modal'
import { Star, ChevronDown, ChevronUp, MessageSquare, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import type { ReviewWithBranch } from '@/types/database'

interface ReviewsTableClientProps {
  reviews: ReviewWithBranch[]
  canReply: boolean
  autoOpenReview?: ReviewWithBranch | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold text-sm">{rating}</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null
  const map: Record<string, { label: string; className: string }> = {
    positive: { label: '😊 Positive', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    neutral:  { label: '😐 Neutral',  className: 'bg-slate-100 text-slate-600 border-slate-200' },
    negative: { label: '😠 Negative', className: 'bg-red-100 text-red-700 border-red-200' },
  }
  const s = map[sentiment]
  if (!s) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      {s.label}
    </span>
  )
}

function ReviewTextCell({ text, replyText }: { text: string | null; replyText?: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const TRUNCATE_AT = 120

  const isTruncatable = (text?.length ?? 0) > TRUNCATE_AT

  return (
    <div className="space-y-2 max-w-[420px]">
      {/* Review text */}
      <div>
        <p className="text-sm text-foreground leading-relaxed">
          {text ? (
            isTruncatable && !expanded
              ? <>{text.slice(0, TRUNCATE_AT)}<span className="text-muted-foreground">…</span></>
              : text
          ) : (
            <em className="text-muted-foreground">No review text</em>
          )}
        </p>
        {isTruncatable && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary flex items-center gap-0.5 mt-0.5 hover:underline"
          >
            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
          </button>
        )}
      </div>

      {/* Existing reply */}
      {replyText && (
        <div className="border-l-2 border-primary/40 pl-3 bg-primary/5 rounded-r py-1.5">
          <p className="text-xs text-muted-foreground font-medium mb-0.5 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-500" /> Your reply
          </p>
          <p className="text-xs text-foreground leading-relaxed">{replyText}</p>
        </div>
      )}
    </div>
  )
}

export function ReviewsTableClient({ reviews, canReply, autoOpenReview }: ReviewsTableClientProps) {
  const router = useRouter()
  const [selectedReview, setSelectedReview] = useState<ReviewWithBranch | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Auto-open modal when arriving from an alert link (?id=...)
  useEffect(() => {
    if (autoOpenReview && canReply) {
      setSelectedReview(autoOpenReview)
      setModalOpen(true)
    }
  }, [autoOpenReview?.id])

  const handleReply = (review: ReviewWithBranch) => {
    setSelectedReview(review)
    setModalOpen(true)
  }

  const handleReplied = () => {
    // Re-fetch server component data so badge and reply text update immediately
    router.refresh()
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-border rounded-lg bg-secondary/20">
        <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="font-medium">No reviews found</h3>
        <p className="text-sm text-muted-foreground mt-1">Try changing or clearing your filters.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead className="w-[140px]">Reviewer</TableHead>
              <TableHead className="w-[130px]">Rating</TableHead>
              <TableHead>Review &amp; Reply</TableHead>
              <TableHead className="w-[120px]">Sentiment</TableHead>
              <TableHead className="w-[130px]">Branch</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              {canReply && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => {
              const existingReply = review.replies?.[0]?.reply_text ?? null
              return (
                <TableRow key={review.id} className="align-top">
                  <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {review.review_time
                      ? format(new Date(review.review_time), 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                        {review.reviewer_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm font-medium leading-tight">{review.reviewer_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <StarRating rating={review.rating} />
                  </TableCell>
                  <TableCell className="py-4">
                    <ReviewTextCell text={review.review_text} replyText={existingReply} />
                  </TableCell>
                  <TableCell className="py-4">
                    <SentimentBadge sentiment={review.sentiment} />
                  </TableCell>
                  <TableCell className="py-4 text-sm whitespace-nowrap">
                    {review.branches.name}
                  </TableCell>
                  <TableCell className="py-4">
                    {existingReply ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                        Replied
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-amber-600 border-amber-300 bg-amber-50">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  {canReply && (
                    <TableCell className="py-4">
                      <Button
                        size="sm"
                        variant={existingReply ? 'outline' : 'default'}
                        className="h-7 text-xs"
                        onClick={() => handleReply(review)}
                      >
                        {existingReply ? 'Edit' : 'Reply'}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ReplyModal
        review={selectedReview}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedReview(null) }}
        onReplied={handleReplied}
      />
    </>
  )
}
