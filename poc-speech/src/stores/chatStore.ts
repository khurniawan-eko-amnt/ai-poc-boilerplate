// ─── Chat Store ───────────────────────────────────────────
import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { streamChat } from '../services/ai-proxy'
import { useDebugStore } from './debugStore'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
}

interface ChatState {
  chats: { id: string; title: string; updated_at: string }[]
  messages: ChatMessage[]
  activeChatId: string | null
  isStreaming: boolean
  abortController: AbortController | null

  loadChats: () => Promise<void>
  createChat: () => Promise<string>
  loadMessages: (chatId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  abortStream: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: [],
  activeChatId: null,
  isStreaming: false,
  abortController: null,

  loadChats: async () => {
    const debug = useDebugStore.getState()
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('id, title, updated_at')
        .order('updated_at', { ascending: false })
      if (error) throw error
      set({ chats: data || [] })
      debug.add('info', `Loaded ${data?.length || 0} chats`)
    } catch (err) {
      debug.add('error', 'Failed to load chats', err)
    }
  },

  createChat: async () => {
    const debug = useDebugStore.getState()
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({ title: 'New Chat' })
        .select('id')
        .single()
      if (error) throw error
      set({ activeChatId: data.id, messages: [] })
      get().loadChats()
      debug.add('info', `Created chat: ${data.id}`)
      return data.id
    } catch (err) {
      debug.add('error', 'Failed to create chat', err)
      return ''
    }
  },

  loadMessages: async (chatId) => {
    const debug = useDebugStore.getState()
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
      if (error) throw error
      set({ activeChatId: chatId, messages: data || [] })
      debug.add('info', `Loaded ${data?.length || 0} messages`)
    } catch (err) {
      debug.add('error', 'Failed to load messages', err)
    }
  },

  sendMessage: async (content) => {
    const { activeChatId, messages } = get()
    const debug = useDebugStore.getState()
    if (!activeChatId) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      streaming: true,
    }

    set({ messages: [...messages, userMsg, assistantMsg], isStreaming: true })
    const abortController = new AbortController()
    set({ abortController })

    // Save user message to DB
    await supabase.from('messages').insert({
      chat_id: activeChatId,
      role: 'user',
      content,
    }).maybeSingle()

    // Build conversation history
    const history = [...get().messages.slice(0, -1)]
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      const fullText = await streamChat(
        { messages: [...history, { role: 'user' as const, content }] },
        (chunk) => {
          const msgs = get().messages
          const updated = msgs.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m,
          )
          set({ messages: updated })
        },
        abortController.signal,
      )

      // Save assistant response to DB
      await supabase.from('messages').insert({
        chat_id: activeChatId,
        role: 'assistant',
        content: fullText,
      }).maybeSingle()

      // Update chat title from first message
      if (messages.filter((m) => m.role === 'user').length === 0) {
        await supabase
          .from('chats')
          .update({ title: content.slice(0, 50) + (content.length > 50 ? '...' : '') })
          .eq('id', activeChatId)
        get().loadChats()
      }

      const msgs = get().messages
      set({
        messages: msgs.map((m) =>
          m.id === assistantMsg.id ? { ...m, streaming: false } : m,
        ),
        isStreaming: false,
        abortController: null,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        const msgs = get().messages
        set({
          messages: msgs.map((m) =>
            m.id === assistantMsg.id ? { ...m, streaming: false } : m,
          ),
          isStreaming: false,
          abortController: null,
        })
        return
      }
      debug.add('error', 'Chat stream failed', err)
      const msgs = get().messages
      set({
        messages: msgs.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: m.content || `Error: ${(err as Error).message}`, streaming: false }
            : m,
        ),
        isStreaming: false,
        abortController: null,
      })
    }
  },

  abortStream: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ abortController: null, isStreaming: false })
    }
  },
}))