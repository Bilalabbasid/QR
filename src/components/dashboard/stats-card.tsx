import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    description?: string
    trend?: {
        value: number
        label: string
        isPositive: boolean
    }
    className?: string
}

export function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    className,
}: StatsCardProps) {
    return (
        <Card className={cn("", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                        {title}
                    </p>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
                    {trend && (
                        <span
                            className={cn(
                                "text-xs font-medium",
                                trend.isPositive ? "text-emerald-500" : "text-destructive"
                            )}
                        >
                            {trend.isPositive ? "+" : "-"}{trend.value}%
                        </span>
                    )}
                </div>
                {description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
