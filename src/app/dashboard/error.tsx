'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
            <Card className="max-w-md w-full border-red-100 dark:border-red-900/50">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <CardTitle className="text-xl">Something went wrong</CardTitle>
                    <CardDescription>
                        An unexpected error occurred while loading this page.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded text-xs font-mono text-slate-500 break-all">
                        {error.message || 'Unknown error'}
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => reset()} className="w-full gap-2" variant="default">
                            <RefreshCcw className="h-4 w-4" />
                            Try again
                        </Button>
                        <Button asChild variant="outline" className="w-full gap-2">
                            <Link href="/dashboard">
                                <Home className="h-4 w-4" />
                                Dashboard
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
