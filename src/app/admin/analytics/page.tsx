import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Users, Clock, Layers, HardDrive } from 'lucide-react'
import { getAnalytics, type AnalyticsPeriod } from '../actions'
import AdminLineChart from '@/components/admin/charts/AdminLineChart'
import AdminBarChart from '@/components/admin/charts/AdminBarChart'
import AdminPieChart from '@/components/admin/charts/AdminPieChart'

export const metadata: Metadata = {
  title: 'Analytics — MOSTRA Admin',
  description: 'Statistiques et métriques de la plateforme.',
}

const ACCENT = '#8B5CF6'

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '12m', label: '12 mois' },
  { value: 'all', label: 'Tout' },
]

function isValidPeriod(v: string | undefined): v is AnalyticsPeriod {
  return ['7d', '30d', '90d', '12m', 'all'].includes(v ?? '')
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5 flex items-start gap-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${ACCENT}20`, border: `1px solid ${ACCENT}30`, color: ACCENT }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-[11px] text-[#555577] mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-[#444466] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const period: AnalyticsPeriod = isValidPeriod(searchParams.period) ? searchParams.period : '12m'

  const data = await getAnalytics(period)
  const { kpis } = data

  return (
    <div className="space-y-7">
      {/* Header + Period filter */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-[#555577] mt-0.5">Données cross-agences</p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/admin/analytics?period=${p.value}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                period === p.value
                  ? { backgroundColor: ACCENT, color: '#fff' }
                  : { color: '#555577' }
              }
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={TrendingUp}
          label="Taux de complétion moyen"
          value={`${kpis.avgCompletion}%`}
          sub="Moyenne de la progression des projets"
        />
        <KpiCard
          icon={Clock}
          label="Durée moyenne d'un projet"
          value={kpis.avgDurationDays !== null ? `${kpis.avgDurationDays}j` : '—'}
          sub="Projets terminés · création → completion"
        />
        <KpiCard
          icon={Layers}
          label="Phases par projet (moy.)"
          value={String(kpis.avgPhasesPerProject)}
          sub="Toutes agences confondues"
        />
        <KpiCard
          icon={HardDrive}
          label="Stockage total"
          value={`${kpis.totalFileSizeGB} GB`}
          sub="Tous fichiers uploadés"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Projets créés">
          <AdminLineChart data={data.projectsOverTime} color={ACCENT} />
        </ChartCard>

        <ChartCard title="Nouveaux utilisateurs">
          <AdminLineChart data={data.usersOverTime} color="#3B82F6" />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Projets par agence (top 10)">
          <AdminBarChart data={data.projectsByAgency} color={ACCENT} />
        </ChartCard>

        <ChartCard title="Répartition par statut">
          <AdminPieChart data={data.projectsByStatus} />
        </ChartCard>
      </div>
    </div>
  )
}
