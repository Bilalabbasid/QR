import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingBadgeProps {
  rating: number
  showCount?: boolean
  className?: string
}

export function RatingBadge({ rating, className }: RatingBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={cn(
            'h-3.5 w-3.5',
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-slate-300 fill-slate-300'
          )}
        />
      ))}
      <span className="ml-1 text-sm font-medium text-slate-700 dark:text-slate-300">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

export function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'
          )}
        />
      ))}
    </div>
  )
}
