import { create } from 'zustand'
import { api } from '../lib/api'
import type { Alert } from '../types'

interface AlertState {
  alerts: Alert[]
  unreadCount: number
  fetchAlerts: () => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markSeen: (id: string) => Promise<void>
  markAllSeen: () => Promise<void>
  addAlert: (alert: Alert) => void
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  unreadCount: 0,

  fetchAlerts: async () => {
    try {
      const res = await api.get('/alerts?limit=50')
      if (res.data.success) {
        set({ alerts: res.data.data })
      }
    } catch (err) {
      console.error('Failed to fetch alerts', err)
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.get('/alerts/count')
      if (res.data.success) {
        set({ unreadCount: res.data.data.unreadCount })
      }
    } catch (err) {
      console.error('Failed to fetch unread count', err)
    }
  },

  markSeen: async (id: string) => {
    try {
      await api.patch(`/alerts/${id}/seen`)
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? { ...a, is_seen: true } : a)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (err) {
      console.error('Failed to mark alert as seen', err)
    }
  },

  markAllSeen: async () => {
    try {
      await api.patch('/alerts/seen-all')
      set((state) => ({
        alerts: state.alerts.map((a) => ({ ...a, is_seen: true })),
        unreadCount: 0,
      }))
    } catch (err) {
      console.error('Failed to mark all seen', err)
    }
  },

  addAlert: (alert: Alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    }))
  },
}))
