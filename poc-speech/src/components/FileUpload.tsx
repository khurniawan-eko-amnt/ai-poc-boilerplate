// ─── File Upload Component ───────────────────────────────
// Drag & drop file upload to Supabase Storage.
import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Image, X, Loader2 } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useDebugStore } from '../stores/debugStore'

interface FileUploadProps {
  bucket?: string
  onUploaded?: (path: string, fileName: string) => void
}

export function FileUpload({ bucket = 'poc-files', onUploaded }: FileUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ name: string; size: number; type: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debug = useDebugStore((s) => s.add)

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    setPreview({ name: file.name, size: file.size, type: file.type })
    debug('info', `Uploading: ${file.name} (${file.size} bytes)`)

    try {
      const path = `${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from(bucket).upload(path, file)
      if (error) throw error

      const { data: url } = supabase.storage.from(bucket).getPublicUrl(path)
      debug('info', `Uploaded: ${file.name} → ${url.publicUrl}`)
      onUploaded?.(path, file.name)
      setPreview(null)
    } catch (err) {
      debug('error', 'Upload failed', err)
    } finally {
      setUploading(false)
    }
  }, [bucket, onUploaded, debug])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        dragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-zinc-700 hover:border-zinc-500'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-zinc-400">Uploading {preview?.name}...</p>
        </div>
      ) : preview ? (
        <div className="flex items-center justify-between bg-zinc-800 rounded p-3">
          <div className="flex items-center gap-3">
            {preview.type.startsWith('image/') ? (
              <Image className="w-5 h-5 text-green-400" />
            ) : (
              <FileText className="w-5 h-5 text-blue-400" />
            )}
            <div className="text-left text-sm">
              <p className="text-white truncate max-w-[200px]">{preview.name}</p>
              <p className="text-zinc-500">{(preview.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={() => setPreview(null)} className="text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <Upload className="w-8 h-8" />
          <p className="text-sm">Drop file here or click to upload</p>
          <p className="text-xs text-zinc-600">PDF, images, documents up to 50MB</p>
        </button>
      )}
    </div>
  )
}