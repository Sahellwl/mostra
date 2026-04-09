import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: number | string
  color: string
  /** Icon size class — defaults to "h-4 w-4" */
  iconSize?: string
}

export function StatCard({ icon: Icon, label, value, color, iconSize = 'h-4 w-4' }: Props) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('fr-FR') : value

  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ backgroundColor: '#111111', border: '1px solid #1a1a1a' }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30`, color }}
      >
        <Icon className={iconSize} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{displayValue}</p>
        <p className="text-[11px] text-[#555555] mt-0.5">{label}</p>
      </div>
    </div>
  )
}

/** Variant for the admin space (dark background) */
export function AdminStatCard({ icon: Icon, label, value, color, iconSize = 'h-4 w-4' }: Props) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('fr-FR') : value

  return (
    <div
      className="rounded-xl p-5 flex items-center gap-4"
      style={{ backgroundColor: '#0d0d1a', border: '1px solid #1e1e3a' }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30`, color }}
      >
        <Icon className={iconSize} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{displayValue}</p>
        <p className="text-[11px] text-[#555577] mt-0.5">{label}</p>
      </div>
    </div>
  )
}
