'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SentimentBadge } from '@/components/dashboard/sentiment-badge'
import { StarRating } from '@/components/dashboard/rating-badge'
import { ReplyModal } from '@/components/dashboard/reply-modal'
import { cn, truncate, getReplyStatusBadge, formatDate } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'
import type { ReviewWithBranch } from '@/types/database'

interface ReviewTableProps {
  reviews: ReviewWithBranch[]
  onReplied?: () => void
}

export function ReviewTable({ reviews, onReplied }: ReviewTableProps) {
  const [selectedReview, setSelectedReview] = useState<ReviewWithBranch | null>(null)

  return (
    <>
      <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
              <TableHead>Reviewer</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="min-w-[200px]">Review</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map(review => {
              const statusBadge = getReplyStatusBadge(review.reply_status)
              return (
                <TableRow key={review.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300 shrink-0">
                        {review.reviewer_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {review.reviewer_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{review.branches?.name}</TableCell>
                  <TableCell><StarRating rating={review.rating} /></TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                    {review.review_text ? truncate(review.review_text, 80) : <em className="text-slate-400 text-xs">No text</em>}
                  </TableCell>
                  <TableCell><SentimentBadge sentiment={review.sentiment} /></TableCell>
                  <TableCell>
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadge.className)}>
                      {statusBadge.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedReview(review)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      Reply
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ReplyModal
        review={selectedReview}
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        onReplied={onReplied}
      />
    </>
  )
}
