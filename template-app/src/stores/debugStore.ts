// ─── Debug Store ──────────────────────────────────────────
// Logs all actions/errors visible via Ctrl+` debug panel.
import { create } from 'zustand'

export interface LogEntry {
  id: number
  ts: string
  level: 'info' | 'warn' | 'error'
  msg: string
  data?: unknown
}

interface DebugState {
  logs: LogEntry[]
  add: (level: LogEntry['level'], msg: string, data?: unknown) => void
  clear: () => void
}

let nextId = 0

export const useDebugStore = create<DebugState>((set) => ({
  logs: [],
  add: (level, msg, data) => {
    const entry: LogEntry = {
      id: nextId++,
      ts: new Date().toLocaleTimeString('id-ID'),
      level,
      msg,
      data,
    }
    set((s) => ({ logs: [...s.logs.slice(-199), entry] }))
    if (level === 'error') console.error(`[${entry.ts}] ${msg}`, data)
    else console.log(`[${entry.ts}] ${level.toUpperCase()} ${msg}`, data)
  },
  clear: () => set({ logs: [] }),
}))