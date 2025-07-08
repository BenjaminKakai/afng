import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Head from 'next/head';

export default function VideoCall() {
  // State variables
  const [currentUser, setCurrentUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [activeTab, setActiveTab] = useState('one-on-one');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notification, setNotification] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [showCallArea, setShowCallArea] = useState(false);
  const [showSetupArea, setShowSetupArea] = useState(false);
  const [showCurrentRoomInfo, setShowCurrentRoomInfo] = useState(false);
  const [showAcceptCallBtn, setShowAcceptCallBtn] = useState(false);
  const [callStatus, setCallStatus] = useState('Initializing...');
  const [callIdDisplay, setCallIdDisplay] = useState('None');
  const [participantCount, setParticipantCount] = useState(0);
  const [inviteLink, setInviteLink] = useState('-');
  const [debugLog, setDebugLog] = useState(['🔍 Socket logs will appear here...']);

  // Refs for video elements
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Dummy USERS object for demo (replace with real data)
  // FIXED - Now uses UUID keys that match what WebRTC expects!
  const USERS = {
    '5717c314-0ed1-4984-aa0d-4af6c961586e': { id: '5717c314-0ed1-4984-aa0d-4af6c961586e', name: 'Dev 1', token: '...' },
    '9a105e6f-ca83-4e09-ab83-46dfdfef112e': { id: '9a105e6f-ca83-4e09-ab83-46dfdfef112e', name: 'Dev 2', token: '...' },
    'e8c7507f-2d69-4401-ab07-6a24325fb66b': { id: 'e8c7507f-2d69-4401-ab07-6a24325fb66b', name: 'Dev 3', token: '...' },
    '3d12d8b0-8e90-46b8-a8b3-7692dc23c994': { id: '3d12d8b0-8e90-46b8-a8b3-7692dc23c994', name: 'Dev 4', token: '...' },
    // Also add the display name mappings for backward compatibility:
    'Dev 1': { id: '5717c314-0ed1-4984-aa0d-4af6c961586e', name: 'Dev 1', token: '...' },
    'Dev 2': { id: '9a105e6f-ca83-4e09-ab83-46dfdfef112e', name: 'Dev 2', token: '...' },
    'Dev 3': { id: 'e8c7507f-2d69-4401-ab07-6a24325fb66b', name: 'Dev 3', token: '...' },
    'Dev 4': { id: '3d12d8b0-8e90-46b8-a8b3-7692dc23c994', name: 'Dev 4', token: '...' },
  };

  // Utility functions (showError, showSuccess, logDebug, etc.)
  // ...implement as needed, using setError, setSuccess, setDebugLog

  // useEffect for client-side only logic (localStorage, window, etc.)
  useEffect(() => {
    // Example: restore user from localStorage
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('wasaaCallUser') : null;
    if (storedUser && USERS[storedUser]) {
      setCurrentUser(storedUser);
      setShowSetupArea(true);
    }
  }, []);

  // Handlers for UI actions (selectUser, switchTab, startCall, etc.)
  // ...implement as needed

  return (
    <>
      <Head>
        <title>WASAA Video Call</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <style>{`
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; color: #333; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          video { width: 320px; height: auto; border: 1px solid #ccc; border-radius: 4px; margin: 10px; background-color: #000; }
          .group-video { width: 200px; height: 150px; object-fit: cover; }
          #error { color: #d32f2f; font-weight: bold; margin: 10px 0; }
          .success { color: #2e7d32; font-weight: bold; }
          button { padding: 10px 20px; margin: 5px; cursor: pointer; border: none; border-radius: 4px; color: white; font-size: 14px; transition: background-color 0.3s; }
          button:disabled { background-color: #ccc; cursor: not-allowed; }
          button.green { background-color: #4caf50; }
          button.blue { background-color: #2196f3; }
          button.red { background-color: #f44336; }
          .videos-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
          .video-wrapper { margin: 10px; text-align: center; }
          .video-wrapper h4 { margin: 5px 0; font-size: 14px; }
          .status-indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; background-color: #ccc; }
          .status-active { background-color: #4caf50; }
          .notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 15px 20px; border-radius: 12px; z-index: 1000; box-shadow: 0 6px 20px rgba(0,0,0,0.3); display: none; min-width: 300px; text-align: center; animation: slideDown 0.3s ease-out; }
          @keyframes slideDown { from { transform: translate(-50%, -100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
          .notification h3 { margin: 0 0 8px 0; font-size: 16px; }
          .notification p { margin: 0 0 12px 0; font-size: 14px; }
          .user-selection { margin: 20px 0; padding: 15px; background-color: #f0f0f0; border-radius: 8px; }
          .call-info { margin: 15px 0; padding: 10px; background-color: #f8f8f8; border-radius: 8px; border: 1px dashed #ddd; }
          .room-controls { margin: 15px 0; padding: 15px; background-color: #e3f2fd; border-radius: 8px; border: 1px solid #90caf9; }
          .room-list { margin: 15px 0; padding: 10px; background-color: #fafafa; border-radius: 8px; max-height: 200px; overflow-y: auto; }
          .room-item { padding: 10px; margin: 5px 0; background-color: white; border: 1px solid #ddd; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
          .participant-list { margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px; text-align: left; }
          .participant-item { padding: 5px; margin: 2px 0; display: flex; justify-content: space-between; align-items: center; }
          #debug-log { text-align: left; height: 150px; overflow-y: auto; background-color: #f8f8f8; border: 1px solid #ddd; padding: 10px; margin-top: 20px; font-family: monospace; font-size: 12px; }
          .tabs { display: flex; margin-bottom: 20px; border-bottom: 2px solid #ddd; }
          .tab { padding: 10px 20px; cursor: pointer; background-color: #f0f0f0; border: none; border-bottom: 3px solid transparent; margin-right: 5px; }
          .tab.active { background-color: #4caf50; color: white; border-bottom: 3px solid #388e3c; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }
          .form-group { margin: 15px 0; text-align: left; }
          .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
          .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
          .form-group textarea { height: 60px; resize: vertical; }
          .checkbox-group { display: flex; align-items: center; margin: 10px 0; }
          .checkbox-group input { width: auto; margin-right: 8px; }
          .dev-selector { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
          .dev-selector button { padding: 15px; font-size: 16px; border-radius: 8px; transition: transform 0.3s; }
          .dev-selector button:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
          select { width: 100%; padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid #ddd; }
        `}</style>
      </Head>
      {/* External scripts for socket.io, adapter, mediasoup-client */}
      <Script src="https://cdn.socket.io/4.5.4/socket.io.min.js" strategy="beforeInteractive" />
      <Script src="https://webrtc.github.io/adapter/adapter-latest.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/mediasoup-client@3/lib/mediasoup-client.min.js" strategy="beforeInteractive" />
      <div className="container">
        <h1>🎥 WASAA Video Call System (Next.js)</h1>
        <p style={{ color: '#666', marginBottom: 20 }}>Enhanced test environment with auto-notifications</p>
        {/* ...rest of the UI, ported from HTML, using React state and handlers... */}
        {/* This is a skeleton. You will need to port the rest of the HTML and JS logic into React components and hooks. */}
      </div>
    </>
  );
}
