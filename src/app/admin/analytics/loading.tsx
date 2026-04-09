import { Skeleton } from '@/components/shared/Skeleton'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Header + period filter */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32" style={{ backgroundColor: '#1e1e3a' }} />
          <Skeleton className="h-4 w-52" style={{ backgroundColor: '#1e1e3a' }} />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className="h-8 w-16 rounded-lg"
              style={{ backgroundColor: '#1e1e3a' }}
            />
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 flex items-start gap-4"
          >
            <Skeleton
              className="w-9 h-9 flex-shrink-0 mt-0.5"
              style={{ backgroundColor: '#1e1e3a' }}
            />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-7 w-14" style={{ backgroundColor: '#1e1e3a' }} />
              <Skeleton className="h-3 w-24" style={{ backgroundColor: '#1e1e3a' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 space-y-4">
        <Skeleton className="h-4 w-40" style={{ backgroundColor: '#1e1e3a' }} />
        <Skeleton className="h-48 w-full" style={{ backgroundColor: '#1e1e3a' }} />
      </div>

      {/* 2-column: bar + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-48" style={{ backgroundColor: '#1e1e3a' }} />
          <Skeleton className="h-48 w-full" style={{ backgroundColor: '#1e1e3a' }} />
        </div>
        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-36" style={{ backgroundColor: '#1e1e3a' }} />
          <Skeleton
            className="h-48 w-full rounded-full mx-auto"
            style={{ backgroundColor: '#1e1e3a', maxWidth: '192px' }}
          />
        </div>
      </div>
    </div>
  )
}
