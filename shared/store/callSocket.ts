// Shared Call Socket
// src/store/callSocket.ts
import { useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const useCallSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io('http://localhost:3000'); // Replace with your server URL

    // Clean up on unmount
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const makeCall = (roomId: string) => {
    socketRef.current?.emit('joinRoom', roomId);
  };

  const endCall = () => {
    socketRef.current?.emit('leaveRoom');
  };

  return { makeCall, endCall };
};

export default useCallSocket;
