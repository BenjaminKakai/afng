import { io } from 'socket.io-client';

// Configuration
const SERVER_IP = 'dev-api-gateway.wasaachat.com'; // Backend is deployed online
const SOCKET_URL = `wss://${SERVER_IP}:9638`;

// User credentials
export const USERS = typeof window !== 'undefined' && window.USERS ? window.USERS : {
  '5717c314-0ed1-4984-aa0d-4af6c961586e': { id: '5717c314-0ed1-4984-aa0d-4af6c961586e', name: 'Dev 1', token: 'TOKEN_1' },
  '9a105e6f-ca83-4e09-ab83-46dfdfef112e': { id: '9a105e6f-ca83-4e09-ab83-46dfdfef112e', name: 'Dev 2', token: 'TOKEN_2' },
  '4d0ee74a-1dc0-4eeb-bee5-e7a46d1cc608': { id: '4d0ee74a-1dc0-4eeb-bee5-e7a46d1cc608', name: 'Dev 3', token: 'TOKEN_3' },
  'd019cf14-a715-4d1d-b6b4-16c6d672874b': { id: 'd019cf14-a715-4d1d-b6b4-16c6d672874b', name: 'Dev 4', token: 'TOKEN_4' },
};