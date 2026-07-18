// ─── New Inspection Page ─────────────────────────────────
// Workflow:
//   1. Baca pertanyaan
//   2. Inspeksi sesuai pertanyaan
//   3. Bila OK → tekan Ya — OK → auto-next
//   4. Bila ada temuan → Voice → STT → review transcript
//   5. Tambah foto/video sebagai evidence
//   6. Pilih level defect → auto-next
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Check, Camera, Mic,
  Video, Square, AlertTriangle, Send, Loader2, X, Flag, Edit3,
  Image as ImageIcon, Film,
} from 'lucide-react'
import { useInspectionStore } from '../stores/inspectionStore'
import { supabase } from '../services/supabase'
import { useDebugStore } from '../stores/debugStore'
import type { DefectSeverity, InspectionMedia } from '../lib/types'

const DEFECT_LEVELS: { key: DefectSeverity; label: string; color: string; activeClass: string }[] = [
  { key: 'low', label: 'Rendah', color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10', activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40 ring-2 ring-blue-500/40' },
  { key: 'medium', label: 'Sedang', color: 'text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10', activeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 ring-2 ring-yellow-500/40' },
  { key: 'high', label: 'Tinggi', color: 'text-red-400 border-red-500/30 hover:bg-red-500/10', activeClass: 'bg-red-500/20 text-red-300 border-red-500/40 ring-2 ring-red-500/40' },
]

export function NewInspectionPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>()
  const navigate = useNavigate()
  const debug = useDebugStore((s) => s.add)

  const {
    activeTemplate, currentInspection, inspectionAnswers, inspectionMedia,
    startInspection, saveAnswer, completeInspection, loadTemplate,
  } = useInspectionStore()

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [selectedDefect, setSelectedDefect] = useState<DefectSeverity | null>(null)
  // Local media state for realtime thumbnail display
  const [localMedia, setLocalMedia] = useState<InspectionMedia[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const findingInputRef = useRef<HTMLTextAreaElement>(null)

  // Load template and start inspection on mount
  useEffect(() => {
    async function init() {
      if (!equipmentId) return
      await loadTemplate()
      const tpl = useInspectionStore.getState().activeTemplate
      if (tpl && !currentInspection) {
        await startInspection(equipmentId, tpl.id)
      }
      setLoading(false)
    }
    init()
  }, [equipmentId])

  const sections = activeTemplate?.sections || []
  const currentSection = sections[currentSectionIdx]
  const currentQuestion = currentSection?.questions[currentQuestionIdx]
  const answer = currentQuestion ? inspectionAnswers.get(currentQuestion.id) : undefined
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0)
  const answeredCount = inspectionAnswers.size

  // Finding text: realtime voiceTranscript when voice active, otherwise from store
  const storeText = currentQuestion ? inspectionAnswers.get(currentQuestion.id)?.text_value ?? '' : ''
  const findingText = voiceListening ? voiceTranscript : storeText

  // Also derive whether a defect is already flagged for this question
  const hasDefect = answer?.flagged === true
  const defectSeverity = answer?.severity ?? null

  // Get public URL from Supabase storage
  const getMediaUrl = useCallback((m: InspectionMedia): string => {
    const { data } = supabase.storage.from('poc-he-inspection').getPublicUrl(m.file_path)
    return data?.publicUrl || ''
  }, [])

  // Gather media for the current question (from store + local)
  const currentQuestionMedia: InspectionMedia[] = React.useMemo(() => {
    const answerId = answer?.id
    const qId = currentQuestion?.id
    if (!qId) return localMedia

    const fromStore = inspectionMedia.filter((m) => {
      if (m.answer_id) return m.answer_id === answerId
      // If answer_id is null, match by inspection_id + question context
      // (fallback: just show latest media for this inspection)
      return false
    })
    // Merge store media + local media, deduplicate by file_path
    const seen = new Set<string>()
    const merged: InspectionMedia[] = []
    for (const m of [...fromStore, ...localMedia]) {
      if (!seen.has(m.file_path)) {
        seen.add(m.file_path)
        merged.push(m)
      }
    }
    return merged
  }, [inspectionMedia, localMedia, answer?.id, currentQuestion?.id])

  // Reset local media when question changes
  useEffect(() => {
    setLocalMedia([])
  }, [currentQuestion?.id])

  // Reset selection when question changes
  useEffect(() => {
    // Restore which defect level is active from saved answer
    if (answer?.flagged && answer?.severity) {
      setSelectedDefect(answer.severity as DefectSeverity)
    } else {
      setSelectedDefect(null)
    }
  }, [currentQuestion?.id, answer?.flagged, answer?.severity])

  const goToQuestion = useCallback((sectionIdx: number, questionIdx: number) => {
    if (sectionIdx >= 0 && sectionIdx < sections.length) {
      setCurrentSectionIdx(sectionIdx)
      const sec = sections[sectionIdx]
      if (questionIdx >= 0 && questionIdx < sec.questions.length) {
        setCurrentQuestionIdx(questionIdx)
      } else {
        setCurrentQuestionIdx(0)
      }
    }
  }, [sections])

  const advanceToNext = useCallback(() => {
    const sec = sections[currentSectionIdx]
    if (currentQuestionIdx < sec.questions.length - 1) {
      setCurrentQuestionIdx(i => i + 1)
    } else if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(i => i + 1)
      setCurrentQuestionIdx(0)
    }
  }, [currentSectionIdx, currentQuestionIdx, sections])

  // ── Step 3: OK — no finding, save boolean true, advance ──
  const handleOk = useCallback(async () => {
    if (!currentQuestion) return
    await saveAnswer(currentQuestion.id, {
      answer_type: 'boolean',
      boolean_value: true,
      text_value: null,
      flagged: false,
      severity: null,
    } as any)
    debug('info', `OK — no finding on Q${currentQuestion.sort_order}`)
    advanceToNext()
  }, [currentQuestion, saveAnswer, advanceToNext, debug])

  // ── Step 6: Select defect level → save finding, advance ──
  const handleDefectSelect = useCallback(async (level: DefectSeverity) => {
    if (!currentQuestion) return
    const finding = findingInputRef.current?.value || ''
    setSelectedDefect(level)
    await saveAnswer(currentQuestion.id, {
      answer_type: 'boolean',
      boolean_value: false,
      flagged: true,
      severity: level,
      text_value: finding,
    } as any)
    debug('info', `Defect ${level} on Q${currentQuestion.sort_order}: "${finding.slice(0, 60)}"`)
    advanceToNext()
  }, [currentQuestion, saveAnswer, advanceToNext, debug])

  // ── Voice: STT for describing findings ──
  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    setVoiceListening(false)
    setInterimText('')
    // DO NOT clear voiceTranscript here — it should persist in the textbox
    // after stopping. It will be replaced on the next voice result, or
    // the user can edit manually.
  }, [])

  const handleVoice = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) { debug('error', 'Voice not supported'); return }
    if (voiceListening) { stopListening(); return }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'id-ID'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      // Collect ALL final results since last onresult call (usually 1)
      const allFinals: string[] = []
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) {
          const t = r[0].transcript.trim()
          if (t) allFinals.push(t)
        } else {
          interim += r[0].transcript
        }
      }
      setInterimText(interim)

      // ONLY update textbox if there's actual non-empty text from speech api
      if (allFinals.length > 0 && currentQuestion) {
        const latestFinal = allFinals[allFinals.length - 1]

        // 1. IMMEDIATELY update local state → textbox updates instantly
        setVoiceTranscript(latestFinal)

        // 2. Persist to store (fire-and-forget, not awaited — background sync)
        saveAnswer(currentQuestion.id, {
          answer_type: currentQuestion.answer_type as any,
          text_value: latestFinal,
          flagged: false,
        } as any)
        debug('info', `Voice transcript: "${latestFinal.slice(0, 80)}"`)
      }
    }

    recognition.onerror = (event: any) => {
      debug('error', `Voice error: ${event.error}`)
      setVoiceListening(false)
      setInterimText('')
      // Don't clear transcript
    }
    recognition.onend = () => {
      setVoiceListening(false)
      setInterimText('')
      // Don't clear transcript — keep what was transcribed
    }
    recognition.start()
    setVoiceListening(true)
    setInterimText('')
    // Start fresh transcript for this recording session
    setVoiceTranscript('')
  }, [voiceListening, currentQuestion, debug, stopListening, saveAnswer])

  // Cleanup on unmount
  useEffect(() => {
    return () => { try { recognitionRef.current?.abort() } catch { /* ignore */ } }
  }, [])

  const handleFindingTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (currentQuestion) {
      saveAnswer(currentQuestion.id, {
        text_value: val,
        answer_type: currentQuestion.answer_type as any,
      } as any)
    }
  }, [currentQuestion, saveAnswer])

  // ── Photo / Video capture ──
  const handlePhoto = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*'
      fileInputRef.current.click()
    }
  }, [])

  const handleVideo = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'video/*'
      fileInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentInspection || !currentQuestion) return
    setUploadingMedia(true)
    const uploadMedia = useInspectionStore.getState().uploadMedia
    const mediaId = await uploadMedia(file, currentInspection.id, currentQuestion.id)
    if (mediaId) {
      // Add to local media for immediate thumbnail
      const localEntry: InspectionMedia = {
        id: mediaId,
        inspection_id: currentInspection.id,
        answer_id: null, // will be filled on next load
        file_path: `${currentInspection.id}/${Date.now()}-${file.name}`,
        mime_type: file.type,
        file_size_bytes: file.size,
        gps_lat: null,
        gps_lng: null,
        captured_at: new Date().toISOString(),
        description: null,
        is_synced: false,
        created_at: new Date().toISOString(),
      }
      setLocalMedia(prev => [...prev, localEntry])
    }
    setUploadingMedia(false)
    debug('info', `Media captured: ${file.name}`)
    e.target.value = ''
  }, [currentInspection, currentQuestion, debug])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    await completeInspection()
    if (currentInspection) {
      navigate(`/inspections/${currentInspection.id}/report`)
    }
    setSubmitting(false)
  }, [completeInspection, currentInspection, navigate])

  // ── Render ──

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
  }

  if (!activeTemplate || !currentSection || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8">
        <AlertTriangle className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Tidak ada template</p>
        <p className="text-sm">Gagal memuat template inspeksi. Periksa koneksi Anda.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header: progress ── */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/equipment')} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-zinc-400">
            {answeredCount}/{totalQuestions} terjawab
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
          {sections.map((sec, si) => (
            <button
              key={sec.id}
              onClick={() => goToQuestion(si, 0)}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                si === currentSectionIdx
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {sec.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Question area (scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            {currentSection.name} — Pertanyaan {currentQuestion.sort_order}
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            {currentQuestion.question_text}
          </h2>
          {currentQuestion.hint_text && (
            <p className="text-sm text-zinc-500 mt-2 italic">{currentQuestion.hint_text}</p>
          )}
        </div>

        {/* ── Answer area ── */}
        <div className="space-y-4">
          {/* === STEP 3: OK Button === */}
          {!hasDefect && (
            <button
              onClick={handleOk}
              className="w-full py-5 px-6 rounded-2xl text-lg font-semibold transition-all text-left bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 hover:border-green-500/50 active:scale-[0.98]"
            >
              <Check className="w-6 h-6 inline mr-3" />Ya — OK (Tidak Ada Temuan)
            </button>
          )}

          {/* ── Jika sudah ada defect yang dipilih, tampilkan info ── */}
          {hasDefect && defectSeverity && (
            <div className={`px-5 py-4 rounded-2xl border ${
              defectSeverity === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : defectSeverity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4" />
                <span className="font-medium">
                  Defect: {defectSeverity === 'high' ? 'Tinggi' : defectSeverity === 'medium' ? 'Sedang' : 'Rendah'}
                </span>
                <span className="text-xs opacity-60 ml-auto">Sudah dicatat</span>
              </div>
            </div>
          )}

          {/* ── STEP 4: Finding textbox (voice transcript target / review) ── */}
          <div className="mt-2">
            <label className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> Deskripsi Temuan:
            </label>
            <div className="relative">
              <textarea
                ref={findingInputRef}
                value={findingText}
                onChange={handleFindingTextChange}
                rows={3}
                placeholder={voiceListening ? 'Mendengarkan...' : 'Gunakan tombol Voice untuk merekam temuan, atau tulis di sini...'}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none text-sm"
              />
              {/* Realtime interim overlay */}
              {voiceListening && interimText && (
                <div className="absolute bottom-3 left-4 right-4 pointer-events-none">
                  <p className="text-orange-400 text-sm animate-pulse truncate">
                    🎤 {interimText}
                  </p>
                </div>
              )}
            </div>
            {voiceListening && !interimText && (
              <p className="text-xs text-orange-500/70 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                Mendengarkan... jelaskan temuan Anda
              </p>
            )}
          </div>

          {/* ── Media Thumbnails: foto & video yang sudah diambil ── */}
          {currentQuestionMedia.length > 0 && (
            <div className="pt-1">
              <label className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <Camera className="w-3 h-3" /> Bukti yang diambil ({currentQuestionMedia.length}):
              </label>
              <div className="flex gap-2 flex-wrap">
                {currentQuestionMedia.map((m) => {
                  const url = getMediaUrl(m)
                  const isVideo = m.mime_type.startsWith('video/')
                  return (
                    <div key={m.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0">
                      {url && !isVideo ? (
                        <img
                          src={url}
                          alt="Foto temuan"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).style.display = 'none'
                            ;(e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center')
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isVideo ? (
                            <Film className="w-7 h-7 text-purple-400" />
                          ) : (
                            <ImageIcon className="w-7 h-7 text-zinc-500" />
                          )}
                        </div>
                      )}
                      {uploadingMedia && m === currentQuestionMedia[currentQuestionMedia.length - 1] && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 5: Media capture buttons (Video, Voice, Photo) ── */}
          <div className="pt-2">
            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
              <Camera className="w-3 h-3" /> Ambil bukti visual / suara:
            </p>
            <div className="flex gap-3">
              {/* Video Button */}
              <button
                onClick={handleVideo}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border text-sm bg-purple-900/30 text-purple-300 border-purple-500/40 hover:bg-purple-800/40 hover:border-purple-400/60 active:scale-[0.97]"
                title="Rekam Video"
              >
                <Video className="w-5 h-5" />
                <span>Video</span>
              </button>

              {/* Voice Button */}
              <button
                onClick={handleVoice}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border text-sm ${
                  voiceListening
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/40 scale-105'
                    : 'bg-orange-900/30 text-orange-300 border-orange-500/40 hover:bg-orange-800/40 hover:border-orange-400/60 active:scale-[0.97]'
                }`}
                title={voiceListening ? 'Berhenti merekam' : 'Rekam suara'}
              >
                {voiceListening ? (
                  <>
                    <Square className="w-5 h-5" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Voice</span>
                  </>
                )}
              </button>

              {/* Photo Button */}
              <button
                onClick={handlePhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border text-sm bg-sky-900/30 text-sky-300 border-sky-500/40 hover:bg-sky-800/40 hover:border-sky-400/60 active:scale-[0.97]"
                title="Ambil Foto"
              >
                <Camera className="w-5 h-5" />
                <span>Photo</span>
              </button>
            </div>
          </div>

          {/* ── STEP 6: Defect level selection buttons ── */}
          <div className="pt-2">
            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
              <Flag className="w-3 h-3" /> Pilih tingkat kerusakan (otomatis lanjut ke pertanyaan berikutnya):
            </p>
            <div className="flex gap-2">
              {DEFECT_LEVELS.map((level) => {
                const isActive = selectedDefect === level.key
                return (
                  <button
                    key={level.key}
                    onClick={() => handleDefectSelect(level.key)}
                    disabled={hasDefect}
                    className={`flex-1 py-3.5 px-3 rounded-xl text-sm font-semibold transition-all border text-center ${
                      isActive
                        ? level.activeClass
                        : hasDefect
                          ? 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50 cursor-not-allowed'
                          : level.key === 'low'
                            ? 'bg-zinc-800 text-blue-400 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/50'
                            : level.key === 'medium'
                              ? 'bg-zinc-800 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/15 hover:border-yellow-500/50'
                              : 'bg-zinc-800 text-red-400 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50'
                    }`}
                  >
                    {level.label}
                  </button>
                )
              })}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* ═══ Bottom navigation bar ═══ */}
      <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            {/* Prev */}
            <button
              onClick={() => {
                if (currentQuestionIdx > 0) setCurrentQuestionIdx(i => i - 1)
                else if (currentSectionIdx > 0) {
                  setCurrentSectionIdx(i => i - 1)
                  setCurrentQuestionIdx(sections[currentSectionIdx - 1]?.questions.length - 1 || 0)
                }
              }}
              disabled={currentSectionIdx === 0 && currentQuestionIdx === 0}
              className="flex items-center justify-center gap-1 px-3 py-2.5 text-zinc-400 hover:text-white disabled:opacity-30 text-sm rounded-lg hover:bg-zinc-800 transition-colors min-w-[64px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Next / Submit */}
            {answeredCount >= totalQuestions ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-w-[64px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Kirim</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (currentQuestionIdx < currentSection.questions.length - 1)
                    setCurrentQuestionIdx(i => i + 1)
                  else if (currentSectionIdx < sections.length - 1) {
                    setCurrentSectionIdx(i => i + 1)
                    setCurrentQuestionIdx(0)
                  }
                }}
                className="flex items-center justify-center gap-1 px-3 py-2.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm min-w-[64px]"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}