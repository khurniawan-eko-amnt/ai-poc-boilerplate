// ─── Debug Panel ──────────────────────────────────────────
// Ctrl+` to toggle. Shows all API calls, errors, and events.
import { useState } from 'react'
import { Bug, X, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useDebugStore, type LogEntry } from '../stores/debugStore'
import { useSettingsStore } from '../stores/settingsStore'

export function DebugPanel() {
  const show = useSettingsStore((s) => s.settings.showDebugPanel)
  const toggle = useSettingsStore((s) => s.toggleDebugPanel)
  const logs = useDebugStore((s) => s.logs)
  const clear = useDebugStore((s) => s.clear)
  const [collapsed, setCollapsed] = useState(false)
  const [filter, setFilter] = useState<LogEntry['level'] | 'all'>('all')

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter)
  const levelDot = (level: LogEntry['level']) => {
    const colors = { info: 'bg-blue-500', warn: 'bg-yellow-500', error: 'bg-red-500' }
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[level]} mr-2`} />
  }

  return (
    <>
      {/* Fixed toggle button */}
      <button
        onClick={toggle}
        className={`fixed bottom-4 right-4 z-50 p-2 rounded-full shadow-lg transition-colors ${
          show ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-white'
        }`}
        title="Toggle Debug Panel (Ctrl+`)"
      >
        <Bug className="w-4 h-4" />
      </button>

      {/* Panel */}
      {show && (
        <div className="fixed bottom-16 right-4 z-50 w-96 max-h-[70vh] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
            <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-400 hover:text-white">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <span className="text-xs font-mono text-zinc-400">Debug ({filtered.length})</span>
            <div className="flex gap-1">
              {(['all', 'info', 'warn', 'error'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    filter === f ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button onClick={clear} className="text-zinc-500 hover:text-red-400 ml-2">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <button onClick={toggle} className="text-zinc-500 hover:text-white ml-1">
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Logs */}
          {!collapsed && (
            <div className="overflow-y-auto flex-1 p-2 font-mono text-[11px] space-y-1">
              {filtered.length === 0 ? (
                <p className="text-zinc-600 text-center py-4">No logs yet</p>
              ) : (
                filtered.map((log) => (
                  <div key={log.id} className="flex items-start gap-1">
                    <span className="text-zinc-600 shrink-0">{log.ts}</span>
                    {levelDot(log.level)}
                    <span className={`${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' : 'text-zinc-300'
                    }`}>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ─── Global keyboard shortcut ────────────────────────────
import { useEffect } from 'react'

export function useDebugShortcut() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        useSettingsStore.getState().toggleDebugPanel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}