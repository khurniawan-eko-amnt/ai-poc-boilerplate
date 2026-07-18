// ─── Dashboard Page ──────────────────────────────────────
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck, ClipboardCheck, AlertTriangle, TrendingUp, ArrowRight, Plus, Loader2 } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../stores/authStore'
import { statusColor } from '../lib/utils'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState({ active: 0, down: 0, maintenance: 0, inspectionsToday: 0, openDefects: 0 })
  const [loading, setLoading] = useState(true)
  const [recentInspections, setRecentInspections] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      try {
        const { data: equip } = await supabase.from('equipment').select('status')
        const active = equip?.filter(e => e.status === 'active').length || 0
        const down = equip?.filter(e => e.status === 'down').length || 0
        const maint = equip?.filter(e => e.status === 'maintenance').length || 0

        const today = new Date().toISOString().slice(0, 10)
        const { count: todayCount } = await supabase
          .from('inspection_runs').select('*', { count: 'exact', head: true })
          .gte('started_at', today)

        const { count: defects } = await supabase
          .from('inspection_defects').select('*', { count: 'exact', head: true })
          .not('status', 'in', '("resolved","closed")')

        setStats({ active, down, maintenance: maint, inspectionsToday: todayCount || 0, openDefects: defects || 0 })

        const { data: recent } = await supabase
          .from('inspection_runs').select('*').order('started_at', { ascending: false }).limit(5)
        setRecentInspections(recent || [])
      } catch { /* tables may not exist yet */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-zinc-500 mt-1">Welcome, {user?.name || user?.email}</p>
        </div>
        <Link to="/equipment" className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Inspection
        </Link>
      </div>

      {/* Equipment status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-zinc-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold">{stats.down}</p>
              <p className="text-xs text-zinc-500">Down</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{stats.inspectionsToday}</p>
              <p className="text-xs text-zinc-500">Today</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{stats.openDefects}</p>
              <p className="text-xs text-zinc-500">Open Defects</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent inspections */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent Inspections</h2>
          <Link to="/inspections" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentInspections.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-8 text-center border border-zinc-800">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
            <p className="text-zinc-500">No inspections yet</p>
            <Link to="/equipment" className="text-orange-400 text-sm hover:text-orange-300 mt-1 inline-block">
              Start your first inspection →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentInspections.map((run) => (
              <Link key={run.id} to={`/inspections/${run.id}`}
                className="block bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Equipment: {run.equipment_id?.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(run.started_at).toLocaleDateString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor(run.status)}`}>
                    {run.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/defects" className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 border border-zinc-800 transition-colors">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="font-medium text-sm">Open Defects</p>
              <p className="text-xs text-zinc-500">{stats.openDefects} items</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600" />
        </Link>
        <Link to="/equipment" className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 border border-zinc-800 transition-colors">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-orange-400" />
            <div>
              <p className="font-medium text-sm">Equipment</p>
              <p className="text-xs text-zinc-500">Manage fleet</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600" />
        </Link>
        <Link to="/profile" className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 border border-zinc-800 transition-colors">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium text-sm">My Profile</p>
              <p className="text-xs text-zinc-500">Account settings</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-600" />
        </Link>
      </div>
    </div>
  )
}