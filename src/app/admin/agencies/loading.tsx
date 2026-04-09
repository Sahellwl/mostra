import { Skeleton } from '@/components/shared/Skeleton'

export default function AgenciesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" style={{ backgroundColor: '#1e1e3a' }} />
          <Skeleton className="h-4 w-44" style={{ backgroundColor: '#1e1e3a' }} />
        </div>
        <Skeleton className="h-9 w-40" style={{ backgroundColor: '#1e1e3a' }} />
      </div>

      {/* Search bar */}
      <Skeleton className="h-9 w-72" style={{ backgroundColor: '#1e1e3a' }} />

      {/* Agency list */}
      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl px-5 py-4 flex items-center gap-4"
          >
            {/* Logo placeholder */}
            <Skeleton
              className="w-10 h-10 rounded-xl flex-shrink-0"
              style={{ backgroundColor: '#1e1e3a' }}
            />

            {/* Name + slug */}
            <div className="space-y-1 flex-1 min-w-0">
              <Skeleton className="h-4 w-1/4" style={{ backgroundColor: '#1e1e3a' }} />
              <Skeleton className="h-3 w-1/5" style={{ backgroundColor: '#1e1e3a' }} />
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-8">
              {[0, 1, 2].map((j) => (
                <div key={j} className="space-y-1 text-right">
                  <Skeleton className="h-4 w-8" style={{ backgroundColor: '#1e1e3a' }} />
                  <Skeleton className="h-3 w-14" style={{ backgroundColor: '#1e1e3a' }} />
                </div>
              ))}
            </div>

            {/* Chevron */}
            <Skeleton className="w-4 h-4 flex-shrink-0" style={{ backgroundColor: '#1e1e3a' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
