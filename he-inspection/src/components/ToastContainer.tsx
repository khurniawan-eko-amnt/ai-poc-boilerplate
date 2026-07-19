// ─── Toast Notification Component ─────────────────────────
import { useToastStore } from '../stores/toastStore'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const STYLES: Record<string, string> = {
  success: 'bg-green-900/80 border-green-600 text-green-200',
  error: 'bg-red-900/80 border-red-600 text-red-200',
  warning: 'bg-yellow-900/80 border-yellow-600 text-yellow-200',
  info: 'bg-blue-900/80 border-blue-600 text-blue-200',
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const remove = useToastStore((s) => s.remove)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md min-w-[300px] max-w-[420px] animate-slide-up ${STYLES[toast.type]}`}
            style={{ animation: 'slideUp 0.25s ease-out' }}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="text-xs font-semibold underline mt-1 opacity-80 hover:opacity-100"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => remove(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}