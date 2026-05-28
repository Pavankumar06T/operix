import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import type { SafeUser } from '../types'

interface AuthState {
  user: SafeUser | null
  token: string | null
  sessionId: string | null
  setAuth: (user: SafeUser, token: string, sessionId?: string) => void
  logout: () => void
  updateUser: (data: Partial<SafeUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      sessionId: null,
      setAuth: (user, token, sessionId) => set({ user, token, sessionId }),
      logout: async () => {
        const { sessionId, token } = get()
        if (sessionId && token) {
          try {
            await api.post('/auth/logout', { sessionId })
          } catch(e) { console.error('Logout error', e) }
        }
        set({ user: null, token: null, sessionId: null })
      },
      updateUser: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    {
      name: 'operix-auth',
    }
  )
)
