// ─── Supabase API Types ───────────────────────────────────
export interface Profile {
  id: string
  email: string
  role: 'authenticated' | 'anon'
  created_at: string
}

export interface Chat {
  id: string
  user_id: string
  title: string
  model: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Upload {
  id: string
  user_id: string
  bucket: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  extracted_text?: string
  created_at: string
}

export interface DebugEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: unknown
}

export type Theme = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: Theme
  aiModel: string
  aiPrompt: string
  showDebugPanel: boolean
}