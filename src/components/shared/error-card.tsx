'use client'

import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ErrorCardProps {
  message?: string
  onRetry?: () => void
}

export function ErrorCard({ message = "Something went wrong.", onRetry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 inline-flex rounded-full bg-red-50 dark:bg-red-900/20 p-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Error</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
