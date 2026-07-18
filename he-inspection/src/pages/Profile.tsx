// ─── Profile Page ─────────────────────────────────────────
import { useState } from 'react'
import { User, Mail, Shield, Building2, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../lib/utils'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  if (loading) return <div className="p-6"><Spinner /></div>

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center text-zinc-500">
          <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Not signed in</p>
          <p className="text-sm mt-1">Sign in to view your profile</p>
        </div>
      </div>
    )
  }

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      await refreshProfile()
      setRefreshMsg('Profile refreshed successfully')
    } catch {
      setRefreshMsg('Failed to refresh profile')
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshMsg(null), 3000)
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'text-red-400 bg-red-400/10',
    manager: 'text-purple-400 bg-purple-400/10',
    supervisor: 'text-blue-400 bg-blue-400/10',
    inspector: 'text-green-400 bg-green-400/10',
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-zinc-500 mt-1">Your account information and settings</p>
      </div>

      {/* Profile Card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        {/* Avatar area */}
        <div className="bg-gradient-to-r from-orange-600/20 to-orange-800/20 px-6 py-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {(user.name || user.email)[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100">{user.name || 'User'}</h2>
            <span className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1',
              roleColors[user.role] || 'text-zinc-400 bg-zinc-400/10'
            )}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Info fields */}
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Email</p>
              <p className="text-sm text-zinc-100">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Role</p>
              <p className="text-sm text-zinc-100 capitalize">{user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Organization ID</p>
              <p className="text-sm font-mono text-zinc-100">
                {user.org_id || <span className="text-zinc-600 italic">Not assigned</span>}
              </p>
            </div>
          </div>

          {user.site_id && (
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Site ID</p>
                <p className="text-sm font-mono text-zinc-100">{user.site_id}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-zinc-500 shrink-0" />
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">User ID</p>
              <p className="text-sm font-mono text-zinc-100">{user.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-100">Profile Data</p>
            <p className="text-xs text-zinc-500 mt-0.5">Refresh your profile from the database</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-zinc-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh Profile'}
          </button>
        </div>
        {refreshMsg && (
          <p className={cn(
            'text-xs mt-2',
            refreshMsg.includes('success') ? 'text-green-400' : 'text-red-400'
          )}>
            {refreshMsg}
          </p>
        )}
      </div>

      {/* Basic settings display */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
        <h3 className="text-sm font-medium text-zinc-100 mb-3">Account Settings</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-400">Notifications</span>
            <span className="text-zinc-600">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-zinc-800">
            <span className="text-zinc-400">Two-Factor Auth</span>
            <span className="text-zinc-600">Coming soon</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-zinc-400">Session Management</span>
            <span className="text-zinc-600">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}