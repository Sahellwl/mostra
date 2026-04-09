'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface Props {
  data: { name: string; value: number }[]
  height?: number
}

const PALETTE = ['#22C55E', '#8B5CF6', '#6B7280', '#F59E0B', '#3B82F6', '#EF4444']

export default function AdminPieChart({ data, height = 220 }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <div style={{ height }} className="rounded-lg bg-[#080810] animate-pulse" />

  const filled = data.filter((d) => d.value > 0)
  if (!filled.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-sm text-[#444466]">Aucune donnée.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={filled}
          cx="50%"
          cy="45%"
          innerRadius="52%"
          outerRadius="75%"
          dataKey="value"
          paddingAngle={3}
          stroke="none"
        >
          {filled.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#0d0d1a',
            border: '1px solid #1e1e3a',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: '#6b6b9a', paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
