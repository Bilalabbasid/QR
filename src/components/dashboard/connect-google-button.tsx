'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ConnectGoogleButtonProps {
    isConnected: boolean
    googleAccountId?: string | null
    googleAccountName?: string | null
}

export function ConnectGoogleButton({ isConnected, googleAccountId, googleAccountName }: ConnectGoogleButtonProps) {
    const [loading, setLoading] = useState(false)

    function handleConnect() {
        setLoading(true)
        window.location.href = '/api/auth/google'
    }

    if (isConnected) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border shadow-sm shrink-0">
                            <span className="font-bold text-red-500 text-xl">G</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Google Account Connected</p>
                            {(googleAccountName || googleAccountId) && (
                                <p className="text-xs text-slate-500 font-medium">
                                    {googleAccountName ?? googleAccountId}
                                </p>
                            )}
                            <p className="text-xs text-slate-500">Reviews are syncing automatically</p>
                        </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleConnect}
                    disabled={loading}
                >
                    {loading ? 'Redirecting…' : 'Reconnect Account'}
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border shadow-sm shrink-0">
                        <span className="font-bold text-slate-400 text-xl">G</span>
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Google Account Not Connected</p>
                        <p className="text-xs text-slate-500">Connect to start syncing reviews</p>
                    </div>
                </div>
                <Badge variant="secondary">Disconnected</Badge>
            </div>
            <Button
                className="w-full"
                onClick={handleConnect}
                disabled={loading}
            >
                {loading ? 'Redirecting to Google…' : 'Connect Google Business'}
            </Button>
        </div>
    )
}
