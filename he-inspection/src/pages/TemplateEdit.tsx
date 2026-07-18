// ─── Template Edit Page ───────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn } from '../lib/utils'
import type { InspectionTemplate, TemplateSection, TemplateQuestion } from '../lib/types'

const ANSWER_TYPE_COLORS: Record<string, string> = {
  boolean: 'text-blue-400 bg-blue-400/10',
  numeric: 'text-purple-400 bg-purple-400/10',
  text: 'text-green-400 bg-green-400/10',
  multi_select: 'text-yellow-400 bg-yellow-400/10',
  photo_required: 'text-pink-400 bg-pink-400/10',
}

export function TemplateEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [template, setTemplate] = useState<InspectionTemplate | null>(null)
  const [sections, setSections] = useState<(TemplateSection & { questions: TemplateQuestion[] })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    loadTemplate()
  }, [id])

  async function loadTemplate() {
    setLoading(true)
    setError(null)
    try {
      const { data: tpl, error: tplErr } = await supabase
        .from('inspection_templates').select('*').eq('id', id).single()
      if (tplErr) throw tplErr
      setTemplate(tpl)

      const { data: secs } = await supabase
        .from('template_sections').select('*').eq('template_id', id).order('sort_order')

      const fullSections: (TemplateSection & { questions: TemplateQuestion[] })[] = []
      for (const sec of secs || []) {
        const { data: questions } = await supabase
          .from('template_questions').select('*').eq('section_id', sec.id).order('sort_order')
        fullSections.push({ ...sec, questions: questions || [] })
      }
      setSections(fullSections)
      // Expand all by default
      setExpandedSections(new Set(fullSections.map((s) => s.id)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 text-sm">
          {error || 'Template not found'}
          <button onClick={() => navigate('/templates')} className="ml-2 underline">Back to templates</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/templates')}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{template.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            v{template.version} · {template.equipment_type} · {sections.length} sections ·{' '}
            {sections.reduce((sum, s) => sum + s.questions.length, 0)} questions
          </p>
        </div>
        {template.is_active && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-green-400 bg-green-400/10 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Active
          </span>
        )}
      </div>

      {/* Template info card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Equipment Type</p>
            <p className="text-zinc-100 capitalize mt-0.5">{template.equipment_type}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Version</p>
            <p className="text-zinc-100 mt-0.5">{template.version}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Status</p>
            <p className="text-zinc-100 mt-0.5 capitalize">{template.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        </div>
        {template.description && (
          <p className="text-sm text-zinc-400 mt-3">{template.description}</p>
        )}
      </div>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No sections yet</p>
          <p className="text-sm mt-1">This template has no sections or questions defined</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">{section.name}</h3>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                      {section.questions.length} questions
                    </span>
                  </div>
                  {section.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
                  )}
                </div>
                {expandedSections.has(section.id) ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
              </button>

              {/* Questions List */}
              {expandedSections.has(section.id) && (
                <div className="border-t border-zinc-800">
                  {section.questions.length === 0 ? (
                    <div className="px-5 py-4 text-center">
                      <p className="text-sm text-zinc-500">No questions in this section</p>
                      <button className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors">
                        <Plus className="w-3 h-3" />
                        Add Question
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {section.questions.map((q, idx) => (
                        <div key={q.id} className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-zinc-800/20 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-600 font-mono w-6 shrink-0">#{idx + 1}</span>
                              <p className="text-sm text-zinc-200">{q.question_text}</p>
                              {q.required && <span className="text-red-400 text-xs">*</span>}
                            </div>
                            {q.hint_text && (
                              <p className="text-xs text-zinc-500 ml-8 mt-0.5">{q.hint_text}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase',
                              ANSWER_TYPE_COLORS[q.answer_type] || 'text-zinc-500 bg-zinc-800'
                            )}>
                              {q.answer_type.replace('_', ' ')}
                            </span>
                            {q.required && (
                              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Required</span>
                            )}
                            {q.has_media && (
                              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">📷</span>
                            )}
                          </div>
                        </div>
                      ))}
                      {/* Add question button at bottom of section */}
                      <div className="px-5 py-2">
                        <button className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Plus className="w-3 h-3" />
                          Add Question
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* POC Note */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500">
          <strong className="text-zinc-400">POC Note:</strong> Template editing is read-only in this prototype.
          Full question/section editing (add, reorder, delete) will be available in a future iteration.
          Template structure can be managed directly in Supabase Studio or via the database.
        </p>
      </div>
    </div>
  )
}