// ─── Inspection Report Page (Print-Friendly) ──────────────
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn, formatDate, severityColor } from '../lib/utils'
import type {
  InspectionRun, InspectionAnswer, InspectionTemplate,
  TemplateSection, TemplateQuestion, Equipment,
} from '../lib/types'

export function InspectionReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [inspection, setInspection] = useState<InspectionRun | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [answers, setAnswers] = useState<InspectionAnswer[]>([])
  const [template, setTemplate] = useState<(InspectionTemplate & { sections: (TemplateSection & { questions: TemplateQuestion[] })[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadReport()
  }, [id])

  async function loadReport() {
    setLoading(true)
    setError(null)
    try {
      const { data: run, error: runErr } = await supabase
        .from('inspection_runs').select('*').eq('id', id).single()
      if (runErr) throw runErr
      setInspection(run)

      // Load equipment for header
      const { data: eq } = await supabase
        .from('equipment').select('*').eq('id', run.equipment_id).single()
      setEquipment(eq)

      // Load answers
      const { data: ans } = await supabase
        .from('inspection_answers').select('*').eq('inspection_id', id)
      setAnswers(ans || [])

      // Load template + sections + questions
      const { data: tpl } = await supabase
        .from('inspection_templates').select('*').eq('id', run.template_id).single()
      if (tpl) {
        const { data: sections } = await supabase
          .from('template_sections').select('*').eq('template_id', tpl.id).order('sort_order')
        const fullSections: (TemplateSection & { questions: TemplateQuestion[] })[] = []
        for (const sec of sections || []) {
          const { data: questions } = await supabase
            .from('template_questions').select('*').eq('section_id', sec.id).order('sort_order')
          fullSections.push({ ...sec, questions: questions || [] })
        }
        setTemplate({ ...tpl, sections: fullSections })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  function answerForQuestion(questionId: string): InspectionAnswer | undefined {
    return answers.find((a) => a.question_id === questionId)
  }

  function renderAnswerValue(q: TemplateQuestion, a?: InspectionAnswer): string {
    if (!a || a.is_na) return 'N/A'
    switch (q.answer_type) {
      case 'boolean':
        return a.boolean_value === true ? 'Yes' : a.boolean_value === false ? 'No' : '—'
      case 'numeric':
        return a.numeric_value != null ? `${a.numeric_value}${a.numeric_unit ? ` ${a.numeric_unit}` : ''}` : '—'
      case 'text':
        return a.text_value || '—'
      case 'multi_select':
        return a.multi_values?.join(', ') || '—'
      case 'photo_required':
        return a.boolean_value === true ? 'Yes' : a.boolean_value === false ? 'No' : '—'
      default:
        return '—'
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !inspection) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 text-sm">
          {error || 'Report not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(`/inspections/${id}`)}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inspection
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-6 md:p-10 print:p-0 print:max-w-none">
        {/* Report Header */}
        <div className="border-b border-zinc-800 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-zinc-100 mb-4">Inspection Report</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Fleet #</p>
              <p className="text-zinc-100 font-medium">{equipment?.fleet_number || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">VIN</p>
              <p className="text-zinc-100 font-mono text-xs">{equipment?.vin || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Equipment</p>
              <p className="text-zinc-100">{equipment?.make} {equipment?.model || ''}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Hours</p>
              <p className="text-zinc-100">{equipment?.hours?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Inspector</p>
              <p className="text-zinc-100">{inspection.inspector_id?.slice(0, 12) || '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Date</p>
              <p className="text-zinc-100">{formatDate(inspection.started_at)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Completed</p>
              <p className="text-zinc-100">{inspection.completed_at ? formatDate(inspection.completed_at) : '—'}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Template</p>
              <p className="text-zinc-100">{template?.name || '—'}</p>
            </div>
          </div>
        </div>

        {/* Sections & Answers Table */}
        {template?.sections && template.sections.length > 0 ? (
          <div className="space-y-8">
            {template.sections.map((section) => (
              <div key={section.id}>
                <h2 className="text-lg font-semibold text-zinc-100 mb-3 pb-2 border-b border-zinc-800">
                  {section.name}
                  {section.description && (
                    <span className="text-sm font-normal text-zinc-500 ml-2">{section.description}</span>
                  )}
                </h2>
                {section.questions.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">No questions</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                        <th className="text-left py-2 pr-4 font-medium">Question</th>
                        <th className="text-left py-2 px-4 font-medium">Answer</th>
                        <th className="text-left py-2 pl-4 font-medium w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.questions.map((q) => {
                        const a = answerForQuestion(q.id)
                        const isFlagged = a?.flagged
                        return (
                          <tr
                            key={q.id}
                            className={cn(
                              'border-b border-zinc-800/50',
                              isFlagged && 'bg-red-900/15'
                            )}
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-start gap-1.5">
                                <span className="text-zinc-200">{q.question_text}</span>
                                {q.required && <span className="text-red-400 text-xs">*</span>}
                              </div>
                              <span className="text-[10px] text-zinc-600 uppercase">{q.answer_type.replace('_', ' ')}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={cn(
                                'px-2 py-0.5 rounded text-sm',
                                a?.boolean_value === true ? 'text-green-400' :
                                a?.boolean_value === false ? 'text-red-400' :
                                a?.text_value ? 'text-zinc-100' : 'text-zinc-600'
                              )}>
                                {renderAnswerValue(q, a)}
                              </span>
                            </td>
                            <td className="py-3 pl-4">
                              {isFlagged ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                                  <span className={cn('text-xs font-medium border px-1.5 py-0.5 rounded', severityColor(a?.severity || 'medium'))}>
                                    {a?.severity || 'flagged'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-600 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-8">No template data available for this report</p>
        )}

        {/* Signature Section */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Inspector Signature</p>
              <div className="h-16 border-b border-zinc-700 flex items-end pb-2">
                {inspection.signature ? (
                  <img src={inspection.signature} alt="Signature" className="max-h-14" />
                ) : (
                  <p className="text-zinc-600 text-sm italic">Signed electronically</p>
                )}
              </div>
              <p className="text-xs text-zinc-600 mt-1">{formatDate(inspection.completed_at || inspection.started_at)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Supervisor Signature</p>
              <div className="h-16 border-b border-zinc-700 flex items-end pb-2">
                <p className="text-zinc-600 text-sm italic">_________________________</p>
              </div>
              <p className="text-xs text-zinc-600 mt-1">Date: ______________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>HE Inspection System — Generated {formatDate(new Date().toISOString())}</p>
          <p className="mt-0.5">Inspection ID: {inspection.id}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .bg-zinc-950 { background: white !important; }
          .bg-zinc-900 { background: #f5f5f5 !important; }
          .text-zinc-100 { color: #111 !important; }
          .text-zinc-200 { color: #222 !important; }
          .text-zinc-300 { color: #333 !important; }
          .text-zinc-400 { color: #555 !important; }
          .text-zinc-500 { color: #777 !important; }
          .text-zinc-600 { color: #999 !important; }
          .border-zinc-800 { border-color: #ddd !important; }
          .border-zinc-700 { border-color: #ccc !important; }
          .bg-red-900\/15 { background: #fef2f2 !important; }
          .bg-red-900\/20 { background: #fef2f2 !important; }
          .text-green-400 { color: #16a34a !important; }
          .text-red-400 { color: #dc2626 !important; }
          .bg-red-900\/30 { background: #fef2f2 !important; }
          .bg-green-900\/30 { background: #f0fdf4 !important; }
          .bg-zinc-800 { background: #eee !important; }
          a, button { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .rounded-lg, .rounded-xl { border-radius: 4px !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  )
}