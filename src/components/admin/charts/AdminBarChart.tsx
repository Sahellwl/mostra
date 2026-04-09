'use client'

import { useState, useEffect } from 'react'
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

interface Props {
  data: { name: string; count: number }[]
  color?: string
  height?: number
}

const ACCENT = '#8B5CF6'

export default function AdminBarChart({ data, color = ACCENT, height = 220 }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div style={{ height }} className="rounded-lg bg-[#080810] animate-pulse" />
  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-[#444466]">Aucune donnée.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {/* Barres horizontales — noms sur l'axe Y */}
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 0, right: 24, left: 4, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#555577', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#a0a0cc', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0d0d1a',
            border: '1px solid #1e1e3a',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
          }}
          cursor={{ fill: `${color}10` }}
          formatter={(v) => [v, 'Projets']}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={1 - i * 0.06} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
