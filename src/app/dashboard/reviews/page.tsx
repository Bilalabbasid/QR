import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import { format } from 'date-fns'

export default async function ReviewsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data: userData } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single()

    if (!userData?.business_id) redirect('/onboarding')

    const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined
    const PAGE_SIZE = 25

    // Fetch reviews via branches to enforce tenant isolation
    let query = supabase
        .from('reviews')
        .select('*, branches!inner(*)')
        .eq('branches.business_id', userData.business_id)
        .order('review_time', { ascending: false })
        .limit(PAGE_SIZE + 1) // Fetch one extra to check if there is a next page

    if (cursor) {
        query = query.lt('review_time', cursor)
    }

    const { data: reviews, error } = await query

    if (error) throw error

    const hasNextPage = reviews && reviews.length > PAGE_SIZE
    const displayReviews = hasNextPage ? reviews.slice(0, PAGE_SIZE) : reviews
    const nextCursor = hasNextPage ? reviews[PAGE_SIZE - 1].review_time : null

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Manage and respond to all your Google Business Profile reviews.
                </p>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Reviewer</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead className="max-w-[400px]">Review</TableHead>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayReviews?.map((review) => (
                            <TableRow key={review.id}>
                                <TableCell className="whitespace-nowrap">
                                    {format(new Date(review.review_time), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {review.reviewer_name}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">{review.rating}</span>
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[400px]">
                                    <p className="truncate text-slate-600 dark:text-slate-400" title={review.review_text || ''}>
                                        {review.review_text || <span className="italic text-slate-400">No comment</span>}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    {review.sentiment && (
                                        <Badge variant={
                                            review.sentiment === 'positive' ? 'success' :
                                                review.sentiment === 'negative' ? 'destructive' : 'secondary'
                                        }>
                                            {review.sentiment}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {review.branches.name}
                                </TableCell>
                                <TableCell>
                                    {review.reply_text ? (
                                        <Badge variant="outline">Replied</Badge>
                                    ) : (
                                        <Badge variant="warning">Awaiting Reply</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {displayReviews?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    No reviews found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                    Showing {displayReviews?.length || 0} reviews
                </p>
                <div className="flex gap-2">
                    {cursor && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard/reviews">First Page</Link>
                        </Button>
                    )}
                    {hasNextPage && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/reviews?cursor=${nextCursor}`}>
                                Next Page
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
