import type { PhaseStatus, ProjectStatus } from '@/lib/types'

type Status = ProjectStatus | PhaseStatus

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  // Project statuses
  active:      { label: 'Active',      className: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' },
  completed:   { label: 'Completed',   className: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' },
  archived:    { label: 'Archived',    className: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20' },
  on_hold:     { label: 'On hold',     className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  // Phase statuses
  pending:     { label: 'Pending',     className: 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20' },
  in_progress: { label: 'In Progress', className: 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20' },
  in_review:   { label: 'In Review',   className: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  approved:    { label: 'Approved',    className: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
        ${config.className} ${className}
      `}
    >
      {config.label}
    </span>
  )
}
