import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-[250px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[140px]" />
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b">
                    <div className="flex gap-4">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 border-b last:border-0 flex items-center justify-between">
                        <div className="flex items-center gap-3 w-1/4">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    )
}
