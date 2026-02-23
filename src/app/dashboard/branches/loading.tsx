import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-4 w-[350px]" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-[150px]" />
                                <Skeleton className="h-3 w-[100px]" />
                            </div>
                            <Skeleton className="h-5 w-[60px] rounded-full" />
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Skeleton className="h-9 w-full rounded-md" />
                            <Skeleton className="h-9 w-full rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
