// ─── Auth Store ────────────────────────────────────────────
import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { useDebugStore } from './debugStore'

export interface UserProfile {
  id: string
  email: string
  role: string
}

interface AuthState {
  user: UserProfile | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
        ? { id: data.session.user.id, email: data.session.user.email || '', role: 'authenticated' }
        : null
      set({ user, loading: false, initialized: true })
      useDebugStore.getState().add('info', `Auth initialized: ${user ? `user ${user.email}` : 'no session'}`)

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user
          ? { id: session.user.id, email: session.user.email || '', role: 'authenticated' }
          : null
        set({ user })
      })
    } catch (err) {
      useDebugStore.getState().add('error', 'Auth init failed', err)
      set({ loading: false, initialized: true })
    }
  },

  signUp: async (email, password) => {
    const debug = useDebugStore.getState()
    debug.add('info', `Signing up: ${email}`)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      debug.add('error', 'Signup failed', error.message)
      return { error: error.message }
    }
    debug.add('info', 'Signup successful (auto-confirmed)')
    return {}
  },

  signIn: async (email, password) => {
    const debug = useDebugStore.getState()
    debug.add('info', `Signing in: ${email}`)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      debug.add('error', 'Login failed', error.message)
      return { error: error.message }
    }
    const user = data.user
      ? { id: data.user.id, email: data.user.email || '', role: 'authenticated' }
      : null
    set({ user })
    debug.add('info', `Login successful: ${email}`)
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
    useDebugStore.getState().add('info', 'Signed out')
  },
}))