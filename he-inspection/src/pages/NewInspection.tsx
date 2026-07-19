// ─── New Inspection Page (Revised Flow) ─────────────────────
// Workflow:
//   PATH A (No defect): Read → OK → auto-next
//   PATH B (Defect):    Voice STT → Photo/Video capture → Select level
//                       → Confirm popup → Save + Upload all → auto-next
//
//   Three-dot menu (top-right): Pause / Finish at any question.
//   Last question → Submit button with confirmation.
//─────────────────────────────────────────────────────────────
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Check, Camera, Mic,
  Video, Square, AlertTriangle, Send, Loader2, X, Flag, Edit3,
  Image as ImageIcon, Film, MoreVertical, Pause, SquareCheckBig,
} from 'lucide-react'
import { useInspectionStore } from '../stores/inspectionStore'
import { supabase } from '../services/supabase'
import { useDebugStore } from '../stores/debugStore'
import { useToastStore } from '../stores/toastStore'
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
  const toast = useToastStore((s) => s.add)

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
  const [saving, setSaving] = useState(false) // true while awaiting save

  // Local media: held per-question, uploaded on confirm
  const [localMedia, setLocalMedia] = useState<InspectionMedia[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Confirmation popup state
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingLevel, setPendingLevel] = useState<DefectSeverity | null>(null)
  const [confirmSaving, setConfirmSaving] = useState(false)

  // Three-dot menu
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const findingInputRef = useRef<HTMLTextAreaElement>(null)

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  // Load template and start inspection on mount
  useEffect(() => {
    async function init() {
      if (!equipmentId) return
      await loadTemplate()
      const tpl = useInspectionStore.getState().activeTemplate
      if (tpl && !currentInspection) {
        const insId = await startInspection(equipmentId, tpl.id)
        if (!insId) {
          toast({ type: 'error', message: 'Gagal memulai inspeksi. Coba lagi.' })
        }
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

  // Finding text from store (for edit)
  const storeText = currentQuestion ? inspectionAnswers.get(currentQuestion.id)?.text_value ?? '' : ''
  const findingText = voiceTranscript || storeText

  // Whether a defect is already saved for this question
  const hasDefect = answer?.flagged === true
  const defectSeverity = answer?.severity ?? null

  // ─── Get public URL from Supabase storage ──────────────
  const getMediaUrl = useCallback((m: InspectionMedia): string => {
    const { data } = supabase.storage.from('poc-he-inspection').getPublicUrl(m.file_path)
    return data?.publicUrl || ''
  }, [])

  // ─── Merge store media + local media for thumbnails ────
  const currentQuestionMedia: InspectionMedia[] = React.useMemo(() => {
    const qId = currentQuestion?.id
    if (!qId) return localMedia
    const fromStore = inspectionMedia.filter((m) => m.answer_id === answer?.id)
    const seen = new Set<string>()
    const merged: InspectionMedia[] = []
    for (const m of [...fromStore, ...localMedia]) {
      if (!seen.has(m.file_path)) { seen.add(m.file_path); merged.push(m) }
    }
    return merged
  }, [inspectionMedia, localMedia, answer?.id, currentQuestion?.id])

  // ─── Reset per-question state ─────────────────────────
  useEffect(() => {
    setLocalMedia([])
    setVoiceTranscript('')
    setInterimText('')
    setSelectedDefect(null)
    setShowConfirm(false)
    setPendingLevel(null)
    setConfirmSaving(false)
    setSaving(false)
    if (!answer?.flagged) {
      // restore saved severity if already flagged
    } else if (answer?.severity) {
      setSelectedDefect(answer.severity as DefectSeverity)
    }
  }, [currentQuestion?.id])

  // Sync textarea with store value on question change
  useEffect(() => {
    setVoiceTranscript(storeText)
  }, [currentQuestion?.id])

  const goToQuestion = useCallback((sectionIdx: number, questionIdx: number) => {
    if (sectionIdx >= 0 && sectionIdx < sections.length) {
      setCurrentSectionIdx(sectionIdx)
      const sec = sections[sectionIdx]
      if (questionIdx >= 0 && questionIdx < sec.questions.length) {
        setCurrentQuestionIdx(questionIdx)
      } else { setCurrentQuestionIdx(0) }
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

  // ── PATH A: OK — no finding ────────────────────────────
  const handleOk = useCallback(async () => {
    if (!currentQuestion) return
    setSaving(true)
    try {
      await saveAnswer(currentQuestion.id, {
        answer_type: 'boolean',
        boolean_value: true,
        text_value: null,
        flagged: false,
        severity: null,
      } as any)
      debug('info', `OK — no finding on Q${currentQuestion.sort_order}`)
      advanceToNext()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan'
      toast({ type: 'error', message: `Gagal menyimpan: ${msg}`, action: { label: 'Coba lagi', onClick: handleOk } })
    } finally {
      setSaving(false)
    }
  }, [currentQuestion, saveAnswer, advanceToNext, debug, toast])

  // ── PATH B Step C-D: select defect level → show confirm ─
  const handleDefectSelect = useCallback(async (level: DefectSeverity) => {
    if (!currentQuestion || hasDefect) return
    setPendingLevel(level)
    setShowConfirm(true)
  }, [currentQuestion, hasDefect])

  // ── PATH B Step D: Confirm → Save + Upload + Advance ────
  const handleConfirmDefect = useCallback(async () => {
    if (!currentQuestion || !currentInspection || !pendingLevel) return
    setConfirmSaving(true)
    const finding = findingInputRef.current?.value || ''
    try {
      // 1. Save answer — AWAITED, get answer ID
      debug('info', `Saving defect: ${pendingLevel} on Q${currentQuestion.sort_order}`)
      const answerId = await saveAnswer(currentQuestion.id, {
        answer_type: 'boolean',
        boolean_value: false,
        flagged: true,
        severity: pendingLevel,
        text_value: finding,
      } as any)
      if (!answerId) throw new Error('Gagal menyimpan jawaban')

      // 2. Upload all local media to storage with answer_id
      if (localMedia.length > 0) {
        for (const mediaItem of localMedia) {
          // Reconstruct file from localMedia metadata
          // File is already uploaded immediately on capture — we just need to UPDATE answer_id
          const { error: updateErr } = await supabase
            .from('inspection_media')
            .update({ answer_id: answerId })
            .eq('id', mediaItem.id)
          if (updateErr) {
            debug('error', `Failed to link media ${mediaItem.id} to answer`, updateErr)
          }
        }
        // Reload inspection media to refresh store
        await useInspectionStore.getState().loadInspection(currentInspection.id)
      }

      toast({ type: 'success', message: 'Temuan tersimpan' })
      debug('info', `Defect ${pendingLevel} saved on Q${currentQuestion.sort_order}`)
      setShowConfirm(false)
      setPendingLevel(null)
      setSelectedDefect(pendingLevel)
      setLocalMedia([])
      advanceToNext()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan temuan'
      toast({ type: 'error', message: msg, action: { label: 'Coba lagi', onClick: handleConfirmDefect } })
    } finally {
      setConfirmSaving(false)
    }
  }, [currentQuestion, currentInspection, pendingLevel, localMedia, saveAnswer, advanceToNext, debug, toast])

  // ── Voice STT ───────────────────────────────────────────
  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    setVoiceListening(false)
    setInterimText('')
  }, [])

  const handleVoice = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) { toast({ type: 'error', message: 'Voice tidak didukung di browser ini' }); return }
    if (voiceListening) { stopListening(); return }

    const recognition = new SpeechRecognitionAPI()
    recognitionRef.current = recognition
    recognition.lang = 'id-ID'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const allFinals: string[] = []
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) {
          const t = r[0].transcript.trim()
          if (t) allFinals.push(t)
        } else { interim += r[0].transcript }
      }
      setInterimText(interim)
      if (allFinals.length > 0 && currentQuestion) {
        const latestFinal = allFinals[allFinals.length - 1]
        setVoiceTranscript(latestFinal)
        // Fire-and-forget background save for transcript
        saveAnswer(currentQuestion.id, {
          answer_type: currentQuestion.answer_type as any,
          text_value: latestFinal,
        } as any).catch(() => {})
        debug('info', `Voice transcript: "${latestFinal.slice(0, 80)}"`)
      }
    }

    recognition.onerror = (event: any) => {
      debug('error', `Voice error: ${event.error}`)
      setVoiceListening(false)
      setInterimText('')
    }
    recognition.onend = () => {
      setVoiceListening(false)
      setInterimText('')
    }

    recognition.start()
    setVoiceListening(true)
    setInterimText('')
    setVoiceTranscript('')
  }, [voiceListening, currentQuestion, debug, stopListening, saveAnswer, toast])

  // Cleanup on unmount
  useEffect(() => {
    return () => { try { recognitionRef.current?.abort() } catch { /* ignore */ } }
  }, [])

  const handleFindingTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setVoiceTranscript(val)
    if (currentQuestion) {
      saveAnswer(currentQuestion.id, {
        text_value: val,
        answer_type: currentQuestion.answer_type as any,
      } as any).catch(() => {})
    }
  }, [currentQuestion, saveAnswer])

  // ── Photo / Video capture ──────────────────────────────
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
    try {
      const uploadMedia = useInspectionStore.getState().uploadMedia
      const mediaId = await uploadMedia(file, currentInspection.id, null) // No answer_id yet
      if (mediaId) {
        const localEntry: InspectionMedia = {
          id: mediaId,
          inspection_id: currentInspection.id,
          answer_id: null,
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
        debug('info', `Media captured: ${file.name}`)
      }
    } catch {
      toast({ type: 'error', message: 'Gagal mengunggah media' })
    }
    setUploadingMedia(false)
    e.target.value = ''
  }, [currentInspection, currentQuestion, debug, toast])

  // ── ⋮ Menu: Pause ─────────────────────────────────────
  const handlePause = useCallback(() => {
    setShowMenu(false)
    toast({ type: 'info', message: 'Inspeksi dijeda. Anda bisa melanjutkan nanti.' })
    navigate(`/equipment/${equipmentId}`)
  }, [navigate, equipmentId, toast])

  // ── ⋮ Menu: Finish ────────────────────────────────────
  const handleFinishFromMenu = useCallback(async () => {
    setShowMenu(false)
    setSubmitting(true)
    try {
      await completeInspection()
      toast({ type: 'success', message: 'Inspeksi selesai' })
      if (currentInspection) {
        navigate(`/inspections/${currentInspection.id}/report`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan inspeksi'
      toast({ type: 'error', message: msg })
    }
    setSubmitting(false)
  }, [completeInspection, currentInspection, navigate, toast])

  // ── Submit (last question) ─────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      await completeInspection()
      toast({ type: 'success', message: 'Inspeksi selesai!' })
      if (currentInspection) {
        navigate(`/inspections/${currentInspection.id}/report`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyelesaikan inspeksi'
      toast({ type: 'error', message: msg, action: { label: 'Coba lagi', onClick: handleSubmit } })
    }
    setSubmitting(false)
  }, [completeInspection, currentInspection, navigate, toast])

  const isLastQuestion = answeredCount >= totalQuestions

  // ── Render states ──────────────────────────────────────
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

  // ── Main render ────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* ═══ HEADER: Progress + 3-dot menu ═══ */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(`/equipment/${equipmentId}`)} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-zinc-400">
            {answeredCount}/{totalQuestions} terjawab
          </span>
          {/* Three-dot Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl py-1 min-w-[180px] z-50">
                <button
                  onClick={handlePause}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  <Pause className="w-4 h-4 text-blue-400" />
                  ⏸️ Jeda Inspeksi
                </button>
                <button
                  onClick={handleFinishFromMenu}
                  disabled={submitting}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  ) : (
                    <SquareCheckBig className="w-4 h-4 text-orange-400" />
                  )}
                  ⏹️ Selesaikan Inspeksi
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
        {/* Section tabs */}
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

      {/* ═══ QUESTION AREA (scrollable) ═══ */}
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

        <div className="space-y-4">
          {/* ═══ PATH A: OK Button (visible when no defect flagged) ═══ */}
          {!hasDefect && (
            <button
              onClick={handleOk}
              disabled={saving}
              className="w-full py-5 px-6 rounded-2xl text-lg font-semibold transition-all text-left bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 hover:border-green-500/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="w-6 h-6 animate-spin inline mr-3" />
              ) : (
                <Check className="w-6 h-6 inline mr-3" />
              )}
              Ya — OK (Tidak Ada Temuan)
            </button>
          )}

          {/* ═══ PATH B Steps ═══ */}

          {/* Step indicator */}
          {hasDefect && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" />
                <span className="font-medium text-red-300">
                  Defect: {defectSeverity === 'high' ? 'Tinggi' : defectSeverity === 'medium' ? 'Sedang' : 'Rendah'}
                </span>
                <span className="text-xs text-red-400/60 ml-auto">Sudah dicatat</span>
              </div>
            </div>
          )}

          {/* B1: Media Capture Buttons (always visible for defects) */}
          <div className="pt-2">
            <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
              <Camera className="w-3 h-3" /> Ambil bukti visual / suara:
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleVideo}
                disabled={hasDefect}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border text-sm bg-purple-900/30 text-purple-300 border-purple-500/40 hover:bg-purple-800/40 hover:border-purple-400/60 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Rekam Video"
              >
                <Video className="w-5 h-5" />
                <span>Video</span>
              </button>
              <button
                onClick={handleVoice}
                disabled={hasDefect}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                  voiceListening
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/40 scale-105'
                    : 'bg-orange-900/30 text-orange-300 border-orange-500/40 hover:bg-orange-800/40 hover:border-orange-400/60 active:scale-[0.97]'
                }`}
                title={voiceListening ? 'Berhenti merekam' : 'Rekam suara'}
              >
                {voiceListening ? (
                  <><Square className="w-5 h-5" /><span>Stop</span></>
                ) : (
                  <><Mic className="w-5 h-5" /><span>Voice</span></>
                )}
              </button>
              <button
                onClick={handlePhoto}
                disabled={hasDefect}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all border text-sm bg-sky-900/30 text-sky-300 border-sky-500/40 hover:bg-sky-800/40 hover:border-sky-400/60 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                title="Ambil Foto"
              >
                <Camera className="w-5 h-5" />
                <span>Photo</span>
              </button>
            </div>
          </div>

          {/* B2: Finding textarea (voice transcript target) */}
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
                readOnly={hasDefect}
              />
              {voiceListening && interimText && (
                <div className="absolute bottom-3 left-4 right-4 pointer-events-none">
                  <p className="text-orange-400 text-sm animate-pulse truncate">🎤 {interimText}</p>
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

          {/* B3: Media thumbnails */}
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
                        <img src={url} alt="Foto temuan" className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center') }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {isVideo ? <Film className="w-7 h-7 text-purple-400" /> : <ImageIcon className="w-7 h-7 text-zinc-500" />}
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

          {/* B4: Defect level selection (only if not already flagged) */}
          {!hasDefect && (
            <div className="pt-2">
              <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <Flag className="w-3 h-3" /> Pilih tingkat kerusakan:
              </p>
              <div className="flex gap-2">
                {DEFECT_LEVELS.map((level) => (
                  <button
                    key={level.key}
                    onClick={() => handleDefectSelect(level.key)}
                    disabled={hasDefect}
                    className={`flex-1 py-3.5 px-3 rounded-xl text-sm font-semibold transition-all border text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedDefect === level.key
                        ? level.activeClass
                        : level.key === 'low'
                          ? 'bg-zinc-800 text-blue-400 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/50'
                          : level.key === 'medium'
                            ? 'bg-zinc-800 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/15 hover:border-yellow-500/50'
                            : 'bg-zinc-800 text-red-400 border-red-500/30 hover:bg-red-500/15 hover:border-red-500/50'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* ═══ CONFIRMATION POPUP ═══ */}
      {showConfirm && pendingLevel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-400" />
              Konfirmasi Temuan
            </h3>
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2 text-sm">
              <div>
                <span className="text-zinc-500">Pertanyaan:</span>
                <p className="text-zinc-200 mt-0.5">{currentQuestion?.question_text}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Tingkat:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  pendingLevel === 'high' ? 'text-red-400 bg-red-400/10 border-red-500/30'
                    : pendingLevel === 'medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-500/30'
                    : 'text-blue-400 bg-blue-400/10 border-blue-500/30'
                }`}>
                  {pendingLevel === 'high' ? 'Tinggi' : pendingLevel === 'medium' ? 'Sedang' : 'Rendah'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500">Media:</span>
                <span className="text-zinc-300 ml-1">{localMedia.length} foto/video</span>
              </div>
              {findingText && (
                <div>
                  <span className="text-zinc-500">Catatan:</span>
                  <p className="text-zinc-300 mt-0.5 text-xs line-clamp-2">{findingText}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowConfirm(false); setPendingLevel(null) }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDefect}
                disabled={confirmSaving}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {confirmSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </span>
                ) : (
                  'Ya, Simpan'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM NAV ═══ */}
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
            {isLastQuestion ? (
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