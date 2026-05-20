import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export function connectSocket(managerId: string): void {
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join:manager', managerId);
}

export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

export default socket;
