import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getPhaseViewData } from '@/app/(dashboard)/projects/file-actions'
import FileViewer from '@/components/project/FileViewer'

interface PageProps {
  params: { id: string; phaseId: string }
  searchParams: { v?: string }
}

export default async function PhaseViewPage({ params, searchParams }: PageProps) {
  const requestedVersion = searchParams.v ? parseInt(searchParams.v, 10) : undefined

  const result = await getPhaseViewData(params.phaseId, requestedVersion)

  if ('error' in result) notFound()

  const { projectId, projectName, phaseName, files, signedUrl, activeVersion, uploaders } = result

  // Aucun fichier uploadé
  if (files.length === 0 || signedUrl === null || activeVersion === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {projectName}
          </Link>
          <h1 className="text-lg font-bold text-white mb-1">{phaseName}</h1>
          <p className="text-sm text-[#444444] italic mt-8">
            Aucun fichier uploadé sur cette phase.
          </p>
        </div>
      </div>
    )
  }

  const viewPath = `/projects/${params.id}/phases/${params.phaseId}/view`

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8 flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 gap-5">
        {/* Header */}
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {projectName}
          </Link>

          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold text-white">{phaseName}</h1>
            <span className="text-[#444444] text-sm">·</span>
            <span className="text-sm text-[#666666]">Fichiers</span>
          </div>
        </div>

        {/* Viewer */}
        <FileViewer
          files={files}
          activeVersion={activeVersion}
          signedUrl={signedUrl}
          viewPath={viewPath}
          uploaders={uploaders}
        />
      </div>
    </div>
  )
}
