// ─── New Inspection Page ─────────────────────────────────
// The 60-question checklist with section navigation, voice input,
// camera capture, defect flagging, and submission.
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Check, Flag, Camera, Mic,
  Square, AlertTriangle, Send, Loader2, X, Image,
} from 'lucide-react'
import { useInspectionStore } from '../stores/inspectionStore'
import { useDebugStore } from '../stores/debugStore'
import { severityColor, statusColor } from '../lib/utils'
import type { TemplateSection, TemplateQuestion, DefectSeverity, InspectionAnswer } from '../lib/types'

export function NewInspectionPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>()
  const navigate = useNavigate()
  const debug = useDebugStore((s) => s.add)

  const {
    activeTemplate, currentInspection, inspectionAnswers,
    startInspection, saveAnswer, completeInspection, loadTemplate,
  } = useInspectionStore()

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [voiceListening, setVoiceListening] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagSeverity, setFlagSeverity] = useState<DefectSeverity>('medium')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const isComplete = answersSubmitable()

  function answersSubmitable() {
    if (!activeTemplate) return false
    const allRequired = activeTemplate.sections.flatMap(s =>
      s.questions.filter(q => q.required).map(q => q.id)
    )
    return allRequired.every(id => inspectionAnswers.has(id))
  }

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

  const handleAnswer = useCallback(async (value: Partial<InspectionAnswer>) => {
    if (!currentQuestion) return
    const partial: Partial<InspectionAnswer> = {
      answer_type: currentQuestion.answer_type,
      ...value,
    }
    await saveAnswer(currentQuestion.id, partial)

    // Auto-advance to next question
    const sec = sections[currentSectionIdx]
    if (currentQuestionIdx < sec.questions.length - 1) {
      setCurrentQuestionIdx(i => i + 1)
    } else if (currentSectionIdx < sections.length - 1) {
      setCurrentSectionIdx(i => i + 1)
      setCurrentQuestionIdx(0)
    }
  }, [currentQuestion, currentQuestionIdx, currentSectionIdx, sections, saveAnswer])

  const handleFlag = useCallback(async () => {
    if (!currentQuestion) return
    await saveAnswer(currentQuestion.id, { flagged: true, severity: flagSeverity } as any)
    setShowFlagModal(false)
    debug('info', `Flagged question ${currentQuestion.sort_order} as ${flagSeverity}`)
  }, [currentQuestion, flagSeverity, saveAnswer, debug])

  const handleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { debug('error', 'Voice not supported'); return }
    if (voiceListening) { recognitionRef.current?.stop(); setVoiceListening(false); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'id-ID'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript
      }
      if (final && currentQuestion) {
        handleAnswer({ text_value: final, answer_type: currentQuestion.answer_type as any } as any)
        debug('info', `Voice: "${final.slice(0, 80)}"`)
      }
    }
    recognition.onend = () => setVoiceListening(false)
    recognition.start()
    setVoiceListening(true)
  }, [voiceListening, currentQuestion, handleAnswer, debug])

  const handlePhoto = useCallback(async () => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentInspection || !currentQuestion) return
    const uploadMedia = useInspectionStore.getState().uploadMedia
    await uploadMedia(file, currentInspection.id, currentQuestion.id)
    debug('info', `Photo captured: ${file.name}`)
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

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
  }

  if (!activeTemplate || !currentSection || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-8">
        <ClipboardCheck className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No template loaded</p>
        <p className="text-sm">Could not load inspection template. Check your connection.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Progress bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate('/equipment')} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-zinc-400">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
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

      {/* Question area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            {currentSection.name} — Question {currentQuestion.sort_order}
          </p>
          <h2 className="text-xl md:text-2xl font-semibold text-white">
            {currentQuestion.question_text}
          </h2>
          {currentQuestion.hint_text && (
            <p className="text-sm text-zinc-500 mt-2 italic">{currentQuestion.hint_text}</p>
          )}
        </div>

        {/* Answer controls */}
        <div className="space-y-4">
          {/* Boolean */}
          {currentQuestion.answer_type === 'boolean' && (
            <div className="flex gap-3">
              <button
                onClick={() => handleAnswer({ boolean_value: true } as any)}
                className={`flex-1 py-4 px-6 rounded-xl text-lg font-medium transition-all ${
                  answer?.boolean_value === true
                    ? 'bg-green-600 text-white ring-2 ring-green-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <Check className="w-5 h-5 inline mr-2" />Yes — OK
              </button>
              <button
                onClick={() => handleAnswer({ boolean_value: false } as any)}
                className={`flex-1 py-4 px-6 rounded-xl text-lg font-medium transition-all ${
                  answer?.boolean_value === false
                    ? 'bg-red-600 text-white ring-2 ring-red-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <X className="w-5 h-5 inline mr-2" />No — Issue
              </button>
            </div>
          )}

          {/* Numeric */}
          {currentQuestion.answer_type === 'numeric' && (
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                defaultValue={answer?.numeric_value ?? ''}
                onChange={(e) => handleAnswer({ numeric_value: parseFloat(e.target.value) || 0 } as any)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="Enter value..."
              />
              {currentQuestion.hint_text && (
                <span className="text-zinc-500 text-sm">{currentQuestion.hint_text}</span>
              )}
            </div>
          )}

          {/* Text */}
          {currentQuestion.answer_type === 'text' && (
            <textarea
              defaultValue={answer?.text_value ?? ''}
              onChange={(e) => handleAnswer({ text_value: e.target.value } as any)}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 resize-none"
              placeholder="Type your answer..."
            />
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-4">
            {currentQuestion.answer_type !== 'boolean' && (
              <button
                onClick={() => handleAnswer({ text_value: 'OK' } as any)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg text-sm hover:bg-green-600/30 transition-colors"
              >
                <Check className="w-4 h-4" /> Mark OK
              </button>
            )}

            <button
              onClick={() => {
                const sev = answer?.severity || 'medium'
                setFlagSeverity(sev as DefectSeverity)
                setShowFlagModal(true)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                answer?.flagged
                  ? 'bg-red-600/20 text-red-400'
                  : 'bg-zinc-800 text-zinc-400 hover:text-yellow-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {answer?.flagged ? `Flagged (${answer.severity})` : 'Flag Issue'}
            </button>

            <button
              onClick={handleVoice}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                voiceListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {voiceListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {voiceListening ? 'Stop' : 'Voice Note'}
            </button>

            <button
              onClick={handlePhoto}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              <Camera className="w-4 h-4" /> Photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Flag modal */}
          {showFlagModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 rounded-xl p-6 max-w-sm w-full border border-zinc-700">
                <h3 className="text-lg font-semibold text-white mb-4">Flag Issue Severity</h3>
                <div className="space-y-2">
                  {(['low', 'medium', 'high', 'critical'] as DefectSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setFlagSeverity(sev)}
                      className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-colors border ${
                        flagSeverity === sev
                          ? severityColor(sev) + ' border-current'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setShowFlagModal(false)} className="flex-1 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm">Cancel</button>
                  <button onClick={handleFlag} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Flag Issue</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (currentQuestionIdx > 0) setCurrentQuestionIdx(i => i - 1)
              else if (currentSectionIdx > 0) {
                setCurrentSectionIdx(i => i - 1)
                setCurrentQuestionIdx(sections[currentSectionIdx - 1]?.questions.length - 1 || 0)
              }
            }}
            disabled={currentSectionIdx === 0 && currentQuestionIdx === 0}
            className="flex items-center gap-1 px-3 py-2 text-zinc-400 hover:text-white disabled:opacity-30 text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <span className="text-xs text-zinc-600">
            Q{currentQuestion.sort_order}/{sections[currentSectionIdx]?.questions.length}
            {' · '}
            {currentSection.name}
          </span>

          {answeredCount >= totalQuestions ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit
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
              className="flex items-center gap-1 px-3 py-2 text-zinc-400 hover:text-white text-sm"
            >
              Skip <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { ClipboardCheck } from 'lucide-react'