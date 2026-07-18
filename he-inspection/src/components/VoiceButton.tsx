// ─── Voice Input Button ──────────────────────────────────
// Uses Web Speech API for Bahasa Indonesia (id-ID).
import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useDebugStore } from '../stores/debugStore'

interface VoiceButtonProps {
  onResult: (text: string) => void
  disabled?: boolean
}

export function VoiceButton({ onResult, disabled }: VoiceButtonProps) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const debug = useDebugStore((s) => s.add)

  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) {
      setError('Browser tidak mendukung voice input')
      debug('error', 'Voice not supported in this browser')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'id-ID'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) {
        onResult(finalTranscript)
        debug('info', `Voice input: "${finalTranscript.slice(0, 100)}"`)
      }
    }

    recognition.onerror = (event: any) => {
      setError(`Error: ${event.error}`)
      setListening(false)
      debug('error', 'Voice error', event.error)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
    setError(null)
    debug('info', 'Voice listening started (id-ID)')
  }, [onResult, debug])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors ${
          listening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={listening ? 'Stop recording' : 'Voice input (id-ID)'}
      >
        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      {listening && (
        <span className="absolute -top-2 -right-2 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}
      {error && (
        <span className="absolute top-full left-0 mt-1 text-xs text-red-400 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  )
}