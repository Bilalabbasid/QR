'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface BranchRadarChartProps {
  data: { metric: string; value: number }[]
}

export function BranchRadarChart({ data }: BranchRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
        <Radar
          name="Score"
          dataKey="value"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
