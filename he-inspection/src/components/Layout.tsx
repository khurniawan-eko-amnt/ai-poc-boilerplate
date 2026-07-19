// ─── App Layout — Inspection Theme ───────────────────────
import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Truck, ClipboardCheck, AlertTriangle,
  FileText, Settings, LogOut, Menu, X, Moon, Sun, User,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { ToastContainer } from './ToastContainer'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/equipment', label: 'Equipment', icon: Truck },
  { path: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { path: '/defects', label: 'Defects', icon: AlertTriangle },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const { toggleTheme, resolvedTheme } = useSettingsStore()

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-orange-400">HE Inspection</h1>
          <p className="text-xs text-zinc-500 mt-1 truncate">{user?.name || user?.email}</p>
          {user?.role && (
            <span className="inline-block text-[10px] uppercase text-zinc-600 mt-0.5">{user.role}</span>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-2 border-t border-zinc-800 space-y-1">
          <button onClick={toggleTheme} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={signOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setMobileOpen(true)} className="text-zinc-400"><Menu className="w-5 h-5" /></button>
        <h1 className="text-sm font-bold text-orange-400">HE Inspection</h1>
        <div className="w-5" />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h1 className="text-lg font-bold text-orange-400">HE Inspection</h1>
              <button onClick={() => setMobileOpen(false)} className="text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <nav className="p-2 space-y-1">
              {NAV_ITEMS.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === item.path ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-2 border-t border-zinc-800">
              <button onClick={signOut} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-zinc-400 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
        <ToastContainer />
      </main>
    </div>
  )
}