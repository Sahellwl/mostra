import { getUsers, getAgenciesWithStats } from '../actions'
import { USERS_PER_PAGE } from '../constants'
import UsersClient from './UsersClient'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { search?: string; role?: string; agencyId?: string; page?: string }
}) {
  const search = searchParams.search ?? ''
  const role = searchParams.role ?? ''
  const agencyId = searchParams.agencyId ?? ''
  const page = Math.max(0, parseInt(searchParams.page ?? '0') || 0)

  const [{ users, total }, agencies] = await Promise.all([
    getUsers({ search, role: role || undefined, agencyId: agencyId || undefined, page }),
    getAgenciesWithStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Utilisateurs</h1>
        <p className="text-sm text-[#555577] mt-0.5">Tous les comptes cross-agences</p>
      </div>

      <UsersClient
        users={users}
        total={total}
        page={page}
        perPage={USERS_PER_PAGE}
        agencies={agencies.map((a) => ({ id: a.id, name: a.name }))}
        search={search}
        role={role}
        agencyId={agencyId}
      />
    </div>
  )
}
