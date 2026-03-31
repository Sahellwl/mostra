import { formatDistance, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatRelative(date: string | Date): string {
  return formatDistance(new Date(date), new Date(), { addSuffix: true, locale: fr })
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy', { locale: fr })
}
