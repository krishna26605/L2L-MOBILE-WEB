import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket && typeof window !== 'undefined') {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling']
    });
  }
  return socket;
};

export const connectSocket = (userId) => {
  const s = getSocket();
  if (s && !s.connected) {
    s.connect();
    s.emit('register', userId);
    console.log('🔌 Socket connected and registered for user:', userId);
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    console.log('🔌 Socket disconnected');
  }
};

export default { getSocket, connectSocket, disconnectSocket };
