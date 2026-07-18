export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
  }).format(new Date(date))
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-400 bg-green-400/10',
    down: 'text-red-400 bg-red-400/10',
    maintenance: 'text-yellow-400 bg-yellow-400/10',
    decommissioned: 'text-zinc-500 bg-zinc-500/10',
    completed: 'text-green-400 bg-green-400/10',
    in_progress: 'text-blue-400 bg-blue-400/10',
    synced: 'text-zinc-500 bg-zinc-500/10',
    archived: 'text-zinc-600 bg-zinc-600/10',
    open: 'text-red-400 bg-red-400/10',
    resolved: 'text-green-400 bg-green-400/10',
    closed: 'text-zinc-500 bg-zinc-500/10',
  }
  return colors[status] || 'text-zinc-400 bg-zinc-400/10'
}

export function severityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-400 bg-red-400/10 border-red-500/30',
    high: 'text-orange-400 bg-orange-400/10 border-orange-500/30',
    medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
  }
  return colors[severity] || 'text-zinc-400 bg-zinc-400/10'
}

export function generateClientId(): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}