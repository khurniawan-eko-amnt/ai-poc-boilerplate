// ─── Inspection Detail Page ────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Flag, CheckCircle, Camera, AlertTriangle } from 'lucide-react'
import { useInspectionStore } from '../stores/inspectionStore'
import { cn, formatDate, severityColor } from '../lib/utils'
import type { TemplateSection, TemplateQuestion, InspectionAnswer } from '../lib/types'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const {
    currentInspection,
    activeTemplate,
    inspectionAnswers,
    inspectionMedia,
    loadInspection,
    completeInspection,
    resetCurrentInspection,
  } = useInspectionStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    loadInspection(id)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load inspection'))
      .finally(() => setLoading(false))

    return () => { resetCurrentInspection() }
  }, [id])

  // Expand all sections by default
  useEffect(() => {
    if (activeTemplate?.sections) {
      setExpandedSections(new Set(activeTemplate.sections.map((s) => s.id)))
    }
  }, [activeTemplate])

  function toggleSection(sectionId: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  async function handleComplete() {
    setCompleting(true)
    try {
      await completeInspection()
      setCompleted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete inspection')
    } finally {
      setCompleting(false)
    }
  }

  function renderAnswerValue(question: TemplateQuestion, answer?: InspectionAnswer): string {
    if (!answer || answer.is_na) return answer?.is_na ? 'N/A' : '—'
    switch (question.answer_type) {
      case 'boolean':
        return answer.boolean_value === true ? 'Yes' : answer.boolean_value === false ? 'No' : '—'
      case 'numeric':
        return answer.numeric_value != null ? `${answer.numeric_value}${answer.numeric_unit ? ` ${answer.numeric_unit}` : ''}` : '—'
      case 'text':
        return answer.text_value || '—'
      case 'multi_select':
        return answer.multi_values?.join(', ') || '—'
      case 'photo_required':
        return answer.boolean_value === true ? 'Yes (Photo)' : answer.boolean_value === false ? 'No' : '—'
      default:
        return '—'
    }
  }

  const questionMediaMap: Record<string, typeof inspectionMedia> = {}
  inspectionMedia.forEach((m) => {
    if (m.answer_id) {
      if (!questionMediaMap[m.answer_id]) questionMediaMap[m.answer_id] = []
      questionMediaMap[m.answer_id].push(m)
    }
  })

  if (loading) return <div className="p-6"><Spinner /></div>

  if (error || !currentInspection) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 text-sm">
          {error || 'Inspection not found'}
          <button onClick={() => navigate('/inspections')} className="ml-2 underline">Back to inspections</button>
        </div>
      </div>
    )
  }

  const inspection = currentInspection
  const template = activeTemplate

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/inspections')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inspections
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/inspections/${id}/report`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            <FileText className="w-4 h-4" />
            View Report
          </button>
          {inspection.status === 'in_progress' && !completed && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {completing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {completing ? 'Completing...' : 'Complete Inspection'}
            </button>
          )}
        </div>
      </div>

      {/* Inspection Info Card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Inspection</p>
          <p className="text-lg font-semibold text-zinc-100">
            {template?.name || 'Inspection'} <span className="text-zinc-500 text-sm font-mono">({inspection.id.slice(0, 8)}...)</span>
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-zinc-500">Status: </span>
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
              inspection.status === 'completed' ? 'text-green-400 bg-green-400/10' : 'text-blue-400 bg-blue-400/10'
            )}>
              {inspection.status.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-zinc-500">Started: </span>
            <span className="text-zinc-300">{formatDate(inspection.started_at)}</span>
          </div>
          {inspection.completed_at && (
            <div>
              <span className="text-zinc-500">Completed: </span>
              <span className="text-zinc-300">{formatDate(inspection.completed_at)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Completed Banner */}
      {completed || inspection.status === 'completed' ? (
        <div className="bg-green-900/20 border border-green-800 text-green-400 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Inspection completed</p>
            <p className="text-sm text-green-400/70">All answers have been recorded</p>
          </div>
        </div>
      ) : null}

      {/* Template Sections & Questions */}
      {template?.sections && template.sections.length > 0 ? (
        <div className="space-y-4">
          {template.sections.map((section) => (
            <div key={section.id} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-semibold text-zinc-100">{section.name}</h3>
                  {section.description && (
                    <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
                  )}
                </div>
                <svg
                  className={cn(
                    'w-4 h-4 text-zinc-500 transition-transform',
                    expandedSections.has(section.id) && 'rotate-180'
                  )}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Questions */}
              {expandedSections.has(section.id) && (
                <div className="border-t border-zinc-800 divide-y divide-zinc-800">
                  {section.questions.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-zinc-500">No questions in this section</p>
                  ) : (
                    section.questions.map((q) => {
                      const answer = inspectionAnswers.get(q.id)
                      const isFlagged = answer?.flagged
                      const mediaForQ = answer ? questionMediaMap[answer.id] : undefined
                      return (
                        <div key={q.id} className={cn('px-5 py-4', isFlagged && 'bg-red-900/10')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-zinc-200">{q.question_text}</p>
                                {q.required && <span className="text-red-400 text-xs">*</span>}
                                <span className="text-[10px] uppercase text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {q.answer_type.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isFlagged && (
                                <div className="flex items-center gap-1.5">
                                  <Flag className="w-3.5 h-3.5 text-red-400" />
                                  {answer?.severity && (
                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', severityColor(answer.severity))}>
                                      {answer.severity}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className={cn(
                              'inline-block px-3 py-1 rounded text-sm font-medium',
                              answer?.boolean_value === true || answer?.boolean_value === false
                                ? (answer.boolean_value ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400')
                                : 'bg-zinc-800 text-zinc-300'
                            )}>
                              {renderAnswerValue(q, answer)}
                            </span>
                          </div>

                          {/* Media Thumbnails */}
                          {mediaForQ && mediaForQ.length > 0 && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              {mediaForQ.map((m) => (
                                <div key={m.id} className="relative group">
                                  <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
                                    <Camera className="w-5 h-5 text-zinc-500" />
                                  </div>
                                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-zinc-900" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No template data available</p>
        </div>
      )}

      {/* Flagged Items Summary */}
      {Array.from(inspectionAnswers.values()).some((a) => a.flagged) && (
        <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-red-400 text-sm">Flagged Items</h3>
          </div>
          <p className="text-xs text-red-400/70">
            {Array.from(inspectionAnswers.values()).filter((a) => a.flagged).length} item(s) flagged during inspection
          </p>
        </div>
      )}
    </div>
  )
}