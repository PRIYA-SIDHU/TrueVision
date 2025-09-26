import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const FaceRecognitionPage = () => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [systemPaused, setSystemPaused] = useState(false);
  
  const logsEndRef = useRef(null);
  const websocketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll to bottom of logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Manual Resume Function
  const handleResumeSystem = async () => {
    try {
      const response = await fetch('/api/resume-system', { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setSystemPaused(data.system_paused);
        setIsPageVisible(true);
        console.log('🔄 System manually resumed');
      }
    } catch (error) {
      console.error('Error resuming system:', error);
    }
  };

  // Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      
      try {
        if (isVisible) {
          const response = await fetch('/api/page-visible', { method: 'POST' });
          if (response.ok) {
            const data = await response.json();
            setSystemPaused(data.system_paused);
          }
        } else {
          const response = await fetch('/api/page-hidden', { method: 'POST' });
          if (response.ok) {
            const data = await response.json();
            setSystemPaused(data.system_paused);
          }
        }
      } catch (error) {
        console.error('Error updating page visibility:', error);
      }
    };

    // Force resume on initial load
    if (!document.hidden) {
      handleResumeSystem();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Enhanced WebSocket connection with retry
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;

    const connectWebSocket = () => {
      try {
        console.log(`WebSocket connection attempt ${reconnectAttempts + 1}`);
        
        // Clear existing connection
        if (websocketRef.current) {
          websocketRef.current.close();
        }

        // Direct WebSocket connection
        const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs");
        websocketRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            console.log("WebSocket connection timeout");
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log("WebSocket connected successfully");
          setWebsocketConnected(true);
          reconnectAttempts = 0;
          
          setLogs(prev => [...prev, {
            timestamp: new Date().toLocaleTimeString(),
            message: "🌐 Connected to Face Recognition System",
            type: "success"
          }]);

          // Keep connection alive
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            } else {
              clearInterval(pingInterval);
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') return;
            
            const logData = JSON.parse(event.data);
            setLogs(prev => [...prev.slice(-49), logData]);
          } catch (error) {
            console.error("Error parsing log data:", error);
          }
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
          setWebsocketConnected(false);
          
          if (reconnectAttempts < maxReconnectAttempts) {
            const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Reconnecting in ${backoffTime}ms...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, backoffTime);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error("WebSocket error:", error);
          setWebsocketConnected(false);
        };

      } catch (error) {
        console.error("WebSocket creation error:", error);
        setWebsocketConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Check backend status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("http://127.0.0.1:8000/status", {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          const status = await response.json();
          setSystemStatus(status);
          setIsConnected(true);
          setSystemPaused(status.system_paused || false);
        }
      } catch (error) {
        console.error("Status check error:", error);
        setIsConnected(false);
        setSystemStatus(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f5f5f5"
    }}>
      
      {/* LEFT SIDE - LIVE LOGS TERMINAL */}
      <div style={{
        width: "50%",
        backgroundColor: "#1e1e1e",
        color: "#ffffff",
        padding: "20px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        
        {/* Terminal Header */}
        <div style={{
          backgroundColor: "#333333",
          padding: "12px 16px",
          marginBottom: "15px",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#00ff41" }}>
            ⚡ Live System Logs
          </h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              backgroundColor: isPageVisible ? "#28a745" : "#6c757d",
              color: "white"
            }}>
              {isPageVisible ? "👁️ Visible" : "👁️‍🗨️ Hidden"}
            </span>
            
            <span style={{
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              backgroundColor: systemPaused ? "#ffc107" : "#28a745",
              color: systemPaused ? "black" : "white"
            }}>
              {systemPaused ? "⏸️ Paused" : "▶️ Active"}
            </span>
            
            <span style={{
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              backgroundColor: websocketConnected ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {websocketConnected ? "🟢 Live" : "🔴 Offline"}
            </span>
          </div>
        </div>

        {/* Manual Resume Button */}
        {systemPaused && (
          <div style={{
            backgroundColor: "#422006",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "8px",
            textAlign: "center",
            border: "1px solid #ffc107"
          }}>
            <div style={{ fontWeight: "600", marginBottom: "8px", color: "#ffc107" }}>
              ⏸️ System Currently Paused
            </div>
            <button
              onClick={handleResumeSystem}
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600"
              }}
            >
              🔄 Resume System Now
            </button>
          </div>
        )}

        {/* System Status Panel */}
        {systemStatus && (
          <div style={{
            backgroundColor: "#2d2d2d",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "8px",
            fontSize: "13px",
            border: "1px solid #444"
          }}>
            <div style={{ marginBottom: "5px" }}>
              🚨 Interaction: {systemStatus.interaction_active ? 
                <span style={{color: "#f44336"}}>🔴 Active</span> : 
                <span style={{color: "#4caf50"}}>🟢 Ready</span>
              }
            </div>
            <div style={{ marginBottom: "5px" }}>
              👥 Known Persons: <span style={{color: "#81c784"}}>{systemStatus.known_persons || 0}</span>
            </div>
            <div style={{ marginBottom: "5px" }}>
              🔄 Processed: <span style={{color: "#64b5f6"}}>{systemStatus.processed_strangers || 0}</span>
            </div>
            <div>
              📹 Video Clients: <span style={{color: "#ba68c8"}}>{systemStatus.active_video_clients || 0}</span>
            </div>
          </div>
        )}

        {/* Live Logs Terminal */}
        <div style={{
          flex: 1,
          backgroundColor: "#000000",
          borderRadius: "10px",
          padding: "15px",
          overflow: "auto",
          fontSize: "14px",
          lineHeight: "1.5",
          border: "2px solid #333"
        }}>
          {logs.length === 0 ? (
            <div style={{ 
              color: "#888", 
              textAlign: "center", 
              marginTop: "50px",
              fontSize: "16px"
            }}>
              📡 Waiting for system logs...
              <div style={{ fontSize: "12px", marginTop: "10px" }}>
                {systemPaused ? "Click Resume button to start" : "Face recognition system will start automatically"}
              </div>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: "8px" }}>
                <span style={{ 
                  color: "#00ff41", 
                  marginRight: "8px",
                  fontSize: "12px",
                  opacity: 0.8
                }}>
                  [{log.timestamp}]
                </span>
                <span style={{
                  color: log.type === "stranger" ? "#ff6b6b" :
                         log.type === "recognition" ? "#51cf66" :
                         log.type === "enrollment" ? "#339af0" :
                         log.type === "error" ? "#ff6b6b" :
                         log.type === "success" ? "#51cf66" :
                         log.type === "warning" ? "#ffd43b" :
                         log.type === "tts" ? "#da77f2" :
                         log.type === "voice" ? "#91a7ff" :
                         log.type === "user_input" ? "#ffb84d" :
                         log.type === "detection" ? "#ff8787" :
                         log.type === "system" ? "#74c0fc" :
                         log.type === "paused" ? "#adb5bd" : "#ffffff",
                  fontSize: log.type === "stranger" || log.type === "detection" ? "15px" : "14px",
                  fontWeight: log.type === "stranger" || log.type === "detection" ? "600" : "normal"
                }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Terminal Footer */}
        <div style={{
          backgroundColor: "#333333",
          padding: "10px 15px",
          marginTop: "15px",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#888",
          display: "flex",
          justifyContent: "space-between"
        }}>
          <span>Total logs: {logs.length}</span>
          <span>Backend: {isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      {/* RIGHT SIDE - CAMERA FEED */}
      <div style={{
        width: "50%",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#ffffff"
      }}>
        
        <div style={{
          width: "100%",
          textAlign: "center",
          marginBottom: "20px"
        }}>
          <h1 style={{
            color: "#333",
            marginBottom: "10px",
            fontSize: "24px"
          }}>
            ⚡ Face Recognition System
          </h1>
          
          <div style={{ 
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
            gap: "10px"
          }}>
            <span style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: (isConnected && !systemPaused) ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {(isConnected && !systemPaused) ? "🟢 System Active" : systemPaused ? "⏸️ System Paused" : "🔴 Backend Offline"}
            </span>
            
            {systemPaused && (
              <button
                onClick={handleResumeSystem}
                style={{
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  backgroundColor: "#ffc107",
                  color: "black",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                🔄 Resume
              </button>
            )}
            
            <button
              onClick={() => navigate('/')}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "14px",
                fontWeight: "bold",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                cursor: "pointer"
              }}
            >
              🏠 Home
            </button>
          </div>
        </div>

        {/* Camera Feed */}
        {isConnected ? (
          <div style={{
            padding: "15px",
            backgroundColor: "#f8f9fa",
            borderRadius: "15px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            width: "fit-content"
          }}>
            <img
              src="http://127.0.0.1:8000/video_feed"
              alt="Live Face Recognition Feed"
              style={{
                border: "3px solid #333",
                borderRadius: "10px",
                width: "640px",
                height: "480px",
                objectFit: "cover"
              }}
              onError={() => setIsConnected(false)}
              onLoad={() => setIsConnected(true)}
            />
            
            <div style={{
              textAlign: "center",
              marginTop: "10px",
              color: "#666",
              fontSize: "14px"
            }}>
              🎥 Real-time face detection and recognition
            </div>
          </div>
        ) : (
          <div style={{
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "15px",
            textAlign: "center",
            color: "#666",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}>
            <h3>📡 Backend Offline</h3>
            <p>Please start the face recognition server:</p>
            <code style={{
              backgroundColor: "#e9ecef",
              padding: "10px",
              borderRadius: "5px",
              display: "block",
              marginTop: "10px"
            }}>
              python main.py
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceRecognitionPage;
