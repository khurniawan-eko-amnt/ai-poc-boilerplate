// ─── Inspection Store (Revised) ─────────────────────────────
import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { useDebugStore } from './debugStore'
import { useAuthStore } from './authStore'
import { generateClientId } from '../lib/utils'
import type {
  Equipment, InspectionRun, InspectionAnswer, InspectionDefect,
  InspectionTemplate, TemplateSection, TemplateQuestion, InspectionMedia,
} from '../lib/types'

/** Safely extract a string message from any error-like value */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>
    return e.message ? String(e.message)
      : e.code ? `Code ${e.code}: ${String(e.details || e.hint || '')}`
      : JSON.stringify(err)
  }
  return String(err)
}

interface InspectionState {
  // Equipment
  equipmentList: Equipment[]
  equipmentLoading: boolean
  loadEquipment: () => Promise<void>

  // Templates
  activeTemplate: (InspectionTemplate & { sections: (TemplateSection & { questions: TemplateQuestion[] })[] }) | null
  loadTemplate: (templateId?: string) => Promise<void>

  // Inspection runs
  currentInspection: InspectionRun | null
  inspectionAnswers: Map<string, InspectionAnswer>
  inspectionMedia: InspectionMedia[]
  startInspection: (equipmentId: string, templateId: string) => Promise<string | null>
  saveAnswer: (questionId: string, partial: Partial<InspectionAnswer>) => Promise<string | null>
  completeInspection: () => Promise<void>
  loadInspection: (inspectionId: string) => Promise<void>

  // Inspections list
  inspections: InspectionRun[]
  loadInspections: () => Promise<void>

  // Defects
  defects: InspectionDefect[]
  loadDefects: () => Promise<void>
  createDefect: (defect: Partial<InspectionDefect>) => Promise<void>
  updateDefect: (id: string, updates: Partial<InspectionDefect>) => Promise<void>

  // Media
  uploadMedia: (file: File, inspectionId: string, answerId: string | null) => Promise<InspectionMedia | null>

  // Reset
  resetCurrentInspection: () => void
}

export const useInspectionStore = create<InspectionState>((set, get) => ({
  equipmentList: [],
  equipmentLoading: false,
  activeTemplate: null,
  currentInspection: null,
  inspectionAnswers: new Map(),
  inspectionMedia: [],
  inspections: [],
  defects: [],

  loadEquipment: async () => {
    const debug = useDebugStore.getState()
    set({ equipmentLoading: true })
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('fleet_number', { ascending: true })
      if (error) throw error
      set({ equipmentList: data || [] })
      debug.add('info', `Loaded ${data?.length || 0} equipment`)
    } catch (err) { debug.add('error', 'Failed to load equipment', err) }
    finally { set({ equipmentLoading: false }) }
  },

  loadTemplate: async (templateId) => {
    const debug = useDebugStore.getState()
    try {
      const tid = templateId || (await supabase
        .from('inspection_templates')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()).data?.id
      if (!tid) { debug.add('warn', 'No active template found'); return }

      const { data: tpl } = await supabase.from('inspection_templates').select('*').eq('id', tid).single()
      const { data: sections } = await supabase
        .from('template_sections').select('*').eq('template_id', tid).order('sort_order')

      const fullSections: (TemplateSection & { questions: TemplateQuestion[] })[] = []
      for (const sec of sections || []) {
        const { data: questions } = await supabase
          .from('template_questions').select('*').eq('section_id', sec.id).order('sort_order')
        fullSections.push({ ...sec, questions: questions || [] })
      }
      set({ activeTemplate: { ...tpl, sections: fullSections } })
      debug.add('info', `Loaded template: ${tpl?.name} (${fullSections.length} sections)`)

      // RLS org context RPC is optional and may not exist in this deployment.
      if (tpl?.org_id) {
        debug.add('info', `Template org context loaded: ${tpl.org_id}`)
      }
    } catch (err) { debug.add('error', 'Failed to load template', err) }
  },

  startInspection: async (equipmentId, templateId) => {
    const debug = useDebugStore.getState()
    try {
      // Get the current user's ID from auth store — must always be set
      const user = useAuthStore.getState().user
      const inspectorId = user?.id

      // Try getting auth user ID as fallback if profile user not found
      let resolvedInspectorId = inspectorId
      if (!resolvedInspectorId) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.id) resolvedInspectorId = authUser.id
      }

      if (!resolvedInspectorId) {
        throw new Error('User tidak ditemukan. Silakan login ulang.')
      }

      const clientId = generateClientId()
      const insertPayload: Record<string, any> = {
        equipment_id: equipmentId,
        template_id: templateId,
        inspector_id: resolvedInspectorId,
        status: 'in_progress',
        client_id: clientId,
        started_offline: !navigator.onLine,
      }

      const { data, error } = await supabase.from('inspection_runs').insert(insertPayload).select('*').single()
      if (error) throw error
      set({ currentInspection: data, inspectionAnswers: new Map() })
      debug.add('info', `Started inspection: ${data.id}`)
      return data.id
    } catch (err) {
      const msg = errorMessage(err)
      debug.add('error', `Failed to start inspection: ${msg}`, err)
      throw err // Let caller handle error
    }
  },

  saveAnswer: async (questionId, partial) => {
    const { currentInspection, inspectionAnswers } = get()
    if (!currentInspection) return null
    try {
      const existing = inspectionAnswers.get(questionId)
      const answer = {
        inspection_id: currentInspection.id,
        question_id: questionId,
        answer_type: partial.answer_type || '',
        ...partial,
      }
      if (existing?.id) {
        const { error } = await supabase.from('inspection_answers').update(answer).eq('id', existing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('inspection_answers').insert(answer).select('id').single()
        if (error) throw error
        if (data) answer.id = data.id
      }
      const newMap = new Map(inspectionAnswers)
      newMap.set(questionId, answer as InspectionAnswer)
      set({ inspectionAnswers: newMap })
      return (answer as InspectionAnswer).id || null
    } catch (err) {
      const msg = errorMessage(err)
      useDebugStore.getState().add('error', `Failed to save answer: ${msg}`, err)
      throw err
    }
  },

  completeInspection: async () => {
    const { currentInspection } = get()
    if (!currentInspection) return
    const debug = useDebugStore.getState()
    try {
      const { error } = await supabase.from('inspection_runs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      }).eq('id', currentInspection.id)
      if (error) throw error
      set({ currentInspection: { ...currentInspection, status: 'completed', completed_at: new Date().toISOString() } })
      debug.add('info', 'Inspection completed')
    } catch (err) {
      const msg = errorMessage(err)
      debug.add('error', `Failed to complete inspection: ${msg}`)
      throw err
    }
  },

  loadInspection: async (inspectionId) => {
    const debug = useDebugStore.getState()
    try {
      const { data: run } = await supabase.from('inspection_runs').select('*').eq('id', inspectionId).single()
      const { data: answers } = await supabase.from('inspection_answers').select('*').eq('inspection_id', inspectionId)
      const { data: media } = await supabase.from('inspection_media').select('*').eq('inspection_id', inspectionId)
      if (run) {
        const answerMap = new Map<string, InspectionAnswer>()
        answers?.forEach((a) => answerMap.set(a.question_id, a))
        set({ currentInspection: run, inspectionAnswers: answerMap, inspectionMedia: media || [] })
        // Also load the template
        get().loadTemplate(run.template_id)
      }
      debug.add('info', `Loaded inspection: ${inspectionId}`)
    } catch (err) { debug.add('error', 'Failed to load inspection', err) }
  },

  loadInspections: async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50)
      if (!error) set({ inspections: data || [] })
    } catch { /* ignore */ }
  },

  loadDefects: async () => {
    try {
      const { data, error } = await supabase
        .from('inspection_defects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (!error) set({ defects: data || [] })
    } catch { /* ignore */ }
  },

  createDefect: async (defect) => {
    const debug = useDebugStore.getState()
    try {
      const { error } = await supabase.from('inspection_defects').insert(defect)
      if (error) throw error
      get().loadDefects()
      debug.add('info', 'Defect created')
    } catch (err) { debug.add('error', 'Failed to create defect', err) }
  },

  updateDefect: async (id, updates) => {
    try {
      await supabase.from('inspection_defects').update(updates).eq('id', id)
      get().loadDefects()
    } catch { /* ignore */ }
  },

  uploadMedia: async (file, inspectionId, answerId) => {
    const debug = useDebugStore.getState()
    try {
      const path = `${inspectionId}/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage
        .from('poc-he-inspection').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        })
      if (uploadErr) throw uploadErr

      const { data: media, error } = await supabase.from('inspection_media').insert({
        inspection_id: inspectionId,
        answer_id: answerId || null,
        file_path: path,
        mime_type: file.type,
        file_size_bytes: file.size,
      }).select('*').single()
      if (error) throw error
      debug.add('info', `Media uploaded: ${file.name} (${(file.size / 1024).toFixed(0)}KB)`)
      return media || null // return full media record
    } catch (err) {
      const msg = errorMessage(err)
      debug.add('error', `Media upload failed: ${msg}`)
      throw err
    }
  },

  resetCurrentInspection: () => set({ currentInspection: null, inspectionAnswers: new Map(), activeTemplate: null, inspectionMedia: [] }),
}))