import { USERS, API_BASE_URL } from './socket.js';

export class WebRTCManager {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.localStream = null;
    this.peerConnection = null;
    this.groupPeerConnections = new Map();
    this.audioEnabled = true;
    this.videoEnabled = true;
    this.isGroupCall = false;
    this.currentRoomId = null;
    this.currentCallId = null;
    this.otherUser = null;
    this.pendingWebRTCOffers = new Map();
    this.callAcceptTimeout = 30000;
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    // 1:1 Call handlers
    this.socketManager.on('call-offer', this.handleCallOffer.bind(this));
    this.socketManager.on('call-answer', this.handleCallAnswer.bind(this));
    this.socketManager.on('ice-candidate', this.handleIceCandidate.bind(this));
    this.socketManager.on('call-ended', this.handleCallEnded.bind(this));
    
    // Group call handlers
    this.socketManager.on('room-invite-notification', this.handleRoomInvite.bind(this));
    this.socketManager.on('broadcast-room-invite', this.handleBroadcastRoomInvite.bind(this));
    this.socketManager.on('webrtc-offer', this.handleWebRTCOffer.bind(this));
    this.socketManager.on('webrtc-answer', this.handleWebRTCAnswer.bind(this));
    this.socketManager.on('webrtc-ice-candidate', this.handleWebRTCIceCandidate.bind(this));
    this.socketManager.on('webrtc-ready', this.handleWebRTCReady.bind(this));
    this.socketManager.on('room-join-accepted', this.handleRoomJoinAccepted.bind(this));
    this.socketManager.on('room-participant-left', this.handleRoomParticipantLeft.bind(this));
  }

  async initMedia(withVideo = true) {
    try {
      console.log(`Initializing media (video: ${withVideo})`);
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: withVideo, 
        audio: true 
      });
      
      this.socketManager.emit('debug', `Media initialized with ${this.localStream.getTracks().length} tracks`);
      return true;
    } catch (error) {
      console.error(`Media error: ${error.message}`);
      this.socketManager.emit('error', `Media error: ${error.message}`);
      return false;
    }
  }

  async initWebRTC() {
    if (this.peerConnection) {
      console.log('Closing existing peer connection');
      this.peerConnection.close();
    }
    
    try {
      console.log('Initializing WebRTC');
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      });

      if (this.localStream) {
        console.log('Adding local stream tracks to peer connection');
        this.localStream.getTracks().forEach((track) => {
          console.log(`Adding ${track.kind} track: ${track.id}`);
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Sending ICE candidate: ${event.candidate.candidate}`);
          this.socketManager.socketEmit('ice-candidate', {
            callId: this.currentCallId,
            targetId: USERS[this.otherUser]?.id,
            candidate: event.candidate,
            senderId: USERS[this.socketManager.currentUser].id
          });
        } else {
          console.log('ICE gathering completed');
        }
      };

      this.peerConnection.ontrack = (event) => {
        console.log(`Received ${event.track.kind} track: ${event.track.id}`);
        if (event.streams && event.streams[0]) {
          console.log('Setting remote video stream');
          this.socketManager.emit('remote-stream', event.streams[0]);
          this.socketManager.emit('success', `Remote ${event.track.kind} connected`);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state: ${this.peerConnection.connectionState}`);
        if (this.peerConnection.connectionState === 'connected') {
          this.socketManager.emit('success', 'Peer connection established');
        } else if (this.peerConnection.connectionState === 'failed') {
          this.socketManager.emit('error', 'Connection failed');
          this.cleanupCall();
        }
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state: ${this.peerConnection.iceConnectionState}`);
      };

      console.log('WebRTC initialized successfully');
    } catch (error) {
      console.error(`WebRTC error: ${error.message}`);
      throw error;
    }
  }

  async handleCallOffer(data) {
    const { callId, callerId, offer, callType = 'video' } = Array.isArray(data) ? data[0] : data;
    console.log(`Call offer received: ${callId} from ${callerId}`);
    
    this.currentCallId = callId;
    this.otherUser = Object.keys(USERS).find(user => USERS[user].id === callerId);

    this.socketManager.emit('incoming-call', { 
      callId, 
      caller: this.otherUser, 
      callType 
    });

    setTimeout(() => {
      if (this.currentCallId === callId) {
        console.log(`Call ${callId} timed out`);
        this.socketManager.emit('call-timeout', callId);
        this.cleanupCall();
      }
    }, this.callAcceptTimeout);

    try {
      if (!(await this.initMedia(callType === 'video'))) {
        throw new Error('Failed to initialize media');
      }
      
      await this.initWebRTC();
      
      console.log('Setting remote offer description');
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      if (this.peerConnection.pendingCandidates) {
        console.log(`Processing ${this.peerConnection.pendingCandidates.length} queued ICE candidates`);
        for (const candidate of this.peerConnection.pendingCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('Queued ICE candidate added successfully');
          } catch (err) {
            console.log(`Error adding queued ICE candidate: ${err.message}`);
          }
        }
        this.peerConnection.pendingCandidates = [];
      }
      
      console.log('Creating answer');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('Ready to accept call - offer processed successfully');
      
    } catch (error) {
      console.error(`Error handling offer: ${error.message}`);
      this.socketManager.emit('error', `Error processing call: ${error.message}`);
      this.cleanupCall();
    }
  }

  async startCall(targetUser, callType = 'video') {
    if (!targetUser) {
      this.socketManager.emit('error', 'Please select a user to call');
      return;
    }
    if (this.currentCallId) {
      this.socketManager.emit('error', 'A call is already in progress');
      return;
    }

    try {
      console.log(`Starting ${callType} call to ${targetUser}`);
      const response = await fetch(`${API_BASE_URL}/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${USERS[this.socketManager.currentUser].token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId: USERS[targetUser].id,
          callType,
          settings: { video: callType === 'video', audio: true }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to start call');

      this.currentCallId = data.data.callId;
      this.otherUser = targetUser;
      
      this.socketManager.emit('call-started', { 
        callId: this.currentCallId, 
        callType,
        status: 'Calling...' 
      });

      if (!(await this.initMedia(callType === 'video'))) {
        throw new Error('Failed to initialize media');
      }

      await this.initWebRTC();
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socketManager.socketEmit('call-offer', {
        callId: this.currentCallId,
        targetId: USERS[targetUser].id,
        offer,
        callerId: USERS[this.socketManager.currentUser].id,
        callType
      });

      this.socketManager.emit('success', `${callType} calling ${targetUser}...`);
    } catch (error) {
      console.error(`Error starting call: ${error.message}`);
      this.socketManager.emit('error', `Error: ${error.message}`);
      this.cleanupCall();
    }
  }

  async acceptCall() {
    if (!this.currentCallId || !this.peerConnection) {
      this.socketManager.emit('error', 'Cannot accept call: WebRTC not ready');
      return;
    }

    try {
      console.log(`Accepting call ${this.currentCallId}`);
      
      const answer = this.peerConnection.localDescription;
      if (!answer || answer.type !== 'answer') {
        console.log('No local answer found, creating new one');
        const newAnswer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(newAnswer);
      }

      this.socketManager.socketEmit('call-answer', {
        callId: this.currentCallId,
        targetId: USERS[this.otherUser].id,
        answer: { 
          type: this.peerConnection.localDescription.type, 
          sdp: this.peerConnection.localDescription.sdp 
        },
        receiverId: USERS[this.socketManager.currentUser].id
      });

      console.log('Answer sent via socket');
      this.socketManager.emit('call-accepted');
      this.socketManager.emit('success', 'Call accepted');
    } catch (error) {
      console.error(`Error accepting call: ${error.message}`);
      this.socketManager.emit('error', `Error: ${error.message}`);
    }
  }

  async endCall() {
    if (this.isGroupCall) {
      await this.leaveGroupRoom();
      return;
    }
    
    if (!this.currentCallId) {
      this.socketManager.emit('error', 'No active call');
      return;
    }

    try {
      console.log(`Ending call ${this.currentCallId}`);
      this.socketManager.socketEmit('call-end', { 
        callId: this.currentCallId, 
        targetId: USERS[this.otherUser]?.id 
      });
      this.socketManager.emit('success', 'Call ended');
      this.cleanupCall();
    } catch (error) {
      console.error(`Error ending call: ${error.message}`);
      this.socketManager.emit('error', `Error: ${error.message}`);
      this.cleanupCall();
    }
  }

  cleanupCall() {
    if (this.isGroupCall) {
      this.cleanupGroupCall();
      return;
    }
    
    console.log('Starting 1:1 call cleanup');
    
    this.currentCallId = null;
    this.otherUser = null;
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.socketManager.emit('call-cleanup');
    console.log('1:1 call cleanup completed');
  }

  async toggleAudio() {
    if (!this.localStream) return;
    this.audioEnabled = !this.audioEnabled;
    this.localStream.getAudioTracks().forEach(track => track.enabled = this.audioEnabled);
    console.log(`Audio ${this.audioEnabled ? 'enabled' : 'disabled'}`);
    this.socketManager.emit('audio-toggled', this.audioEnabled);
  }

  async toggleVideo() {
    if (!this.localStream) return;
    this.videoEnabled = !this.videoEnabled;
    this.localStream.getVideoTracks().forEach(track => track.enabled = this.videoEnabled);
    console.log(`Video ${this.videoEnabled ? 'enabled' : 'disabled'}`);
    this.socketManager.emit('video-toggled', this.videoEnabled);
  }

  // Simplified group call handlers
  handleRoomInvite(data) {
    console.log(`Room invite notification received:`, data);
    if (data.targetId === USERS[this.socketManager.currentUser].id) {
      this.currentRoomId = data.roomId;
      this.isGroupCall = true;
      this.socketManager.emit('room-invite', data);
    }
  }

  handleBroadcastRoomInvite(data) {
    console.log(`Broadcast room invite received:`, data);
    if (data.targetId === USERS[this.socketManager.currentUser].id && 
        data.hostId !== USERS[this.socketManager.currentUser].id) {
      this.currentRoomId = data.roomId;
      this.isGroupCall = true;
      this.socketManager.emit('room-invite', data);
    }
  }

  cleanupGroupCall() {
    console.log('Starting group call cleanup');

    this.groupPeerConnections.forEach((pc, participantId) => {
      try {
        if (pc) {
          pc.close();
          console.log(`Closed peer connection for ${participantId}`);
        }
      } catch (err) {
        console.log(`Error closing peer connection for ${participantId}: ${err.message}`);
      }
    });
    this.groupPeerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log(`Stopped ${track.kind} track: ${track.id}`);
        } catch (err) {
          console.log(`Error stopping ${track.kind} track: ${err.message}`);
        }
      });
      this.localStream = null;
    }

    this.currentRoomId = null;
    this.isGroupCall = false;

    this.socketManager.emit('group-call-cleanup');
    console.log('Group call cleanup completed');
  }

  async handleCallAnswer(data) {
    // TODO: Implement call answer handling
    console.log('handleCallAnswer called', data);
  }

  async handleIceCandidate(data) {
    // TODO: Implement ICE candidate handling
    console.log('handleIceCandidate called', data);
  }

  async handleCallEnded(data) {
    // TODO: Implement call ended handling
    console.log('handleCallEnded called', data);
  }

  async handleWebRTCOffer(data) {
    // TODO: Implement WebRTC offer handling
    console.log('handleWebRTCOffer called', data);
  }

  async handleWebRTCAnswer(data) {
    // TODO: Implement WebRTC answer handling
    console.log('handleWebRTCAnswer called', data);
  }

  async handleWebRTCIceCandidate(data) {
    // TODO: Implement WebRTC ICE candidate handling
    console.log('handleWebRTCIceCandidate called', data);
  }

  async handleWebRTCReady(data) {
    // TODO: Implement WebRTC ready handling
    console.log('handleWebRTCReady called', data);
  }

  async handleRoomJoinAccepted(data) {
    // TODO: Implement room join accepted handling
    console.log('handleRoomJoinAccepted called', data);
  }

  async handleRoomParticipantLeft(data) {
    // TODO: Implement room participant left handling
    console.log('handleRoomParticipantLeft called', data);
  }

  getLocalStream() {
    return this.localStream;
  }

  getCurrentCallId() {
    return this.currentCallId;
  }

  getCurrentRoomId() {
    return this.currentRoomId;
  }

  isInGroupCall() {
    return this.isGroupCall;
  }
}

export default WebRTCManager;