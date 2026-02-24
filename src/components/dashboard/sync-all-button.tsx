'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { triggerAllSync } from '@/actions/branches'
import { useToast } from '@/components/ui/use-toast'

export function SyncAllButton() {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleSync = () => {
    startTransition(async () => {
      try {
        await triggerAllSync()
        toast({ title: 'Sync complete', description: 'Reviews have been synced from Google.' })
      } catch {
        toast({
          title: 'Sync failed',
          description: 'Could not sync reviews. Try again.',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <Button variant="outline" className="gap-2" onClick={handleSync} disabled={isPending}>
      <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Syncing…' : 'Sync All'}
    </Button>
  )
}
