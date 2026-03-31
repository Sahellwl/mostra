import { redirect } from 'next/navigation'

// src/app/page.tsx gère "/" avec la logique de rôle.
// Ce fichier existe pour éviter un 404 si Next.js résout ce groupe vers "/".
export default function DashboardGroupRoot() {
  redirect('/dashboard')
}
