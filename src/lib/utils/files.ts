export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function buildStoragePath(
  projectId: string,
  phase: string,
  version: number,
  filename: string,
): string {
  return `project-files/${projectId}/${phase}/v${version}/${filename}`
}
