import { useEffect, useRef } from 'react';
import styles from '../styles/VideoCall.module.css';

export default function CallArea({
  localStream,
  remoteStream,
  audioEnabled,
  videoEnabled,
  acceptCallVisible,
  onAcceptCall,
  onEndCall,
  onToggleAudio,
  onToggleVideo
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Update local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleShareScreen = async () => {
    try {
      console.log('Starting screen share');
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: true 
      });
      
      const videoTrack = screenStream.getVideoTracks()[0];
      
      // Handle screen share ending
      videoTrack.onended = async () => {
        console.log('Screen share ended');
        try {
          const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('Camera restored after screen share');
        } catch (err) {
          console.error('Error resuming camera:', err);
        }
      };
      
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  return (
    <div>
      <div className={styles.videosContainer}>
        <div className={styles.videoWrapper}>
          <h4>You</h4>
          <video 
            ref={localVideoRef}
            className={styles.video}
            autoPlay 
            playsInline 
            muted
            style={{ 
              display: !videoEnabled ? 'none' : 'block' 
            }}
          />
          {!videoEnabled && (
            <div 
              className={styles.video}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#333',
                color: 'white' 
              }}
            >
              📷 Video Off
            </div>
          )}
        </div>
        <div className={styles.videoWrapper}>
          <h4>Remote User</h4>
          <video 
            ref={remoteVideoRef}
            className={styles.video}
            autoPlay 
            playsInline
          />
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        <button 
          className={`${styles.button} ${styles.buttonGreen}`}
          onClick={onToggleAudio}
        >
          {audioEnabled ? '🎤 Mute Audio' : '🔇 Unmute Audio'}
        </button>
        <button 
          className={`${styles.button} ${styles.buttonGreen}`}
          onClick={onToggleVideo}
        >
          {videoEnabled ? '📹 Turn Off Video' : '📷 Turn On Video'}
        </button>
        {acceptCallVisible && (
          <button 
            className={`${styles.button} ${styles.buttonGreen}`}
            onClick={onAcceptCall}
          >
            ✅ Accept Call
          </button>
        )}
        <button 
          className={`${styles.button} ${styles.buttonRed}`}
          onClick={onEndCall}
        >
          📞 End Call
        </button>
        <button 
          className={`${styles.button} ${styles.buttonBlue}`}
          onClick={handleShareScreen}
        >
          🖥️ Share Screen
        </button>
      </div>
    </div>
  );
}