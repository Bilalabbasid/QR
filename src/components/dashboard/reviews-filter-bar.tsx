'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Branch {
  id: string
  name: string
}

interface ReviewsFilterBarProps {
  branches: Branch[]
}

export function ReviewsFilterBar({ branches }: ReviewsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentBranch = searchParams.get('branch') ?? 'all'
  const currentRating = searchParams.get('rating') ?? 'all'
  const currentSentiment = searchParams.get('sentiment') ?? 'all'

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      // Always reset cursor when filters change
      params.delete('cursor')
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      return params.toString()
    },
    [searchParams]
  )

  const handleChange = (key: string, value: string) => {
    router.push(`${pathname}?${createQueryString({ [key]: value })}`)
  }

  const hasFilters = currentBranch !== 'all' || currentRating !== 'all' || currentSentiment !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Branch filter */}
      <Select value={currentBranch} onValueChange={(v) => handleChange('branch', v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Branches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Branches</SelectItem>
          {branches.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Rating filter */}
      <Select value={currentRating} onValueChange={(v) => handleChange('rating', v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Ratings" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Ratings</SelectItem>
          <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
          <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
          <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
          <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
          <SelectItem value="1">⭐ 1 Star</SelectItem>
        </SelectContent>
      </Select>

      {/* Sentiment filter */}
      <Select value={currentSentiment} onValueChange={(v) => handleChange('sentiment', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Sentiments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sentiments</SelectItem>
          <SelectItem value="positive">😊 Positive</SelectItem>
          <SelectItem value="neutral">😐 Neutral</SelectItem>
          <SelectItem value="negative">😠 Negative</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => router.push(pathname)}
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}
