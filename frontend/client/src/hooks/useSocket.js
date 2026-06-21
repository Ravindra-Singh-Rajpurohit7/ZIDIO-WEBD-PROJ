import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;

/**
 * Custom hook to initialize and manage a single Socket.io connection.
 * Connects on mount, disconnects on unmount.
 */
export const useSocket = (autoConnect = true) => {
  const socketRef = useRef(null);

  if (!socketRef.current && autoConnect) {
    socketRef.current = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
    });
  }

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
};
