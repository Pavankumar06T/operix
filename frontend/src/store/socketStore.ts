import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from './authStore'
import { useAlertStore } from './alertStore'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const { user } = useAuthStore.getState()
    if (!user) return

    if (get().socket?.connected) return

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      console.log('Socket connected')
      set({ isConnected: true })

      // Join appropriate room
      if (user.role === 'manager') socket.emit('join:manager', user.id)
      else if (user.role === 'employee') socket.emit('join:employee', user.id)
      else if (user.role === 'client') socket.emit('join:client', user.id)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
      set({ isConnected: false })
    })

    // Listen for new alerts
    socket.on('alert:new', (alert) => {
      useAlertStore.getState().addAlert(alert)
    })

    set({ socket })
  },

  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },
}))
