'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface MonthlyDataPoint {
  month: string
  count: number
  avgRating?: number
}

interface MonthlyLineChartProps {
  data: MonthlyDataPoint[]
  showRating?: boolean
}

export function MonthlyLineChart({ data, showRating = false }: MonthlyLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        {showRating && <Legend />}
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
          name="Reviews"
        />
        {showRating && (
          <Line
            type="monotone"
            dataKey="avgRating"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3 }}
            name="Avg Rating"
            yAxisId="right"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
