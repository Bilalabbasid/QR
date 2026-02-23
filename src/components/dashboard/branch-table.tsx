import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { BranchStats } from '@/types/database'

interface BranchTableProps {
  branches: BranchStats[]
}

export function BranchTable({ branches }: BranchTableProps) {
  return (
    <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
            <TableHead>Branch</TableHead>
            <TableHead className="text-center">Avg Rating</TableHead>
            <TableHead className="text-center">Total Reviews</TableHead>
            <TableHead className="text-center">% Negative</TableHead>
            <TableHead>Last Review</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map(branch => (
            <TableRow key={branch.branch_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
              <TableCell className="font-medium">{branch.branch_name}</TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  'font-semibold',
                  branch.avg_rating >= 4 ? 'text-green-600' :
                  branch.avg_rating >= 3 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  ★ {branch.avg_rating?.toFixed(1) ?? '—'}
                </span>
              </TableCell>
              <TableCell className="text-center text-slate-600 dark:text-slate-300">
                {branch.total_reviews}
              </TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  branch.negative_percentage > 30
                    ? 'bg-red-50 text-red-700'
                    : branch.negative_percentage > 15
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-green-50 text-green-700'
                )}>
                  {branch.negative_percentage?.toFixed(1) ?? 0}%
                </span>
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {branch.last_review_date ? formatDate(branch.last_review_date) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
