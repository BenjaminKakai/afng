import { io } from 'socket.io-client';

// Configuration
const SERVER_IP = 'dev-api-gateway.wasaachat.com'; // Backend is deployed online
const SOCKET_URL = `wss://${SERVER_IP}:9638`;

// User credentials
export const USERS = {
  'Dev 1': {
    id: '5717c314-0ed1-4984-aa0d-4af6c961586e',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTcxN2MzMTQtMGVkMS00OTg0LWFhMGQtNGFmNmM5NjE1ODZlIiwidXNlcl90eXBlIjoiY2xpZW50Iiwicm9sZV9pZCI6ImQ1ODczOWU2LTZlMzgtNGI4My04ZTA5LWIwZDQyMmYzNmUxZiIsInNvdXJjZSI6IndlYiIsImRldmljZV9pZCI6IjUwYjY1MGQzLTRiMWItNGZjMC1iN2ZiLWY3NmJjNzJhMjJlNCIsInNlc3Npb25JZCI6ImQzMTY1YzZhLTJhYWYtNGNjOS1hOTM3LTc4NTFlMGRmZDYxOSIsImlhdCI6MTc1MTc5MjUwNSwiZXhwIjoxNzUxODM1NzA1fQ.7reMsUBiiKWvMdC1Z4SxX_VUnrj8Oi78trqbzYL26F8'
  },
  'Dev 2': {
    id: '9a105e6f-ca83-4e09-ab83-46dfdfef112e',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOWExMDVlNmYtY2E4My00ZTA5LWFiODMtNDZkZmRmZWYxMTJlIiwidXNlcl90eXBlIjoiY2xpZW50Iiwicm9zZV9pZCI6ImQ1ODczOWU2LTZlMzgtNGI4My04ZTA5LWIwZDQyMmYzNmUxZiIsInNvdXJjZSI6IndlYiIsImRldmljZV9pZCI6Ijk3ODE2NWI1LWE5NTQtNGJhNS05MDFiLTUyYjE1NmRlYjQ0OSIsInNlc3Npb25JZCI6IjZjNTFhMWRiLWY1NWYtNGY2MS05MDMzLTIxMzVmZjc4MjBiNyIsImlhdCI6MTc1MTc5MjU5NCwiZXhwIjoxNzUxODM1Nzk0fQ.3IenWrcZzm9b-iONl6zEBWF79OUFw9cLlVpGQh-VF5Q'
  },
  'Dev 3': {
    id: '4d0ee74a-1dc0-4eeb-bee5-e7a46d1cc608',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTdhZTZlMjYtNGYyMC00OTNmLTllMDAtOTNiMWJmOTdjZmNiIiwidXNlcl90eXBlIjoiY2xpZW50Iiwicm9zZV9pZCI6ImQ1ODczOWU2LTZlMzgtNGI4My04ZTA5LWIwZDQyMmYzNmUxZiIsInNvdXJjZSI6IndlYiIsImRldmljZV9pZCI6ImI4ZTQ4ZTYzLTVmOTgtNDcwYS05ZDM0LTU5NjQ2MGFmODgwZSIsInNlc3Npb25JZCI6ImU2YWQ5N2Y5LTZiYzUtNGQ4Yy1hZjdhLTcxMjJmOGNjNWIxNSIsImlhdCI6MTc1MTczNTU4MCwiZXhwIjoxNzUxNzc4NzgwfQ.pseoEBmT-CicvKnXxSbPgGA8zImS-l5HGk5YpqP4gSw'
  },
  'Dev 4': {
    id: 'd019cf14-a715-4d1d-b6b4-16c6d672874b',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTdhZTZlMjYtNGYyMC00OTNmLTllMDAtOTNiMWJmOTdjZmNiIiwidXNlcl90eXBlIjoiY2xpZW50Iiwicm9zZV9pZCI6ImQ1ODczOWU2LTZlMzgtNGI4My04ZTA5LWIwZDQyMmYzNmUxZiIsInNvdXJjZSI6IndlYiIsImRldmljZV9pZCI6ImI4ZTQ4ZTYzLTVmOTgtNDcwYS05ZDM0LTU5NjQ2MGFmODgwZSIsInNlc3Npb25JZCI6ImU2YWQ5N2Y5LTZiYzUtNGQ4Yy1hZjdhLTcxMjJmOGNjNWIxNSIsImlhdCI6MTc1MTczNTU4MCwiZXhwIjoxNzUxNzc4NzgwfQ.pseoEBmT-CicvKnXxSbPgGA8zImS-l5HGk5YpqP4gSw'
  }
};

export const API_BASE_URL = `https://${SERVER_IP}:9638/v1`;

export class SocketManager {
  constructor() {
    this.socket = null;
    this.currentUser = null;
    this.eventHandlers = new Map();
    this.joinRetryCount = 0;
    this.maxJoinRetries = 5;
  }

  init(user) {
    this.currentUser = user;
    
    this.socket = io(SOCKET_URL, {
      auth: { token: USERS[user].token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log(`Socket connected: ${this.socket.id}`);
      this.joinUserRoom();
      this.emit('debug', `Socket connected: ${this.socket.id}`);
    });

    this.socket.on('connect_error', (error) => {
      console.log(`Socket error: ${error.message}`);
      this.emit('error', `Connection error: ${error.message}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      this.emit('debug', `Socket disconnected: ${reason}`);
    });

    // Add handler for group call invite notification
    this.socket.on('room-invite-notification', (data) => {
      console.log('Received group call invite:', data);
      // Emit a local event for UI to handle
      this.emit('group-invite', data);
    });

    this.socket.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
      this.emit('debug', `Socket event received: ${event} with data: ${JSON.stringify(args)}`);
      
      if (this.eventHandlers.has(event)) {
        this.eventHandlers.get(event).forEach(handler => {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in event handler for ${event}:`, error);
          }
        });
      }
    });
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in local event handler for ${event}:`, error);
        }
      });
    }
  }

  socketEmit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  joinUserRoom() {
    if (!this.socket || !this.socket.connected) {
      this.emit('error', 'Socket not connected');
      return;
    }
    
    if (this.joinRetryCount >= this.maxJoinRetries) {
      this.emit('error', 'Failed to join room');
      return;
    }

    const roomId = `user:${USERS[this.currentUser].id}`;
    console.log(`Joining room: ${roomId}`);
    this.socket.emit('join-room', { roomId, userId: USERS[this.currentUser].id });
    // Emit user presence to backend (fix for group call invites)
    this.socket.emit('user-presence', {
      userId: USERS[this.currentUser].id,
      userName: this.currentUser,
      status: 'available'
    });
    this.joinRetryCount++;

    this.socket.once('room-joined', () => {
      this.joinRetryCount = 0;
      console.log(`Joined room: ${roomId}`);
      this.emit('debug', `Joined room: ${roomId}`);
    });

    this.socket.once('error', () => {
      setTimeout(() => this.joinUserRoom(), 1000);
    });
  }

  checkStatus() {
    console.log(`Socket connected: ${this.socket?.connected || false}`);
    console.log(`Socket ID: ${this.socket?.id || 'Not connected'}`);
    console.log(`Current user: ${this.currentUser}, ID: ${USERS[this.currentUser]?.id}`);
    
    this.emit('debug', `Socket connected: ${this.socket?.connected || false}`);
    this.emit('debug', `Socket ID: ${this.socket?.id || 'Not connected'}`);
    this.emit('debug', `Current user: ${this.currentUser}, ID: ${USERS[this.currentUser]?.id}`);
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('ping');
      this.socket.emit('test-socket-communication', {
        userId: USERS[this.currentUser].id,
        userName: this.currentUser,
        timestamp: new Date().toISOString()
      });
    } else {
      this.emit('error', 'Socket not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }
}

export default SocketManager;