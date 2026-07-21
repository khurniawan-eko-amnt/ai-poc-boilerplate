// ─── Dashboard Page ──────────────────────────────────────
import { useEffect, useState } from 'react'
import { MessageSquare, FileText, Users, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../stores/authStore'
import { useDebugStore } from '../stores/debugStore'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const debug = useDebugStore((s) => s.add)
  const [stats, setStats] = useState({ chats: 0, files: 0 })

  useEffect(() => {
    async function load() {
      try {
        const { count: chats } = await supabase
          .from('chats').select('*', { count: 'exact', head: true })
        const { count: files } = await supabase
          .from('uploads').select('*', { count: 'exact', head: true })
        setStats({ chats: chats || 0, files: files || 0 })
      } catch {
        // tables may not exist yet — that's OK
      }
    }
    load()
  }, [debug])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Welcome, {user?.email}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{stats.chats}</p>
              <p className="text-xs text-zinc-500">Chats</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{stats.files}</p>
              <p className="text-xs text-zinc-500">Files</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-xs text-zinc-500">User (you)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/chat"
            className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 border border-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Start AI Chat</p>
                <p className="text-xs text-zinc-500">Ask questions, get answers</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
          <Link
            to="/documents"
            className="flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 border border-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium">Upload Document</p>
                <p className="text-xs text-zinc-500">Analyze files with AI</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* Setup steps */}
      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">Getting Started</h2>
        </div>
        <ol className="space-y-3 text-sm text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">1</span>
            Create your schema in Supabase Studio (see <code className="text-blue-400">templates/poc-schema-template.sql</code>)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">2</span>
            Set <code className="text-blue-400">VITE_SUPABASE_URL</code> and <code className="text-blue-400">VITE_ANON_KEY</code> in your <code className="text-blue-400">.env</code>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">3</span>
            (Optional) Deploy the AI proxy for real AI responses
          </li>
          <li className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0">4</span>
            Start building your POC UI! Press <kbd className="px-1 bg-zinc-800 rounded text-xs">Ctrl+`</kbd> for debug panel
          </li>
        </ol>
      </div>
    </div>
  )
}