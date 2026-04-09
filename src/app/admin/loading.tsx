import { Skeleton } from '@/components/shared/Skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" style={{ backgroundColor: '#1e1e3a' }} />
          <Skeleton className="h-4 w-56" style={{ backgroundColor: '#1e1e3a' }} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 flex items-center gap-4"
          >
            <Skeleton className="w-9 h-9 flex-shrink-0" style={{ backgroundColor: '#1e1e3a' }} />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-7 w-12" style={{ backgroundColor: '#1e1e3a' }} />
              <Skeleton className="h-3 w-24" style={{ backgroundColor: '#1e1e3a' }} />
            </div>
          </div>
        ))}
      </div>

      {/* 2-column: bar chart + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Bar chart */}
        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-48" style={{ backgroundColor: '#1e1e3a' }} />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton
                  className="h-3 w-24 flex-shrink-0"
                  style={{ backgroundColor: '#1e1e3a' }}
                />
                <Skeleton
                  className="h-5 rounded-lg flex-1"
                  style={{ backgroundColor: '#1e1e3a', maxWidth: `${40 + i * 12}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-32" style={{ backgroundColor: '#1e1e3a' }} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: '#1e1e3a' }}
              />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-3 w-3/4" style={{ backgroundColor: '#1e1e3a' }} />
                <Skeleton className="h-2.5 w-1/2" style={{ backgroundColor: '#1e1e3a' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
