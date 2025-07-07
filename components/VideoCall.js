'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../styles/VideoCall.module.css';
import UserSelection from './UserSelection';
import CallArea from './CallArea';
import NotificationBox from './NotificationBox';
import SocketManager from '../utils/socket';
import WebRTCManager from '../utils/webrtc';

export default function VideoCall({ currentUser: propUser, contacts: propContacts }) {
  // State management
  const [currentUser, setCurrentUser] = useState(propUser || null);
  const [contacts, setContacts] = useState(propContacts || []);
  const [showSetup, setShowSetup] = useState(!!propUser);
  const [showCallArea, setShowCallArea] = useState(false);
  const [activeTab, setActiveTab] = useState('one-on-one');
  const [callInfo, setCallInfo] = useState({ visible: false, callId: '', status: '' });
  const [error, setError] = useState('');
  const [debugLogs, setDebugLogs] = useState(['🔍 Socket logs will appear here...']);
  const [notification, setNotification] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    showAccept: false 
  });
  const [userStatus, setUserStatus] = useState('Unknown');
  const [currentRoomInfo, setCurrentRoomInfo] = useState({ 
    visible: false, 
    name: '', 
    id: '', 
    participants: 0 
  });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [acceptCallVisible, setAcceptCallVisible] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [isHeadless, setIsHeadless] = useState(false);

  // Refs for managers
  const socketManagerRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const pendingRoomInviteRef = useRef(null);

  // Initialize managers when user is selected
  useEffect(() => {
    if (!currentUser) return;

    socketManagerRef.current = new SocketManager();
    socketManagerRef.current.init(currentUser);
    webrtcManagerRef.current = new WebRTCManager(socketManagerRef.current);

    setupEventHandlers();

    // Remove direct socket listener for 'room-invite-notification'.
    // Instead, listen for 'room-invite' event from WebRTCManager/SocketManager.
    // The handler only handles UI/modal logic.
    const handleRoomInviteNotification = (data) => {
      console.log('[GroupCall] Received room-invite:', data, 'Current user:', USERS[currentUser]?.id);
      if (data.targetId === USERS[currentUser].id) {
        pendingRoomInviteRef.current = data;
        showNotificationDialog(
          '📞 Group Call Started',
          `${data.hostName} started "${data.roomName}". Click Accept to join!`,
          true
        );
      }
    };
    socketManagerRef.current.on('room-invite', handleRoomInviteNotification);

    return () => {
      if (socketManagerRef.current) {
        socketManagerRef.current.off('room-invite', handleRoomInviteNotification);
        socketManagerRef.current.disconnect();
      }
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanupCall();
      }
    };
  }, [currentUser]);

  const setupEventHandlers = () => {
    const socket = socketManagerRef.current;

    // Socket events
    socket.on('debug', addDebugLog);
    socket.on('error', showError);
    socket.on('success', showSuccess);

    // WebRTC events
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-started', handleCallStarted);
    socket.on('call-connected', handleCallConnected);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-timeout', handleCallTimeout);
    socket.on('call-cleanup', handleCallCleanup);
    socket.on('remote-stream', setRemoteStream);
    socket.on('audio-toggled', setAudioEnabled);
    socket.on('video-toggled', setVideoEnabled);
    socket.on('group-call-cleanup', handleGroupCallCleanup);

    // User presence
    socket.on('user-presence-changed', handleUserPresenceChanged);
  };

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const showError = (message) => {
    setError(`❌ ${message}`);
    setTimeout(() => setError(''), 5000);
  };

  const showSuccess = (message) => {
    setError(`✅ ${message}`);
    setTimeout(() => setError(''), 5000);
  };

  const showNotificationDialog = (title, message, showAccept = false) => {
    setNotification({ visible: true, title, message, showAccept });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleIncomingCall = ({ callId, caller, callType }) => {
    setCallInfo({ visible: true, callId, status: 'Incoming call...' });
    setAcceptCallVisible(true);
    setShowCallArea(true);
    showNotificationDialog(`Incoming ${callType} Call`, `From ${caller}`, true);
  };

  const handleCallStarted = ({ callId, callType, status }) => {
    setCallInfo({ visible: true, callId, status });
    setShowCallArea(true);
    setLocalStream(webrtcManagerRef.current.getLocalStream());
  };

  const handleCallConnected = () => {
    setCallInfo(prev => ({ ...prev, status: 'Call Connected' }));
    setAcceptCallVisible(false);
  };

  const handleCallAccepted = () => {
    setCallInfo(prev => ({ ...prev, status: 'Call Connected' }));
    setAcceptCallVisible(false);
  };

  const handleCallEnded = () => {
    showNotificationDialog('Call Ended', 'The call has ended', false);
    handleCallCleanup();
  };

  const handleCallTimeout = (callId) => {
    showNotificationDialog('Call Missed', 'You missed the call', false);
    handleCallCleanup();
  };

  const handleCallCleanup = () => {
    setCallInfo({ visible: false, callId: '', status: '' });
    setShowCallArea(false);
    setAcceptCallVisible(false);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleGroupCallCleanup = () => {
    setCurrentRoomInfo({ visible: false, name: '', id: '', participants: 0 });
    setShowCallArea(false);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleUserPresenceChanged = (data) => {
    const userData = Array.isArray(data) ? data.find(d => d.userId === USERS[currentUser].id) : data;
    if (userData) {
      setUserStatus(userData.status || 'offline');
    }
  };

  const handleUserSelect = (user) => {
    setCurrentUser(user);
    setShowSetup(true);
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      const userObj = getUserByName(user) || {};
      localStorage.setItem('wasaaCallUser', user);
      localStorage.setItem('wasaaCallUserId', userObj.id || '');
      localStorage.setItem('wasaaCallToken', userObj.token || '');
    }
  };

  const handleStartCall = async (callType = 'video') => {
    if (webrtcManagerRef.current && selectedTarget) {
      await webrtcManagerRef.current.startCall(selectedTarget, callType);
    }
  };

  const handleAcceptCall = async () => {
    hideNotification();
    
    // Check if it's a room invite
    if (pendingRoomInviteRef.current) {
      const inviteData = pendingRoomInviteRef.current;
      setCurrentRoomInfo({
        visible: true,
        name: inviteData.roomName,
        id: inviteData.roomId,
        participants: 2
      });

      // Initialize group call media
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.initMedia(true);
        setLocalStream(webrtcManagerRef.current.getLocalStream());
      }

      // Emit join events
      socketManagerRef.current.socketEmit('join-room', {
        roomId: inviteData.roomId,
        userId: USERS[currentUser].id,
        userName: currentUser
      });
      socketManagerRef.current.socketEmit('webrtc-ready', {
        roomId: inviteData.roomId,
        userId: USERS[currentUser].id,
        userName: currentUser
      });
      socketManagerRef.current.socketEmit('room-join-accepted', {
        roomId: inviteData.roomId,
        roomName: inviteData.roomName,
        userId: USERS[currentUser].id,
        userName: currentUser,
        hostId: inviteData.hostId
      });

      // Fetch current participants from backend and connect to each
      try {
        const res = await fetch(`/api/rooms/${inviteData.roomId}/participants`, {
          headers: {
            'Authorization': `Bearer ${USERS[currentUser].token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const participants = data.data?.participants || data.data || [];
          for (const peer of participants) {
            if (peer.id !== USERS[currentUser].id) {
              await webrtcManagerRef.current.connectToPeer(peer.id, inviteData.roomId);
            }
          }
          setCurrentRoomInfo((info) => ({ ...info, participants: participants.length }));
        }
      } catch (err) {
        addDebugLog('Failed to fetch participants or connect to peers: ' + err.message);
      }

      showSuccess(`Joined ${inviteData.roomName} successfully!`);
      pendingRoomInviteRef.current = null;
      setShowCallArea(true);
      return;
    }

    // Handle regular call accept
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.acceptCall();
    }
  };

  const handleEndCall = async () => {
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.endCall();
    }
  };

  const handleToggleAudio = async () => {
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.toggleAudio();
    }
  };

  const handleToggleVideo = async () => {
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.toggleVideo();
    }
  };

  const handleCreateGroupRoom = async (roomData) => {
    // 1. Create the room via backend API
    const createRoomRes = await fetch(`/api/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${USERS[currentUser].token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: roomData.roomName,
        description: roomData.roomDescription,
        settings: {
          audioOnly: roomData.audioOnly,
          // Add more settings as needed
        }
      })
    });
    if (!createRoomRes.ok) {
      showError('Failed to create room');
      return;
    }
    const createRoomData = await createRoomRes.json();
    const roomId = createRoomData.data.roomId || createRoomData.data.room.id || createRoomData.data.id;

    setCurrentRoomInfo({
      visible: true,
      name: roomData.roomName,
      id: roomId,
      participants: 1
    });

    // Initialize group call media
    if (webrtcManagerRef.current) {
      await webrtcManagerRef.current.initMedia(!roomData.audioOnly);
      setLocalStream(webrtcManagerRef.current.getLocalStream());
    }

    // 2. Send invites via backend API
    if (roomData.inviteDevs && roomData.inviteDevs.length > 0) {
      const inviteRes = await fetch(`/api/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${USERS[currentUser].token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userIds: roomData.inviteDevs })
      });
      if (inviteRes.ok) {
        showSuccess(`Room "${roomData.roomName}" created and invites sent!`);
        addDebugLog(`Invites sent to: ${roomData.inviteDevs.join(', ')}`);
      } else {
        showError('Failed to send invites');
      }
    } else {
      showSuccess(`Room "${roomData.roomName}" created successfully`);
    }

    setShowCallArea(true);
  };

  const checkSocketStatus = () => {
    if (socketManagerRef.current) {
      socketManagerRef.current.checkStatus();
    }
  };

  const clearDebugLog = () => {
    setDebugLogs(['🔍 Socket logs cleared...']);
  };

  const testNotifications = () => {
    addDebugLog('Testing notification system...');
    showNotificationDialog('Test Notification', 'This is a local test notification', true);
    
    if (socketManagerRef.current && socketManagerRef.current.socket?.connected) {
      const testData = {
        fromUser: currentUser,
        fromUserId: USERS[currentUser].id,
        message: 'Socket test notification',
        timestamp: new Date().toISOString()
      };
      
      socketManagerRef.current.socketEmit('test-broadcast', testData);
      addDebugLog(`Sent test message: ${JSON.stringify(testData)}`);
    } else {
      showError('Socket not connected');
    }
  };

  const simulateRoomInvite = () => {
    addDebugLog('Simulating room invite...');
    
    const mockInvite = {
      targetId: USERS[currentUser].id,
      roomId: 'test-room-12345',
      roomName: 'Simulated Test Room',
      hostName: 'Test Host',
      hostId: 'test-host-id',
      type: 'group-call-invite'
    };
    
    showNotificationDialog(
      '📞 Group Call Started',
      `${mockInvite.hostName} started "${mockInvite.roomName}". Click Accept to join!`,
      true
    );
    
    pendingRoomInviteRef.current = mockInvite;
    showSuccess('Simulated room invite created!');
  };

  // Check for stored user on mount (remove USERS reference)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('wasaaCallUser');
      if (storedUser) {
        // If contacts are loaded, check if user exists in contacts
        if (contacts.length === 0 || contacts.some(c => c.name === storedUser)) {
          handleUserSelect(storedUser);
        }
      }
    }
  }, [contacts]);

  // Fallback: fetch contacts if not provided
    // Fallback: fetch contacts if not provided

  useEffect(() => {
    if (!propContacts && currentUser) {
      // Try to fetch contacts from backend
      const token = localStorage.getItem('wasaaCallToken');
      fetch('/api/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setContacts(data.contacts || []))
        .catch(() => setContacts([]));
    }
  }, [currentUser, propContacts]);

  // Fallback: get user from localStorage if not provided
  useEffect(() => {
    if (!propUser && typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('wasaaCallUser');
      const storedToken = localStorage.getItem('wasaaCallToken');
      if (storedUser && storedToken) {
        setCurrentUser(storedUser);
        setShowSetup(true);
      }
    }
  }, [propUser]);

  // --- AUTO-LOGIN/AUTO-CALL FROM QUERY PARAMS (HEADLESS MODE) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const user = params.get('user');
    const token = params.get('token');
    const contact = params.get('contact');
    const contactName = params.get('contactName');
    const callType = params.get('callType');
    // If all required params are present, run in headless mode
    if (user && token && contact && callType) {
      console.log('🤖 Running in headless mode - no UI, just call service');
      setIsHeadless(true);
      localStorage.setItem('wasaaCallUser', user);
      localStorage.setItem('wasaaCallToken', token);
      setCurrentUser(user);
      setShowSetup(true);
      let found = contacts.find(c => c.id === contact || c.name === contact);
      if (!found && contact && contactName) {
        found = { id: contact, name: contactName };
        setContacts(prev => {
          if (!prev.some(c => c.id === contact)) {
            return [...prev, found];
          }
          return prev;
        });
      }
      if (found || contact) {
        setSelectedTarget(contact);
        setTimeout(() => {
          console.log(`🎯 Headless call service starting ${callType} call to ${contactName || contact}`);
          handleStartCall(callType);
        }, 300);
      }
    }
  }, [contacts]);

  // Listen for contacts sync from parent (main app)
  useEffect(() => {
    function handleContactsMessage(event) {
      if (event.data && event.data.type === 'SYNC_CONTACTS' && Array.isArray(event.data.contacts)) {
        setContacts(event.data.contacts);
        addDebugLog('Contacts synced from main app via postMessage.');
      }
    }
    window.addEventListener('message', handleContactsMessage);
    return () => window.removeEventListener('message', handleContactsMessage);
  }, []);

  // Replace USERS usage with contacts
  // Helper to get user object by id or name
  const getUserById = (id) => contacts.find(c => c.id === id);
  const getUserByName = (name) => contacts.find(c => c.name === name);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px', backgroundColor: '#f5f5f5', color: '#333' }}>
      <NotificationBox
        notification={notification}
        onAccept={handleAcceptCall}
        onDismiss={hideNotification}
      />
      {/* Only show UI if NOT in headless mode */}
      {!isHeadless && (
        <div className={styles.container}>
          <h1>🎥 WASAA Video Call System</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>Enhanced test environment with auto-notifications</p>
          {/* Hide manual contact selection UI if selectedTarget is set by auto-call */}
          {!showSetup && (
            <UserSelection onUserSelect={handleUserSelect} />
          )}
          {showSetup && (
            <>
              <div className={styles.userInfo}>
                <p><strong>🏷️ Logged in as:</strong> {currentUser}</p>
                <p><strong>🆔 User ID:</strong> {getUserByName(currentUser)?.id}</p>
                <p><strong>📊 Status:</strong> 
                  <span className={`${styles.statusIndicator} ${userStatus === 'available' ? styles.statusActive : ''}`}></span>
                  {userStatus}
                </p>
              </div>
              <div className={styles.tabs}>
                <button 
                  className={`${styles.tab} ${activeTab === 'one-on-one' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('one-on-one')}
                >
                  📞 1:1 Calls
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === 'group-calls' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('group-calls')}
                >
                  👥 Group Calls
                </button>
              </div>
              {/* Only show contact selection if not auto-calling */}
              <div className={`${styles.tabContent} ${activeTab === 'one-on-one' ? styles.tabContentActive : ''}`}>
                <div>
                  <h3>📱 Make a Direct Call</h3>
                  <p>Select a contact to call:</p>
                  {selectedTarget ? null : (
                    <>
                      <select 
                        className={styles.select} 
                        value={selectedTarget}
                        onChange={(e) => setSelectedTarget(e.target.value)}
                      >
                        <option value="">Select a contact...</option>
                        {contacts.filter(c => c.name !== currentUser).map(contact => (
                          <option key={contact.id} value={contact.id}>{contact.name}</option>
                        ))}
                      </select>
                      <div className={styles.controlButtons}>
                        <button 
                          className={`${styles.button} ${styles.buttonGreen}`}
                          onClick={() => handleStartCall('video')}
                          disabled={!selectedTarget}
                        >
                          📹 Start Video Call
                        </button>
                        <button 
                          className={`${styles.button} ${styles.buttonBlue}`}
                          onClick={() => handleStartCall('audio')}
                          disabled={!selectedTarget}
                        >
                          🎤 Start Audio Call
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className={`${styles.tabContent} ${activeTab === 'group-calls' ? styles.tabContentActive : ''}`}>
                <GroupCallControls 
                  currentUser={currentUser}
                  contacts={contacts}
                  onCreateRoom={handleCreateGroupRoom}
                />
                
                {currentRoomInfo.visible && (
                  <div className={styles.currentRoomInfo}>
                    <h4>🏠 Current Room</h4>
                    <p><strong>Room:</strong> {currentRoomInfo.name}</p>
                    <p><strong>Room ID:</strong> {currentRoomInfo.id}</p>
                    <p><strong>Participants:</strong> {currentRoomInfo.participants}</p>
                  </div>
                )}
              </div>

              {callInfo.visible && (
                <div className={styles.callInfo}>
                  <p><strong>📞 Call ID:</strong> {callInfo.callId}</p>
                  <p><strong>📊 Status:</strong> {callInfo.status}</p>
                </div>
              )}
            </>
          )}

          <p className={error.includes('✅') ? styles.success : styles.error}>{error}</p>

          <div className={styles.debugLog}>
            {debugLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>

          <div className={styles.debugButtons}>
            <button className={`${styles.button} ${styles.buttonBlue}`} onClick={checkSocketStatus}>
              🔍 Check Status
            </button>
            <button className={`${styles.button} ${styles.buttonBlue}`} onClick={clearDebugLog}>
              🗑️ Clear Log
            </button>
            <button className={`${styles.button} ${styles.buttonGreen}`} onClick={testNotifications}>
              🧪 Test Notifications
            </button>
            <button className={`${styles.button} ${styles.buttonRed}`} onClick={simulateRoomInvite}>
              📞 Simulate Invite
            </button>
          </div>
        </div>
      )}
      {/* Call area works in both modes */}
      {showCallArea && (
        <CallArea
          localStream={localStream}
          remoteStream={remoteStream}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          acceptCallVisible={acceptCallVisible}
          onAcceptCall={handleAcceptCall}
          onEndCall={handleEndCall}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
        />
      )}
    </div>
  );
}

// Helper component for group call controls
function GroupCallControls({ currentUser, contacts = [], onCreateRoom }) {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [audioOnly, setAudioOnly] = useState(false);
  const [inviteDevs, setInviteDevs] = useState([]);

  const handleSubmit = () => {
    if (!roomName.trim()) return;
    
    onCreateRoom({
      roomName: roomName.trim(),
      roomDescription: roomDescription.trim(),
      audioOnly,
      inviteDevs
    });

    // Reset form
    setRoomName('');
    setRoomDescription('');
    setAudioOnly(false);
    setInviteDevs([]);
  };

  return (
    <div className={styles.roomControls}>
      <h3>🏢 Create Group Call Room</h3>
      <div className={styles.formGroup}>
        <label>🏷️ Room Name:</label>
        <input 
          type="text" 
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="e.g., Daily Standup" 
          maxLength="50"
        />
      </div>
      <div className={styles.formGroup}>
        <label>📝 Description (optional):</label>
        <textarea 
          value={roomDescription}
          onChange={(e) => setRoomDescription(e.target.value)}
          placeholder="Meeting purpose"
        />
      </div>
      <div className={styles.formGroup}>
        <label>👥 Invite Contacts:</label>
        <select 
          multiple 
          style={{ height: '100px' }}
          value={inviteDevs}
          onChange={(e) => setInviteDevs(Array.from(e.target.selectedOptions, option => option.value))}
        >
          {contacts.filter(c => c.name !== currentUser).map(contact => (
            <option key={contact.id} value={contact.id}>{contact.name}</option>
          ))}
        </select>
      </div>
      <div className={styles.checkboxGroup}>
        <input 
          type="checkbox" 
          checked={audioOnly}
          onChange={(e) => setAudioOnly(e.target.checked)}
        />
        <label>🎤 Audio Only</label>
      </div>
      <button 
        className={`${styles.button} ${styles.buttonGreen}`}
        onClick={handleSubmit}
        style={{ width: '100%' }}
        disabled={!roomName.trim()}
      >
        🚀 Create & Join Room
      </button>
    </div>
  );
}