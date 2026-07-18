// ─── Templates List Page ──────────────────────────────────
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Edit } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn } from '../lib/utils'
import type { InspectionTemplate, TemplateSection, TemplateQuestion } from '../lib/types'

export function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<(InspectionTemplate & { questionCount: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('inspection_templates')
        .select('*')
        .order('name', { ascending: true })
      if (err) throw err

      // For each template, count questions across all sections
      const withCounts = await Promise.all(
        (data || []).map(async (tpl) => {
          const { data: sections } = await supabase
            .from('template_sections')
            .select('id')
            .eq('template_id', tpl.id)

          let totalQuestions = 0
          if (sections && sections.length > 0) {
            const sectionIds = sections.map((s) => s.id)
            const { count } = await supabase
              .from('template_questions')
              .select('*', { count: 'exact', head: true })
              .in('section_id', sectionIds)
            totalQuestions = count || 0
          }
          return { ...tpl, questionCount: totalQuestions } as InspectionTemplate & { questionCount: number }
        })
      )

      setTemplates(withCounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Inspection Templates</h1>
        <p className="text-sm text-zinc-500 mt-1">{templates.length} templates</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
          <button onClick={loadTemplates} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!error && templates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <FileText className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm mt-1">Create inspection templates to start performing inspections</p>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:bg-zinc-800/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-100 truncate">{tpl.name}</h3>
                  {tpl.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{tpl.description}</p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/templates/${tpl.id}/edit`)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-auto">
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                  v{tpl.version}
                </span>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded capitalize">
                  {tpl.equipment_type}
                </span>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                  {tpl.questionCount} questions
                </span>
                {tpl.is_active && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-green-400 bg-green-400/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Active
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}