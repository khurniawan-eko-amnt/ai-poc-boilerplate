// ─── Defects List Page ────────────────────────────────────
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn, formatDate, severityColor, statusColor } from '../lib/utils'
import type { InspectionDefect, DefectStatus, Equipment } from '../lib/types'

const STATUS_OPTIONS: { label: string; value: DefectStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function DefectsPage() {
  const [defects, setDefects] = useState<InspectionDefect[]>([])
  const [equipmentMap, setEquipmentMap] = useState<Record<string, Equipment>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DefectStatus | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('inspection_defects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (err) throw err

      const eqIds = [...new Set((data || []).map((d) => d.equipment_id))]
      const { data: eqList } = await supabase
        .from('equipment')
        .select('*')
        .in('id', eqIds.length > 0 ? eqIds : ['none'])
      const eqMap: Record<string, Equipment> = {}
      eqList?.forEach((eq) => { eqMap[eq.id] = eq })

      setDefects(data || [])
      setEquipmentMap(eqMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load defects')
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(defectId: string) {
    setResolving(defectId)
    try {
      await supabase
        .from('inspection_defects')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', defectId)
      setDefects((prev) =>
        prev.map((d) =>
          d.id === defectId
            ? { ...d, status: 'resolved' as DefectStatus, resolved_at: new Date().toISOString() }
            : d
        )
      )
    } catch {
      // silent
    } finally {
      setResolving(null)
    }
  }

  const sorted = [...defects]
    .filter((d) => !statusFilter || d.status === statusFilter)
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99))

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
        <h1 className="text-2xl font-bold">Defects</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {defects.filter((d) => d.status === 'open' || d.status === 'in_progress').length} open defects
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value as DefectStatus | '')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              statusFilter === opt.value
                ? 'bg-orange-600 border-orange-500 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
          <button onClick={loadAll} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!error && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <AlertTriangle className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">
            {statusFilter ? `No ${statusFilter.replace('_', ' ')} defects` : 'No defects found'}
          </p>
          <p className="text-sm mt-1">All clear — no issues to report</p>
        </div>
      )}

      {/* Defects List */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((defect) => {
            const eq = equipmentMap[defect.equipment_id]
            const isExpanded = expandedId === defect.id
            return (
              <div
                key={defect.id}
                className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
              >
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : defect.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0',
                      defect.severity === 'critical' && 'bg-red-500',
                      defect.severity === 'high' && 'bg-orange-500',
                      defect.severity === 'medium' && 'bg-yellow-500',
                      defect.severity === 'low' && 'bg-blue-500',
                    )} />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100 truncate">{defect.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {eq ? `${eq.fleet_number || eq.vin.slice(0, 8)}` : defect.equipment_id.slice(0, 8)}
                        {' · '}
                        {formatDate(defect.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', severityColor(defect.severity))}>
                      {defect.severity}
                    </span>
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(defect.status))}>
                      {defect.status.replace('_', ' ')}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                    {defect.description && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-sm text-zinc-300">{defect.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Severity</p>
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border', severityColor(defect.severity))}>
                          <span className={cn('w-1.5 h-1.5 rounded-full',
                            defect.severity === 'critical' && 'bg-red-500',
                            defect.severity === 'high' && 'bg-orange-500',
                            defect.severity === 'medium' && 'bg-yellow-500',
                            defect.severity === 'low' && 'bg-blue-500',
                          )} />
                          {defect.severity}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Status</p>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColor(defect.status))}>
                          {defect.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Tag Out</p>
                        <p className="text-zinc-300">{defect.tag_out ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Created</p>
                        <p className="text-zinc-300">{formatDate(defect.created_at)}</p>
                      </div>
                    </div>

                    {defect.resolved_at && (
                      <div className="bg-green-900/10 border border-green-800/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="text-sm font-medium text-green-400">Resolved</p>
                            <p className="text-xs text-green-400/70">{formatDate(defect.resolved_at)}</p>
                            {defect.resolution_notes && (
                              <p className="text-xs text-green-400/70 mt-1">{defect.resolution_notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      {defect.status !== 'resolved' && defect.status !== 'closed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResolve(defect.id)
                          }}
                          disabled={resolving === defect.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          {resolving === defect.id ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}