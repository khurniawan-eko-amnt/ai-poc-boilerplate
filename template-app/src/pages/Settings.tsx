// ─── Settings Page ────────────────────────────────────────
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useDebugStore } from '../stores/debugStore'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const { settings, update } = useSettingsStore()
  const debug = useDebugStore((s) => s.add)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-zinc-500 mt-1 text-sm">Configure your POC app</p>
      </div>

      {/* Profile */}
      <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-3">
        <h2 className="font-semibold">Profile</h2>
        <div className="text-sm text-zinc-400">
          <p>Email: <span className="text-white">{user?.email}</span></p>
          <p>User ID: <code className="text-blue-400 text-xs">{user?.id}</code></p>
        </div>
      </section>

      {/* AI Settings */}
      <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-4">
        <h2 className="font-semibold">AI Configuration</h2>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Model</label>
          <select
            value={settings.aiModel}
            onChange={(e) => { update({ aiModel: e.target.value }); debug('info', `Model changed: ${e.target.value}`) }}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="gpt-4o-mini">GPT-4o Mini (fast)</option>
            <option value="gpt-4o">GPT-4o (powerful)</option>
            <option value="claude-sonnet-4">Claude Sonnet 4</option>
            <option value="claude-haiku-3.5">Claude Haiku 3.5</option>
            <option value="ollama/llama3">Ollama Llama 3 (local)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">System Prompt</label>
          <textarea
            value={settings.aiPrompt}
            onChange={(e) => update({ aiPrompt: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
          />
          <p className="text-xs text-zinc-600 mt-1">
            This prompt sets the AI assistant's behavior. Default is in Bahasa Indonesia.
          </p>
        </div>
      </section>

      {/* Theme */}
      <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-3">
        <h2 className="font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => update({ theme })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                settings.theme === theme
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* API Keys */}
      <section className="bg-zinc-900 rounded-xl p-5 border border-zinc-800 space-y-3">
        <h2 className="font-semibold">Connection</h2>
        <div className="text-sm space-y-2">
          <div>
            <p className="text-zinc-500">Supabase URL</p>
            <code className="text-blue-400 text-xs break-all">
              {import.meta.env.VITE_SUPABASE_URL || 'http://104.215.187.68:8000'}
            </code>
          </div>
          <div>
            <p className="text-zinc-500">AI Proxy URL</p>
            <code className="text-blue-400 text-xs break-all">
              {import.meta.env.VITE_AI_PROXY_URL || '(not configured — AI responses use fallback)'}
            </code>
          </div>
        </div>
      </section>
    </div>
  )
}