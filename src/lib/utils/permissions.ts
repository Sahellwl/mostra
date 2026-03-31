import type { UserRole } from '@/lib/types'

// ============================================================
// Matrice de permissions MOSTRA
// Ref: MOSTRA_ARCHITECTURE.md section 2.1
// ============================================================

// ----------------------------------------------------------
// Agences
// ----------------------------------------------------------

/** Créer une agence (super_admin uniquement) */
export function canCreateAgency(role: UserRole | null): boolean {
  return role === 'super_admin'
}

/** Gérer les paramètres d'une agence */
export function canManageAgencySettings(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

// ----------------------------------------------------------
// Projets
// ----------------------------------------------------------

/** Créer un projet */
export function canCreateProject(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

/** Voir tous les projets de l'agence */
export function canViewAllProjects(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

/** Voir ses projets assignés uniquement */
export function canViewAssignedProjects(role: UserRole | null): boolean {
  return role !== null
}

/** Modifier un projet (nom, description, statut) */
export function canEditProject(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

/** Supprimer un projet */
export function canDeleteProject(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

/** Assigner un créatif à un projet */
export function canAssignCreative(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

// ----------------------------------------------------------
// Phases
// ----------------------------------------------------------

/** Avancer une phase (passer en in_progress, in_review…) */
export function canAdvancePhase(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin' || role === 'creative'
}

/** Envoyer une phase en review */
export function canSendToReview(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin' || role === 'creative'
}

/** Approuver un livrable */
export function canApproveDeliverable(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin' || role === 'client'
}

// ----------------------------------------------------------
// Fichiers
// ----------------------------------------------------------

/** Uploader des fichiers sur une phase */
export function canUploadFile(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin' || role === 'creative'
}

/** Supprimer un fichier */
export function canDeleteFile(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

// ----------------------------------------------------------
// Commentaires
// ----------------------------------------------------------

/** Poster un commentaire */
export function canComment(role: UserRole | null): boolean {
  return role !== null
}

/** Résoudre / supprimer un commentaire */
export function canModerateComment(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

// ----------------------------------------------------------
// Clients
// ----------------------------------------------------------

/** Gérer les clients (CRUD) */
export function canManageClients(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

/** Inviter des utilisateurs */
export function canInviteUsers(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

// ----------------------------------------------------------
// Équipe
// ----------------------------------------------------------

/** Gérer l'équipe (voir, inviter, désactiver) */
export function canManageTeam(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

/** Configurer le pipeline (phases templates) */
export function canManagePipeline(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin'
}

// ----------------------------------------------------------
// Logs & activité
// ----------------------------------------------------------

/** Voir les logs d'activité */
export function canViewActivityLogs(role: UserRole | null): boolean {
  return role === 'super_admin' || role === 'agency_admin' || role === 'creative'
}

// ----------------------------------------------------------
// Super Admin
// ----------------------------------------------------------

/** Accéder au panneau super admin */
export function canAccessSuperAdmin(role: UserRole | null): boolean {
  return role === 'super_admin'
}

// ----------------------------------------------------------
// Helper : retourne les permissions d'un rôle sous forme d'objet
// Utile pour passer les permissions à des composants enfants
// ----------------------------------------------------------

export interface Permissions {
  createAgency: boolean
  manageAgencySettings: boolean
  createProject: boolean
  viewAllProjects: boolean
  editProject: boolean
  deleteProject: boolean
  assignCreative: boolean
  advancePhase: boolean
  sendToReview: boolean
  approveDeliverable: boolean
  uploadFile: boolean
  deleteFile: boolean
  comment: boolean
  moderateComment: boolean
  manageClients: boolean
  inviteUsers: boolean
  manageTeam: boolean
  managePipeline: boolean
  viewActivityLogs: boolean
  accessSuperAdmin: boolean
}

export function getPermissions(role: UserRole | null): Permissions {
  return {
    createAgency:        canCreateAgency(role),
    manageAgencySettings: canManageAgencySettings(role),
    createProject:       canCreateProject(role),
    viewAllProjects:     canViewAllProjects(role),
    editProject:         canEditProject(role),
    deleteProject:       canDeleteProject(role),
    assignCreative:      canAssignCreative(role),
    advancePhase:        canAdvancePhase(role),
    sendToReview:        canSendToReview(role),
    approveDeliverable:  canApproveDeliverable(role),
    uploadFile:          canUploadFile(role),
    deleteFile:          canDeleteFile(role),
    comment:             canComment(role),
    moderateComment:     canModerateComment(role),
    manageClients:       canManageClients(role),
    inviteUsers:         canInviteUsers(role),
    manageTeam:          canManageTeam(role),
    managePipeline:      canManagePipeline(role),
    viewActivityLogs:    canViewActivityLogs(role),
    accessSuperAdmin:    canAccessSuperAdmin(role),
  }
}
