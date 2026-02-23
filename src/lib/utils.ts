import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRating(rating: number): string {
  return rating.toFixed(1)
}

export function getSentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'negative':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  }
}

export function getRatingColor(rating: number): string {
  if (rating >= 4) return 'text-green-600'
  if (rating >= 3) return 'text-yellow-600'
  return 'text-red-600'
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getReplyStatusBadge(status: string) {
  switch (status) {
    case 'auto_replied':
      return { label: 'Auto Replied', className: 'bg-blue-50 text-blue-700' }
    case 'manual_replied':
      return { label: 'Replied', className: 'bg-green-50 text-green-700' }
    default:
      return { label: 'No Reply', className: 'bg-slate-50 text-slate-600' }
  }
}
