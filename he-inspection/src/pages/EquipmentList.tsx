// ─── Equipment List Page ──────────────────────────────────
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Truck } from 'lucide-react'
import { supabase } from '../services/supabase'
import { cn, statusColor } from '../lib/utils'
import type { Equipment, EquipmentStatus } from '../lib/types'

const STATUS_OPTIONS: { label: string; value: EquipmentStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Down', value: 'down' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Decommissioned', value: 'decommissioned' },
]

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function EquipmentListPage() {
  const navigate = useNavigate()
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | ''>('')

  useEffect(() => {
    loadEquipment()
  }, [])

  async function loadEquipment() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('equipment')
        .select('*')
        .order('fleet_number', { ascending: true })
      if (err) throw err
      setEquipment(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }

  const filtered = equipment.filter((eq) => {
    const q = search.toLowerCase()
    if (q) {
      const match =
        (eq.vin && eq.vin.toLowerCase().includes(q)) ||
        (eq.fleet_number && eq.fleet_number.toLowerCase().includes(q)) ||
        (eq.model && eq.model.toLowerCase().includes(q)) ||
        (eq.make && eq.make.toLowerCase().includes(q))
      if (!match) return false
    }
    if (statusFilter && eq.status !== statusFilter) return false
    return true
  })

  if (loading) return <div className="p-6"><Spinner /></div>

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Equipment</h1>
          <p className="text-sm text-zinc-500 mt-1">{equipment.length} total units</p>
        </div>
        <Link
          to="/equipment/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Equipment
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by VIN, fleet number, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value as EquipmentStatus | '')}
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
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
          <button onClick={loadEquipment} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <Truck className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">{search || statusFilter ? 'No matching equipment' : 'No equipment yet'}</p>
          <p className="text-sm mt-1">
            {search || statusFilter
              ? 'Try adjusting your search or filters'
              : 'Add your first piece of equipment to get started'}
          </p>
          {!search && !statusFilter && (
            <Link
              to="/equipment/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Equipment
            </Link>
          )}
        </div>
      )}

      {/* Equipment Table */}
      {filtered.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Fleet #</th>
                  <th className="text-left px-4 py-3 font-medium">VIN</th>
                  <th className="text-left px-4 py-3 font-medium">Make / Model</th>
                  <th className="text-left px-4 py-3 font-medium">Year</th>
                  <th className="text-left px-4 py-3 font-medium">Hours</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq) => (
                  <tr
                    key={eq.id}
                    onClick={() => navigate(`/equipment/${eq.id}`)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-100 font-medium">
                      {eq.fleet_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs">
                      {eq.vin}
                    </td>
                    <td className="px-4 py-3 text-zinc-100">
                      {eq.make} {eq.model || ''}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{eq.year || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{eq.hours?.toLocaleString() || '0'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', statusColor(eq.status))}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          eq.status === 'active' && 'bg-green-400',
                          eq.status === 'down' && 'bg-red-400',
                          eq.status === 'maintenance' && 'bg-yellow-400',
                          eq.status === 'decommissioned' && 'bg-zinc-500',
                        )} />
                        {eq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}