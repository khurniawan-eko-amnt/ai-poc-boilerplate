// ─── Inspection App Types ────────────────────────────────

export type UserRole = 'inspector' | 'supervisor' | 'manager' | 'admin'
export type EquipmentStatus = 'active' | 'down' | 'maintenance' | 'decommissioned'
export type AnswerType = 'boolean' | 'numeric' | 'text' | 'multi_select' | 'photo_required'
export type InspectionStatus = 'in_progress' | 'completed' | 'synced' | 'archived'
export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical'
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Organization {
  id: string
  name: string
  slug: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  org_id: string
  name: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  org_id: string
  site_id: string | null
  email: string
  name: string
  role: UserRole
  device_id: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  org_id: string
  site_id: string
  equipment_type: string
  vin: string
  fleet_number: string | null
  model: string | null
  make: string
  year: number | null
  hours: number
  status: EquipmentStatus
  qr_code: string | null
  photo_url: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InspectionTemplate {
  id: string
  org_id: string
  name: string
  description: string | null
  equipment_type: string
  version: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TemplateSection {
  id: string
  template_id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface TemplateQuestion {
  id: string
  section_id: string
  question_text: string
  answer_type: AnswerType
  options: string[] | null
  required: boolean
  has_media: boolean
  hint_text: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface InspectionRun {
  id: string
  equipment_id: string
  template_id: string
  inspector_id: string
  status: InspectionStatus
  started_at: string
  completed_at: string | null
  odometer_hours: number | null
  notes: string | null
  signature: string | null
  client_id: string | null
  started_offline: boolean
  synced_at: string | null
  created_at: string
  updated_at: string
}

export interface InspectionAnswer {
  id: string
  inspection_id: string
  question_id: string
  answer_type: AnswerType
  boolean_value: boolean | null
  numeric_value: number | null
  numeric_unit: string | null
  text_value: string | null
  multi_values: string[] | null
  flagged: boolean
  severity: DefectSeverity | null
  voice_note: string | null
  is_na: boolean
  answered_at: string
  updated_at: string
}

export interface InspectionMedia {
  id: string
  inspection_id: string
  answer_id: string | null
  file_path: string
  mime_type: string
  file_size_bytes: number
  gps_lat: number | null
  gps_lng: number | null
  captured_at: string
  description: string | null
  is_synced: boolean
  created_at: string
}

export interface InspectionDefect {
  id: string
  inspection_id: string
  answer_id: string | null
  equipment_id: string
  title: string
  description: string | null
  severity: DefectSeverity
  status: DefectStatus
  assigned_to: string | null
  tag_out: boolean
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}