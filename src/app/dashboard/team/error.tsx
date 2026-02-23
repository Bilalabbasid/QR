'use client'
import { ErrorCard } from '@/components/shared/error-card'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard message={error.message} onRetry={reset} />
}
