import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getClientPhaseViewData } from '@/app/client/actions'
import FileViewer from '@/components/project/FileViewer'
import ApprovalPanel from '@/components/client/ApprovalPanel'
import { getClientSignedUrl } from '@/app/client/actions'

interface ClientPhasePageProps {
  params: { token: string; phaseId: string }
  searchParams: { v?: string }
}

export default async function ClientPhasePage({ params, searchParams }: ClientPhasePageProps) {
  const requestedVersion = searchParams.v ? Number(searchParams.v) : undefined
  const data = await getClientPhaseViewData(params.token, params.phaseId, requestedVersion)

  // Token ou phase invalide
  if ('error' in data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm text-[#EF4444]">{data.error}</p>
        <Link
          href={`/client/${params.token}`}
          className="text-xs text-[#666666] hover:text-white transition-colors"
        >
          ← Retour au projet
        </Link>
      </div>
    )
  }

  // Phase non accessible par le client (pending / in_progress)
  if (data.phaseStatus === 'pending' || data.phaseStatus === 'in_progress') {
    redirect(`/client/${params.token}`)
  }

  // Lien de téléchargement public (sans session)
  async function clientGetSignedUrl(filePath: string) {
    'use server'
    return getClientSignedUrl(params.token, filePath)
  }

  return (
    <div className="space-y-5">
      {/* ── Fil d'Ariane ──────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-xs text-[#666666]">
        <Link
          href={`/client/${params.token}`}
          className="inline-flex items-center gap-1 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          {data.projectName}
        </Link>
        <span className="text-[#333333]">/</span>
        <span className="text-[#a0a0a0]">{data.phaseName}</span>
      </div>

      {/* ── Panneau d'approbation ──────────────────────────────────── */}
      <ApprovalPanel
        token={params.token}
        phaseId={params.phaseId}
        phaseName={data.phaseName}
        status={data.phaseStatus}
        completedAt={data.completedAt}
      />

      {/* ── Viewer ────────────────────────────────────────────────── */}
      {data.files.length === 0 ? (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-10 text-center">
          <p className="text-sm text-[#444444] italic">
            Aucun fichier disponible pour cette phase.
          </p>
        </div>
      ) : (
        <FileViewer
          files={data.files}
          activeVersion={data.activeVersion ?? data.files[0].version}
          signedUrl={data.signedUrl ?? ''}
          viewPath={`/client/${params.token}/phases/${params.phaseId}`}
          uploaders={data.uploaders}
          getSignedUrlFn={clientGetSignedUrl}
        />
      )}
    </div>
  )
}
