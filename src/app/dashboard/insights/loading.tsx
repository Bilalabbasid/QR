import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-4 w-[350px]" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1">
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                    </CardContent>
                </Card>

                <Card className="col-span-2">
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <Skeleton key={i} className="h-24 w-[120px] rounded-xl" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
