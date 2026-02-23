import { cn } from '@/lib/utils'
import type { SentimentType } from '@/types/database'

interface SentimentBadgeProps {
  sentiment: SentimentType | null
  className?: string
}

const config: Record<SentimentType, { label: string; className: string }> = {
  positive: { label: 'Positive', className: 'bg-green-50 text-green-700 border-green-200' },
  neutral: { label: 'Neutral', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  negative: { label: 'Negative', className: 'bg-red-50 text-red-700 border-red-200' },
}

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  if (!sentiment) {
    return (
      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-slate-50 text-slate-500 border-slate-200', className)}>
        Unanalyzed
      </span>
    )
  }
  const { label, className: badgeClass } = config[sentiment]
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', badgeClass, className)}>
      {label}
    </span>
  )
}
