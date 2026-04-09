interface ProgressBarProps {
  value: number // 0–100
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export default function ProgressBar({
  value,
  className = '',
  showLabel = false,
  size = 'sm',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const height = size === 'sm' ? 'h-1' : 'h-1.5'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex-1 ${height} bg-[#2a2a2a] rounded-full overflow-hidden`}>
        <div
          className="h-full bg-[#EF4444] rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-[#666666] tabular-nums w-8 text-right">{clamped}%</span>
      )}
    </div>
  )
}
