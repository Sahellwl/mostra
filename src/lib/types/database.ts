// ============================================================
// MOSTRA — Types TypeScript (basés sur le schema Supabase)
// Ref: supabase/migrations/001_initial_schema.sql
//      supabase/migrations/011_subphases_and_blocks.sql
// ============================================================
// Pour regénérer automatiquement :
//   npx supabase gen types typescript --local > src/lib/types/database.ts
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ----------------------------------------------------------
// Enums (valeurs CHECK dans le schema)
// ----------------------------------------------------------

export type UserRole = 'super_admin' | 'agency_admin' | 'creative' | 'client'

export type ContactMethod = 'email' | 'whatsapp' | 'phone'

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'on_hold'

export type PhaseStatus = 'pending' | 'in_progress' | 'in_review' | 'approved' | 'completed'

export type ActivityAction =
  | 'file_uploaded'
  | 'file_deleted'
  | 'phase_started'
  | 'phase_completed'
  | 'phase_review'
  | 'phase_approved'
  | 'comment_added'
  | 'status_changed'
  | 'member_invited'
  | 'member_joined'
  | 'project_created'
  | 'project_archived'

export type BlockType =
  | 'form_question'
  | 'script_section'
  | 'moodboard_image'
  | 'storyboard_shot'
  | 'audio_track'
  | 'design_file'

// ----------------------------------------------------------
// Row types (lignes telles que retournées par Supabase)
// ----------------------------------------------------------

export interface Agency {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  phone: string | null
  contact_method: ContactMethod
  created_at: string
  updated_at: string
}

export interface AgencyMember {
  id: string
  agency_id: string
  user_id: string
  role: UserRole
  invited_at: string
  accepted_at: string | null
  is_active: boolean
}

export interface PhaseTemplate {
  id: string
  agency_id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
  is_default: boolean
  /** Définition des sous-phases par défaut. Format: SubPhaseDefinition[] */
  sub_phases: SubPhaseDefinition[]
  created_at: string
}

export interface Project {
  id: string
  agency_id: string
  name: string
  description: string | null
  client_id: string | null
  project_manager_id: string | null
  status: ProjectStatus
  progress: number
  share_token: string | null
  created_at: string
  updated_at: string
}

export interface ProjectPhase {
  id: string
  project_id: string
  phase_template_id: string | null
  name: string
  slug: string
  sort_order: number
  status: PhaseStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface SubPhase {
  id: string
  phase_id: string
  name: string
  slug: string
  sort_order: number
  status: PhaseStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface PhaseBlock {
  id: string
  sub_phase_id: string | null
  phase_id: string | null
  type: BlockType
  content: Json
  sort_order: number
  is_approved: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FormTemplate {
  id: string
  agency_id: string
  name: string
  description: string | null
  questions: FormQuestion[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface PhaseFile {
  id: string
  phase_id: string
  uploaded_by: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  version: number
  is_current: boolean
  created_at: string
}

export interface Comment {
  id: string
  project_id: string
  phase_id: string | null
  sub_phase_id: string | null
  block_id: string | null
  user_id: string
  content: string
  is_resolved: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  project_id: string
  user_id: string | null
  action: ActivityAction
  details: Json | null
  created_at: string
}

export interface Invitation {
  id: string
  agency_id: string
  email: string
  role: Exclude<UserRole, 'super_admin'>
  invited_by: string
  token: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

// ----------------------------------------------------------
// Block content types (contenu JSON typé par type de bloc)
// ----------------------------------------------------------

export type QuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'number' | 'date'

export interface FormQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
}

export interface FormQuestionContent {
  label: string
  answer: string | null
  required: boolean
  type: QuestionType
  options?: string[]
  placeholder?: string
  helpText?: string
}

export interface ScriptSectionContent {
  title: string
  /** Couleur hex de la section (ex: '#00D76B') */
  color: string
  content: string
  description?: string
}

export interface MoodboardImageContent {
  title: string
  image_url: string
  description?: string
  is_selected: boolean
}

export interface StoryboardShotContent {
  shot_number: number
  image_url: string
  description?: string
}

export interface AudioTrackContent {
  title: string
  audio_url: string
  description?: string
  kind: 'vo' | 'music'
  is_selected: boolean
}

export interface DesignFileContent {
  file_url: string
  file_name: string
  description?: string
}

/** Map du type de bloc vers son type de contenu */
export type BlockContentByType = {
  form_question:   FormQuestionContent
  script_section:  ScriptSectionContent
  moodboard_image: MoodboardImageContent
  storyboard_shot: StoryboardShotContent
  audio_track:     AudioTrackContent
  design_file:     DesignFileContent
}

/** PhaseBlock avec le contenu typé selon le type de bloc */
export type TypedPhaseBlock<T extends BlockType> = Omit<PhaseBlock, 'content'> & {
  type: T
  content: BlockContentByType[T]
}

/** Définition d'une sous-phase dans un PhaseTemplate */
export interface SubPhaseDefinition {
  name: string
  slug: string
  sort_order: number
}

// ----------------------------------------------------------
// Insert types (champs requis lors d'un INSERT)
// ----------------------------------------------------------

export type AgencyInsert = Omit<Agency, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  avatar_url?: string | null
  phone?: string | null
  contact_method?: ContactMethod
}

export type AgencyMemberInsert = Omit<AgencyMember, 'id' | 'invited_at'> & {
  id?: string
  invited_at?: string
  accepted_at?: string | null
}

export type PhaseTemplateInsert = Omit<PhaseTemplate, 'id' | 'created_at'> & {
  id?: string
  sub_phases?: SubPhaseDefinition[]
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'share_token'> & {
  id?: string
  share_token?: string | null
}

export type ProjectPhaseInsert = Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  started_at?: string | null
  completed_at?: string | null
}

export type SubPhaseInsert = Omit<SubPhase, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  started_at?: string | null
  completed_at?: string | null
}

export type PhaseBlockInsert = Omit<PhaseBlock, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  is_approved?: boolean
}

export type FormTemplateInsert = Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  is_default?: boolean
}

export type PhaseFileInsert = Omit<PhaseFile, 'id' | 'created_at'> & {
  id?: string
}

export type CommentInsert = Omit<Comment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  is_resolved?: boolean
  parent_id?: string | null
  sub_phase_id?: string | null
  block_id?: string | null
}

export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'> & {
  id?: string
  details?: Json | null
}

export type InvitationInsert = Omit<Invitation, 'id' | 'token' | 'accepted_at' | 'created_at'> & {
  id?: string
  token?: string | null
  accepted_at?: string | null
}

// ----------------------------------------------------------
// Update types (tous les champs optionnels sauf id)
// ----------------------------------------------------------

export type AgencyUpdate      = Partial<Omit<Agency, 'id' | 'created_at'>>
export type ProfileUpdate     = Partial<Omit<Profile, 'id' | 'created_at'>>
export type ProjectUpdate     = Partial<Omit<Project, 'id' | 'created_at'>>
export type ProjectPhaseUpdate = Partial<Omit<ProjectPhase, 'id' | 'created_at'>>
export type SubPhaseUpdate    = Partial<Omit<SubPhase, 'id' | 'created_at'>>
export type PhaseBlockUpdate  = Partial<Omit<PhaseBlock, 'id' | 'created_at'>>
export type FormTemplateUpdate = Partial<Omit<FormTemplate, 'id' | 'created_at'>>
export type PhaseFileUpdate   = Partial<Omit<PhaseFile, 'id' | 'created_at'>>
export type CommentUpdate     = Partial<Omit<Comment, 'id' | 'created_at'>>
export type AgencyMemberUpdate = Partial<Omit<AgencyMember, 'id' | 'agency_id' | 'user_id'>>

// ----------------------------------------------------------
// Composite types (avec JOINs fréquents)
// ----------------------------------------------------------

export interface ProjectWithPhases extends Project {
  phases: ProjectPhase[]
}

export interface ProjectWithDetails extends Project {
  phases: PhaseWithSubPhases[]
  client: Profile | null
  project_manager: Profile | null
}

/** Phase avec ses sous-phases (nouveau modèle Sprint 9) */
export interface PhaseWithSubPhases extends ProjectPhase {
  sub_phases: SubPhaseWithBlocks[]
  /** Fichiers directs sur la phase (Animation & Rendu sans sous-phases) */
  files: PhaseFile[]
}

/** Sous-phase avec ses blocs */
export interface SubPhaseWithBlocks extends SubPhase {
  blocks: PhaseBlock[]
}

/** Sous-phase avec ses blocs et commentaires */
export interface SubPhaseWithBlocksAndComments extends SubPhase {
  blocks: PhaseBlockWithComments[]
}

/** Bloc avec ses commentaires */
export interface PhaseBlockWithComments extends PhaseBlock {
  comments: CommentWithAuthor[]
}

/** @deprecated Préférer PhaseWithSubPhases */
export interface PhaseWithFiles extends ProjectPhase {
  files: PhaseFile[]
}

/** @deprecated Préférer SubPhaseWithBlocksAndComments */
export interface PhaseWithFilesAndComments extends ProjectPhase {
  files: PhaseFile[]
  comments: CommentWithAuthor[]
}

export interface CommentWithAuthor extends Comment {
  author: Profile
  replies?: CommentWithAuthor[]
}

export interface AgencyMemberWithProfile extends AgencyMember {
  profile: Profile
}

export interface ActivityLogWithUser extends ActivityLog {
  user: Profile | null
}

export interface ProjectSummary {
  id: string
  name: string
  status: ProjectStatus
  progress: number
  current_phase: ProjectPhase | null
  client: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  updated_at: string
}

// ----------------------------------------------------------
// Database type (structure Supabase)
// ----------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row:    Agency
        Insert: AgencyInsert
        Update: AgencyUpdate
      }
      profiles: {
        Row:    Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      agency_members: {
        Row:    AgencyMember
        Insert: AgencyMemberInsert
        Update: AgencyMemberUpdate
      }
      phase_templates: {
        Row:    PhaseTemplate
        Insert: PhaseTemplateInsert
        Update: Partial<Omit<PhaseTemplate, 'id' | 'created_at'>>
      }
      projects: {
        Row:    Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      project_phases: {
        Row:    ProjectPhase
        Insert: ProjectPhaseInsert
        Update: ProjectPhaseUpdate
      }
      sub_phases: {
        Row:    SubPhase
        Insert: SubPhaseInsert
        Update: SubPhaseUpdate
      }
      phase_blocks: {
        Row:    PhaseBlock
        Insert: PhaseBlockInsert
        Update: PhaseBlockUpdate
      }
      form_templates: {
        Row:    FormTemplate
        Insert: FormTemplateInsert
        Update: FormTemplateUpdate
      }
      phase_files: {
        Row:    PhaseFile
        Insert: PhaseFileInsert
        Update: PhaseFileUpdate
      }
      comments: {
        Row:    Comment
        Insert: CommentInsert
        Update: CommentUpdate
      }
      activity_logs: {
        Row:    ActivityLog
        Insert: ActivityLogInsert
        Update: never
      }
      invitations: {
        Row:    Invitation
        Insert: InvitationInsert
        Update: Partial<Omit<Invitation, 'id' | 'created_at'>>
      }
    }
    Functions: {
      get_user_agencies: {
        Args:    Record<string, never>
        Returns: string[]
      }
      get_user_role: {
        Args:    { p_agency_id: string }
        Returns: UserRole | null
      }
      is_agency_admin: {
        Args:    { p_agency_id: string }
        Returns: boolean
      }
      is_agency_member: {
        Args:    { p_agency_id: string }
        Returns: boolean
      }
    }
  }
}
