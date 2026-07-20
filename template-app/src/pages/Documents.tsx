// ─── Documents Page ──────────────────────────────────────
import { useEffect, useState } from 'react'
import { FileText, Image, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '../services/supabase'
import { FileUpload } from '../components/FileUpload'
import { useDebugStore } from '../stores/debugStore'
import { formatBytes, formatDate } from '../lib/utils'
import type { Upload } from '../lib/types'

export function DocumentsPage() {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const debug = useDebugStore((s) => s.add)

  const loadUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUploads(data || [])
    } catch (err) {
      debug('warn', 'Could not load uploads (table may not exist yet)', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUploads() }, [])

  const handleDelete = async (id: string, storagePath: string) => {
    try {
      await supabase.from('uploads').delete().eq('id', id)
      await supabase.storage.from('poc-files').remove([storagePath])
      setUploads((prev) => prev.filter((u) => u.id !== id))
      debug('info', `Deleted upload: ${storagePath}`)
    } catch (err) {
      debug('error', 'Delete failed', err)
    }
  }

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('poc-files').getPublicUrl(path)
    return data.publicUrl
  }

  const iconForType = (mime: string) => {
    if (mime?.startsWith('image/')) return <Image className="w-8 h-8 text-green-400" />
    return <FileText className="w-8 h-8 text-blue-400" />
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-zinc-500 mt-1 text-sm">Upload and manage files</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          {showUpload ? 'Cancel' : 'Upload File'}
        </button>
      </div>

      {showUpload && (
        <FileUpload
          onUploaded={() => {
            setShowUpload(false)
            loadUploads()
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm">Upload a file to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center gap-4"
            >
              {iconForType(upload.mime_type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{upload.file_name}</p>
                <p className="text-xs text-zinc-500">
                  {formatBytes(upload.file_size)} · {formatDate(upload.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={getPublicUrl(upload.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(upload.id, upload.storage_path)}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}