// ═══════════════════════════════════════════════════════
// B3: Socket.io — Real-time Communication Layer
// ═══════════════════════════════════════════════════════

import { Server as SocketIOServer } from 'socket.io'
import { Server as HttpServer } from 'http'

let io: SocketIOServer | null = null

/**
 * Initialize Socket.io on the HTTP server.
 * Sets up room-based channels for managers, employees, and clients.
 */
export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] ✅ Connected: ${socket.id}`)

    // ── Room Joins ──────────────────────────────────────
    socket.on('join:manager', (managerId: string) => {
      socket.join(`manager_${managerId}`)
      console.log(`[Socket] Manager ${managerId} joined room`)
    })

    socket.on('join:employee', (employeeId: string) => {
      socket.join(`employee_${employeeId}`)
      console.log(`[Socket] Employee ${employeeId} joined room`)
    })

    socket.on('join:client', (clientId: string) => {
      socket.join(`client_${clientId}`)
      console.log(`[Socket] Client ${clientId} joined room`)
    })

    // ── Disconnect ──────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ❌ Disconnected: ${socket.id} (${reason})`)
    })

    socket.on('error', (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err)
    })
  })

  console.log('[Socket] ✅ Socket.io initialized')
  return io
}

/**
 * Get the Socket.io server instance.
 * Throws if called before initSocket().
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('[Socket] Socket.io not initialized — call initSocket() first')
  }
  return io
}

/**
 * Emit an event to a specific manager's room.
 * Silently catches errors (non-critical path).
 */
export const emitToManager = (
  managerId: string,
  event: string,
  data: unknown
): void => {
  try {
    getIO().to(`manager_${managerId}`).emit(event, data)
  } catch (e) {
    console.error('[Socket] emitToManager failed:', e)
  }
}

/**
 * Emit an event to a specific employee's room.
 */
export const emitToEmployee = (
  employeeId: string,
  event: string,
  data: unknown
): void => {
  try {
    getIO().to(`employee_${employeeId}`).emit(event, data)
  } catch (e) {
    console.error('[Socket] emitToEmployee failed:', e)
  }
}

/**
 * Emit an event to a specific client's room.
 */
export const emitToClient = (
  clientId: string,
  event: string,
  data: unknown
): void => {
  try {
    getIO().to(`client_${clientId}`).emit(event, data)
  } catch (e) {
    console.error('[Socket] emitToClient failed:', e)
  }
}

/**
 * Broadcast an event to all connected sockets.
 */
export const emitToAll = (event: string, data: unknown): void => {
  try {
    getIO().emit(event, data)
  } catch (e) {
    console.error('[Socket] emitToAll failed:', e)
  }
}
