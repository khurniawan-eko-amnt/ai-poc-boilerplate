// ─── AI Chat Page ─────────────────────────────────────────
import { useEffect, useState, useRef } from 'react'
import { Send, Plus, Trash2, Paperclip, Loader2, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useChatStore } from '../stores/chatStore'
import { VoiceButton } from '../components/VoiceButton'
import { FileUpload } from '../components/FileUpload'
import { useDebugStore } from '../stores/debugStore'

export function ChatPage() {
  const {
    chats, messages, activeChatId, isStreaming,
    loadChats, createChat, loadMessages, sendMessage, abortStream,
  } = useChatStore()
  const debug = useDebugStore((s) => s.add)
  const [input, setInput] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadChats() }, [loadChats])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [activeChatId])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    sendMessage(text)
    debug('info', `Sent: "${text.slice(0, 100)}"`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoiceResult = (text: string) => {
    setInput((prev) => prev + ' ' + text)
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Chat list sidebar */}
      <aside className="hidden sm:flex flex-col w-60 bg-zinc-900 border-r border-zinc-800">
        <div className="p-3 border-b border-zinc-800">
          <button
            onClick={() => createChat()}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => loadMessages(chat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeChatId === chat.id
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <p className="truncate">{chat.title}</p>
            </button>
          ))}
          {chats.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">No chats yet</p>
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Type a message or use voice input</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.streaming && (
                      <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1" />
                    )}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-zinc-800 p-4">
          {showUpload && (
            <div className="mb-3">
              <FileUpload onUploaded={(path) => {
                debug('info', `File uploaded: ${path}`)
                setShowUpload(false)
              }} />
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className={`p-2 rounded-lg transition-colors ${
                showUpload ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <VoiceButton onResult={handleVoiceResult} disabled={isStreaming} />

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>

            {isStreaming ? (
              <button
                onClick={abortStream}
                className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { MessageSquare } from 'lucide-react'