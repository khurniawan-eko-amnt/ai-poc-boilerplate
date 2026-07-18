// ─── Inspections List Page ────────────────────────────────
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardCheck, Plus } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn, formatDate, statusColor } from '../lib/utils'
import type { InspectionRun, Equipment } from '../lib/types'

export function InspectionsListPage() {
  const navigate = useNavigate()
  const [inspections, setInspections] = useState<InspectionRun[]>([])
  const [equipmentMap, setEquipmentMap] = useState<Record<string, Equipment>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      // Load inspections
      const { data: runs, error: runErr } = await supabase
        .from('inspection_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50)
      if (runErr) throw runErr

      // Load matching equipment (REST join not available, do separate query)
      const eqIds = [...new Set((runs || []).map((r) => r.equipment_id))]
      const { data: eqList } = await supabase
        .from('equipment')
        .select('*')
        .in('id', eqIds.length > 0 ? eqIds : ['none'])

      const eqMap: Record<string, Equipment> = {}
      eqList?.forEach((eq) => { eqMap[eq.id] = eq })
      setEquipmentMap(eqMap)
      setInspections(runs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inspections')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inspections</h1>
          <p className="text-sm text-zinc-500 mt-1">{inspections.length} total inspections</p>
        </div>
        <button
          onClick={() => navigate('/equipment')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Inspection
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
          <button onClick={loadAll} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!error && inspections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <ClipboardCheck className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No inspections yet</p>
          <p className="text-sm mt-1">Select equipment and start a new inspection</p>
          <button
            onClick={() => navigate('/equipment')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Select Equipment
          </button>
        </div>
      )}

      {/* Inspections Table */}
      {inspections.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Equipment</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Inspector</th>
                  <th className="text-left px-4 py-3 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((run) => {
                  const eq = equipmentMap[run.equipment_id]
                  return (
                    <tr
                      key={run.id}
                      onClick={() => navigate(`/inspections/${run.id}`)}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-zinc-100 whitespace-nowrap">
                        {formatDate(run.started_at)}
                      </td>
                      <td className="px-4 py-3">
                        {eq ? (
                          <span className="text-zinc-100">
                            {eq.fleet_number || eq.vin?.slice(0, 8)}
                            <span className="text-zinc-500 ml-1">({eq.make})</span>
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-xs">
                            {run.equipment_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(run.status))}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            run.status === 'completed' && 'bg-green-400',
                            run.status === 'in_progress' && 'bg-blue-400',
                            run.status === 'synced' && 'bg-zinc-500',
                            run.status === 'archived' && 'bg-zinc-600',
                          )} />
                          {run.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {run.inspector_id?.slice(0, 8) || '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {run.completed_at ? formatDate(run.completed_at) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}