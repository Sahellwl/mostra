import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
      <Icon className="h-10 w-10 text-[#2a2a2a]" strokeWidth={1.5} />
      <div className="space-y-1">
        <p className="text-sm font-medium text-[#444444]">{title}</p>
        {description && <p className="text-xs text-[#333333]">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
