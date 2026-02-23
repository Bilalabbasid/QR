import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <Skeleton className="h-10 w-[200px] mb-2" />
                <Skeleton className="h-4 w-[350px]" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-[150px]" />
                            <Skeleton className="h-3 w-[250px]" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            {i % 2 === 0 && <Skeleton className="h-9 w-1/3 mt-4" />}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
