// ─── Equipment Detail Page ────────────────────────────────
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Play, Edit, ClipboardList, AlertTriangle } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn, formatDate, statusColor, severityColor } from '../lib/utils'
import type { Equipment, InspectionRun, InspectionDefect } from '../lib/types'

type Tab = 'inspections' | 'defects'

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [inspections, setInspections] = useState<InspectionRun[]>([])
  const [defects, setDefects] = useState<InspectionDefect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('inspections')

  useEffect(() => {
    if (!id) return
    loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const { data: eq, error: eqErr } = await supabase
        .from('equipment').select('*').eq('id', id).single()
      if (eqErr) throw eqErr
      setEquipment(eq)

      const { data: runs } = await supabase
        .from('inspection_runs').select('*').eq('equipment_id', id).order('started_at', { ascending: false })

      const { data: defs } = await supabase
        .from('inspection_defects').select('*').eq('equipment_id', id).order('created_at', { ascending: false })

      setInspections(runs || [])
      setDefects(defs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment')
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

  if (error || !equipment) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 text-sm">
          {error || 'Equipment not found'}
          <button onClick={() => navigate('/equipment')} className="ml-2 underline">Back to equipment</button>
        </div>
      </div>
    )
  }

  const eq = equipment

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/equipment')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Equipment
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/inspections/new/${eq.id}`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Inspection
          </button>
          <Link
            to="/equipment/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg text-sm transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Equipment Info Card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Fleet Number</p>
            <p className="text-lg font-semibold text-zinc-100">{eq.fleet_number || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">VIN</p>
            <p className="text-lg font-mono text-zinc-100">{eq.vin}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', statusColor(eq.status))}>
              <span className={cn(
                'w-2 h-2 rounded-full',
                eq.status === 'active' && 'bg-green-400',
                eq.status === 'down' && 'bg-red-400',
                eq.status === 'maintenance' && 'bg-yellow-400',
                eq.status === 'decommissioned' && 'bg-zinc-500',
              )} />
              {eq.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Make</p>
            <p className="text-zinc-100">{eq.make}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Model</p>
            <p className="text-zinc-100">{eq.model || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Year</p>
            <p className="text-zinc-100">{eq.year || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Hours</p>
            <p className="text-zinc-100">{eq.hours?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Equipment Type</p>
            <p className="text-zinc-100 capitalize">{eq.equipment_type}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-zinc-400 text-sm">{eq.notes || '—'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-fit">
        <button
          onClick={() => setActiveTab('inspections')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'inspections'
              ? 'bg-orange-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <ClipboardList className="w-4 h-4" />
          Inspection History ({inspections.length})
        </button>
        <button
          onClick={() => setActiveTab('defects')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'defects'
              ? 'bg-orange-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Open Defects ({defects.filter((d) => d.status !== 'resolved' && d.status !== 'closed').length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inspections' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          {inspections.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No inspections yet</p>
              <p className="text-sm mt-1">Start your first inspection for this equipment</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Inspector</th>
                  <th className="text-left px-4 py-3 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((run) => (
                  <tr
                    key={run.id}
                    onClick={() => navigate(`/inspections/${run.id}`)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-100">{formatDate(run.started_at)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(run.status))}>
                        {run.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{run.inspector_id?.slice(0, 8) || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{run.odometer_hours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'defects' && (
        <div className="space-y-3">
          {defects.filter((d) => d.status !== 'resolved' && d.status !== 'closed').length === 0 ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No open defects</p>
              <p className="text-sm mt-1">All defects have been resolved or closed</p>
            </div>
          ) : (
            defects
              .filter((d) => d.status !== 'resolved' && d.status !== 'closed')
              .map((def) => (
                <div
                  key={def.id}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100 truncate">{def.title}</p>
                      {def.description && (
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{def.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', severityColor(def.severity))}>
                        {def.severity}
                      </span>
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(def.status))}>
                        {def.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}