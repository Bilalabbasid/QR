'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SentimentBadge } from '@/components/dashboard/sentiment-badge'
import { StarRating } from '@/components/dashboard/rating-badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Sparkles, Send } from 'lucide-react'
import type { ReviewWithBranch } from '@/types/database'

interface ReplyModalProps {
  review: ReviewWithBranch | null
  open: boolean
  onClose: () => void
  onReplied?: () => void
}

export function ReplyModal({ review, open, onClose, onReplied }: ReplyModalProps) {
  const { toast } = useToast()
  const [replyText, setReplyText] = useState(review?.ai_suggested_reply ?? '')
  const [isPending, startTransition] = useTransition()

  // Sync text when review changes
  if (review && replyText === '' && review.ai_suggested_reply) {
    setReplyText(review.ai_suggested_reply)
  }

  const handleOpen = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setReplyText('')
    }
  }

  const handlePost = () => {
    if (!review || !replyText.trim()) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/reviews/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId: review.id, replyText }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to post reply')
        toast({ title: 'Reply posted!', description: 'Your reply has been posted to Google.' })
        onReplied?.()
        onClose()
      } catch (err: unknown) {
        toast({
          title: 'Failed to post reply',
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  if (!review) return null

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply to Review</DialogTitle>
        </DialogHeader>

        {/* Review details */}
        <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
                {review.reviewer_name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="font-medium text-sm">{review.reviewer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <SentimentBadge sentiment={review.sentiment} />
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {review.review_text ?? <em className="text-slate-400">No review text</em>}
          </p>
          <div className="text-xs text-slate-400">
            {review.branches?.name} · {new Date(review.review_time).toLocaleDateString()}
          </div>
        </div>

        {/* AI suggestion indicator */}
        {review.ai_suggested_reply && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5" />
            AI-generated reply pre-filled below — edit as needed
          </div>
        )}

        {/* Reply textarea */}
        <Textarea
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder="Write your reply..."
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-slate-400 text-right">{replyText.length} / 4000</p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={isPending || !replyText.trim()}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Post to Google</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
