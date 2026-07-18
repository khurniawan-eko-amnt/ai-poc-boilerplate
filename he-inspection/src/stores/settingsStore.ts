// ─── Settings Store ───────────────────────────────────────
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  aiModel: string
  aiPrompt: string
  showDebugPanel: boolean
}

interface SettingsState {
  settings: AppSettings
  update: (partial: Partial<AppSettings>) => void
  toggleDebugPanel: () => void
  toggleTheme: () => void
  resolvedTheme: 'light' | 'dark'
  applyTheme: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: {
        theme: 'dark',
        aiModel: 'gpt-4o-mini',
        aiPrompt: 'Kamu adalah asisten AI yang membantu. Jawab dalam Bahasa Indonesia.',
        showDebugPanel: false,
      },
      resolvedTheme: 'dark',

      update: (partial) => {
        set((s) => ({ settings: { ...s.settings, ...partial } }))
        get().applyTheme()
      },

      toggleDebugPanel: () => {
        set((s) => ({ settings: { ...s.settings, showDebugPanel: !s.settings.showDebugPanel } }))
      },

      toggleTheme: () => {
        const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'light']
        const next = themes[themes.indexOf(get().settings.theme) + 1] || 'light'
        set((s) => ({ settings: { ...s.settings, theme: next } }))
        get().applyTheme()
      },

      applyTheme: () => {
        const { theme } = get().settings
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme
        document.documentElement.classList.toggle('dark', resolved === 'dark')
        set({ resolvedTheme: resolved })
      },
    }),
    {
      name: 'poc-settings',
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
)