import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-4 w-[350px]" />
            </div>

            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                            <Skeleton className="h-12 w-full mt-2" />
                        </div>
                        <div className="space-y-2 w-[100px]">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
