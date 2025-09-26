import React, { useState, useEffect, useRef } from 'react';
import styles from './object.module.css';

function App() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const logsEndRef = useRef(null);
  const wsRef = useRef(null);

  // Connect to WebSocket for logs
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://127.0.0.1:8000/ws/logs');
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };
        
        wsRef.current.onmessage = (event) => {
          const logData = JSON.parse(event.data);
          setLogs(prevLogs => [...prevLogs.slice(-49), logData]); // Keep last 50 logs
        };
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // Auto reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Fetch status every 2 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/status');
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Status fetch error:', error);
      }
    };

    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 2000);

    return () => clearInterval(statusInterval);
  }, []);

  // Auto scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogClassName = (type) => {
    switch (type) {
      case 'user_speech': return styles.logUser;
      case 'assistant_speech': return styles.logAssistant;
      case 'warning_speech': return styles.logWarning;
      case 'success': return styles.logSuccess;
      case 'error': return styles.logError;
      case 'system': return styles.logSystem;
      case 'voice': return styles.logVoice;
      case 'command': return styles.logCommand;
      case 'detection': return styles.logDetection;
      default: return styles.logInfo;
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>🎥🗣️ English Vision Voice Assistant</h1>
        <div className={styles.statusBar}>
          <div className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></div>
          <span className={styles.statusText}>
            {isConnected ? '🌐 Connected' : '🔴 Disconnected'}
          </span>
          {status && (
            <>
              <span className={styles.statusItem}>
                📊 Objects: {status.objects_detected}
              </span>
              <span className={styles.statusItem}>
                {status.is_speaking ? '🔊 Speaking' : '🎤 Listening'}
              </span>
              <span className={styles.statusItem}>
                {status.microphone_active ? '🎙️ Mic Active' : '🎙️ Mic Off'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className={styles.mainContent}>
        {/* Camera Section */}
        <div className={styles.cameraSection}>
          <div className={styles.cameraContainer}>
            <img 
              src="http://127.0.0.1:8000/video_feed"
              alt="Live Camera Feed"
              className={styles.cameraFeed}
            />
            <div className={styles.cameraOverlay}>
              <div className={styles.overlayInfo}>
                <div>📹 Live Detection Active</div>
                {status && (
                  <div className={styles.detectionStats}>
                    <span>Confidence: {(status.confidence_threshold * 100).toFixed(0)}%</span>
                    <span>Objects: {status.objects_detected}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Commands Section */}
        <div className={styles.commandsSection}>
          <div className={styles.commandsHeader}>
            <h2>🎙️ Voice Commands Available</h2>
            <p>Speak any of these commands to interact with the assistant:</p>
          </div>
          
          <div className={styles.commandsGrid}>
            <div className={styles.commandCategory}>
              <h3>🔍 Scene Analysis</h3>
              <div className={styles.commandList}>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What's on screen?"</span>
                  <span className={styles.commandDesc}>See all detected objects with their names</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"Describe everything"</span>
                  <span className={styles.commandDesc}>Detailed description of the scene</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What can you see?"</span>
                  <span className={styles.commandDesc}>Complete scene overview</span>
                </div>
              </div>
            </div>

            <div className={styles.commandCategory}>
              <h3>📍 Positional Queries</h3>
              <div className={styles.commandList}>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What's on the left?"</span>
                  <span className={styles.commandDesc}>Objects on the left side</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What's on the right?"</span>
                  <span className={styles.commandDesc}>Objects on the right side</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What's in the center?"</span>
                  <span className={styles.commandDesc}>Objects in the middle area</span>
                </div>
              </div>
            </div>

            <div className={styles.commandCategory}>
              <h3>📏 Distance & Proximity</h3>
              <div className={styles.commandList}>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"How far is that?"</span>
                  <span className={styles.commandDesc}>Distance to closest object</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What's the closest?"</span>
                  <span className={styles.commandDesc}>Nearest object information</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What's nearest?"</span>
                  <span className={styles.commandDesc}>Closest detected item</span>
                </div>
              </div>
            </div>

            <div className={styles.commandCategory}>
              <h3>🔢 Counting</h3>
              <div className={styles.commandList}>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"How many objects?"</span>
                  <span className={styles.commandDesc}>Total count of detected items</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"Count everything"</span>
                  <span className={styles.commandDesc}>Number and list of objects</span>
                </div>
              </div>
            </div>

            <div className={styles.commandCategory}>
              <h3>🎯 Specific Object Search</h3>
              <div className={styles.commandList}>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"Is there any chair?"</span>
                  <span className={styles.commandDesc}>Check for specific objects</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"Do you see any person?"</span>
                  <span className={styles.commandDesc}>Look for people in the scene</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"Can you find any bottle?"</span>
                  <span className={styles.commandDesc}>Search for specific items</span>
                </div>
              </div>
            </div>

            <div className={styles.commandCategory}>
              <h3>❓ Help & Support</h3>
              <div className={styles.commandList}>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"Help"</span>
                  <span className={styles.commandDesc}>Get list of available commands</span>
                </div>
                <div className={styles.commandItem}>
                  <span className={styles.commandText}>"What can you do?"</span>
                  <span className={styles.commandDesc}>Assistant capabilities</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tipsSection}>
            <h3>💡 Pro Tips</h3>
            <div className={styles.tipsList}>
              <div className={styles.tipItem}>🎤 Speak clearly and wait for the assistant to finish responding</div>
              <div className={styles.tipItem}>⚡ Assistant automatically warns about objects closer than 1 meter</div>
              <div className={styles.tipItem}>🔄 Try different variations of commands for best results</div>
              <div className={styles.tipItem}>📱 Works with both phone camera and laptop camera</div>
            </div>
          </div>
        </div>

        {/* Logs Section */}
        <div className={styles.logsSection}>
          <div className={styles.logsHeader}>
            <h3>📋 Live Conversation & System Logs</h3>
            <button onClick={clearLogs} className={styles.clearBtn}>🗑️ Clear</button>
          </div>
          <div className={styles.logsContainer}>
            {logs.length === 0 ? (
              <div className={styles.noLogs}>
                <p>No logs yet... Start speaking to see conversation!</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`${styles.logEntry} ${getLogClassName(log.type)}`}>
                  <span className={styles.logTime}>{log.timestamp}</span>
                  <span className={styles.logMessage}>{log.message}</span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
