import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <Skeleton className="h-10 w-[200px] mb-2" />
                <Skeleton className="h-4 w-[350px]" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-5 w-[150px]" />
                        <Skeleton className="h-3 w-[250px]" />
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-[120px]" />
                            <Skeleton className="h-3 w-full" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-10 w-full rounded-md" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
