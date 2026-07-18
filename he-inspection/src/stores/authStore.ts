import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { useDebugStore } from './debugStore'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  org_id: string | null
  site_id: string | null
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user
      if (sessionUser) {
        // Try to fetch inspection profile from poc_he_inspection.users table
        // Fallback: derive from auth user
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', sessionUser.email)
          .maybeSingle()

        set({
          user: profile ? {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            org_id: profile.org_id,
            site_id: profile.site_id,
          } : {
            id: sessionUser.id,
            email: sessionUser.email || '',
            name: sessionUser.email?.split('@')[0] || 'User',
            role: 'inspector',
            org_id: null,
            site_id: null,
          },
          loading: false,
          initialized: true,
        })
      } else {
        set({ user: null, loading: false, initialized: true })
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.user) {
          set({ user: null })
          return
        }
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle()

        set({
          user: profile ? {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            org_id: profile.org_id,
            site_id: profile.site_id,
          } : null,
        })
      })
    } catch (err) {
      useDebugStore.getState().add('error', 'Auth init failed', err)
      set({ loading: false, initialized: true })
    }
  },

  signUp: async (email, password, name) => {
    const debug = useDebugStore.getState()
    debug.add('info', `Signing up: ${email}`)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      debug.add('error', 'Signup failed', error.message)
      return { error: error.message }
    }
    if (name) {
      // Create inspection user record
      await supabase.from('users').insert({
        email,
        name,
        role: 'inspector',
        is_active: true,
      }).maybeSingle()
    }
    debug.add('info', 'Signup successful')
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
    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.user.email)
        .maybeSingle()

      set({
        user: profile ? {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          org_id: profile.org_id,
          site_id: profile.site_id,
        } : null,
      })
    }
    debug.add('info', `Login successful: ${email}`)
    return {}
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
    useDebugStore.getState().add('info', 'Signed out')
  },

  refreshProfile: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.user.email)
      .maybeSingle()
    if (profile) {
      set({
        user: {
          id: profile.id, email: profile.email, name: profile.name,
          role: profile.role, org_id: profile.org_id, site_id: profile.site_id,
        },
      })
    }
  },
}))