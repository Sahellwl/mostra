'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  data: { label: string; count: number }[]
  color?: string
  height?: number
}

export default function AdminLineChart({ data, color = '#8B5CF6', height = 220 }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const empty = data.every((d) => d.count === 0)

  if (!mounted) {
    return <div style={{ height }} className="rounded-lg bg-[#080810] animate-pulse" />
  }
  if (empty) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-[#444466]">Aucune donnée pour cette période.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#555577', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#555577', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0d0d1a',
            border: '1px solid #1e1e3a',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
          }}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
          formatter={(v) => [v, 'Total']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
