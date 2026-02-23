'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface RatingBarChartProps {
  data: { rating: number; count: number }[]
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']

export function RatingBarChart({ data }: RatingBarChartProps) {
  const chartData = [1, 2, 3, 4, 5].map(r => ({
    rating: `${r}★`,
    count: data.find(d => d.rating === r)?.count ?? 0,
    rawRating: r,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [value, 'Reviews']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={COLORS[entry.rawRating - 1]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
