import ClientPhaseCard from './ClientPhaseCard'
import type { Project, ProjectPhase } from '@/lib/types'

interface ClientProjectViewProps {
  project: Project
  phases: ProjectPhase[]
  token: string
}

export default function ClientProjectView({ project, phases, token }: ClientProjectViewProps) {
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        {project.description && (
          <p className="text-sm text-[#666666] mt-1">{project.description}</p>
        )}
      </div>

      {/* ── Progression globale ─────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-[#444444] uppercase tracking-widest font-medium">
              Overall Progress
            </p>
            <p className="text-xs text-[#666666] mt-0.5">
              {phases.filter((p) => p.status === 'completed' || p.status === 'approved').length}
              {' / '}
              {phases.length} phases complétées
            </p>
          </div>
          <span className="text-4xl font-black text-white tabular-nums">
            {project.progress}
            <span className="text-xl text-[#444444]">%</span>
          </span>
        </div>

        {/* Barre de progression */}
        <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00D76B] rounded-full transition-all duration-700"
            style={{ width: `${project.progress}%` }}
          />
        </div>

        {/* Indicateurs mini par phase */}
        {phases.length > 0 && (
          <div className="flex gap-1 mt-3">
            {phases.map((phase) => {
              const isDone = phase.status === 'completed' || phase.status === 'approved'
              const isActive = phase.status === 'in_review' || phase.status === 'in_progress'
              return (
                <div
                  key={phase.id}
                  className="flex-1 h-1 rounded-full transition-colors"
                  style={{
                    backgroundColor: isDone ? '#22C55E' : isActive ? '#00D76B' : '#2a2a2a',
                  }}
                  title={phase.name}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ── Pipeline ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Pipeline</h2>
        <div className="space-y-2">
          {phases.length === 0 ? (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
              <p className="text-xs text-[#444444] italic">Aucune phase configurée.</p>
            </div>
          ) : (
            phases.map((phase, i) => (
              <ClientPhaseCard
                key={phase.id}
                phase={phase}
                token={token}
                isFirst={i === 0}
                isLast={i === phases.length - 1}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
