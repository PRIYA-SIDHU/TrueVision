import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Objectpage = () => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [sceneData, setSceneData] = useState(null);
  const logsEndRef = useRef(null);
  const websocketRef = useRef(null);
  const navigate = useNavigate();

  // Auto-scroll to bottom of logs
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // WebSocket connection for real-time logs
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs");
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setWebsocketConnected(true);
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message: "🌐 Connected to English Vision Assistant",
          type: "success"
        }]);
      };

      ws.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          setLogs(prev => [...prev.slice(-49), logData]); // Keep last 50 logs
        } catch (error) {
          console.error("Error parsing log data:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setWebsocketConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setWebsocketConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Check backend connection and get status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/");
        if (response.ok) {
          setIsConnected(true);
          
          // Get system status
          const statusResponse = await fetch("http://127.0.0.1:8000/status");
          if (statusResponse.ok) {
            const status = await statusResponse.json();
            setSystemStatus(status);
          }

          // Get scene data
          const sceneResponse = await fetch("http://127.0.0.1:8000/scene_data");
          if (sceneResponse.ok) {
            const scene = await sceneResponse.json();
            setSceneData(scene);
          }
        }
      } catch (error) {
        setIsConnected(false);
        setSystemStatus(null);
        setSceneData(null);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, []);

  const getLogStyle = (type) => {
    const baseStyle = {
      padding: "8px 12px",
      marginBottom: "6px",
      borderRadius: "8px",
      fontSize: "14px",
      fontFamily: "Consolas, Monaco, monospace",
      borderLeft: "4px solid",
      lineHeight: "1.4"
    };

    switch (type) {
      case "user_speech":
        return { 
          ...baseStyle, 
          backgroundColor: "#e3f2fd", 
          borderLeftColor: "#2196f3", 
          color: "#0d47a1",
          fontWeight: "600"
        };
      case "assistant_speech":
        return { 
          ...baseStyle, 
          backgroundColor: "#e8f5e8", 
          borderLeftColor: "#4caf50", 
          color: "#2e7d32",
          fontWeight: "600"
        };
      case "warning_speech":
        return { 
          ...baseStyle, 
          backgroundColor: "#ffebee", 
          borderLeftColor: "#f44336", 
          color: "#c62828",
          fontWeight: "700"
        };
      case "success":
        return { ...baseStyle, backgroundColor: "#d4edda", borderLeftColor: "#28a745", color: "#155724" };
      case "error":
        return { ...baseStyle, backgroundColor: "#f8d7da", borderLeftColor: "#dc3545", color: "#721c24" };
      case "warning":
        return { ...baseStyle, backgroundColor: "#fff3cd", borderLeftColor: "#ffc107", color: "#856404" };
      case "voice":
        return { ...baseStyle, backgroundColor: "#e7f3ff", borderLeftColor: "#17a2b8", color: "#0c5460" };
      case "command":
        return { ...baseStyle, backgroundColor: "#f0f8f0", borderLeftColor: "#28a745", color: "#155724" };
      case "detection":
        return { ...baseStyle, backgroundColor: "#ffe6e6", borderLeftColor: "#ff4444", color: "#cc0000" };
      case "system":
        return { ...baseStyle, backgroundColor: "#e6f3ff", borderLeftColor: "#0066cc", color: "#003d7a" };
      default:
        return { ...baseStyle, backgroundColor: "#f8f9fa", borderLeftColor: "#6c757d", color: "#495057" };
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f5f5f5"
    }}>
      
      {/* LEFT SIDE - CONVERSATION TERMINAL */}
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
            💬 Live Conversation Log
          </h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <span style={{
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              backgroundColor: websocketConnected ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {websocketConnected ? "🟢 Live" : "🔴 Offline"}
            </span>
            <span style={{
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px",
              backgroundColor: isConnected ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {isConnected ? "🟢 API" : "🔴 API"}
            </span>
          </div>
        </div>

        {/* System Status */}
        {systemStatus && (
          <div style={{
            backgroundColor: "#2d2d2d",
            padding: "12px",
            marginBottom: "12px",
            borderRadius: "8px",
            fontSize: "13px",
            border: "1px solid #444"
          }}>
            <div style={{ marginBottom: "5px" }}>🎤 Microphone: {systemStatus.microphone_active ? <span style={{color: "#4caf50"}}>🟢 Active</span> : <span style={{color: "#f44336"}}>🔴 Inactive</span>}</div>
            <div style={{ marginBottom: "5px" }}>🗣️ Speaking: {systemStatus.is_speaking ? <span style={{color: "#4caf50"}}>🟢 Yes</span> : <span style={{color: "#888"}}>⚪ No</span>}</div>
            <div style={{ marginBottom: "5px" }}>🎯 Confidence: {(systemStatus.confidence_threshold * 100).toFixed(0)}%</div>
            <div>📊 Objects: {systemStatus.objects_detected}</div>
          </div>
        )}

        {/* Conversation Terminal */}
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
              📡 Waiting for conversation...
              <div style={{ fontSize: "12px", marginTop: "10px" }}>
                Try saying "what's on screen" or "help"
              </div>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: "10px" }}>
                <span style={{ 
                  color: "#00ff41", 
                  marginRight: "10px",
                  fontSize: "12px",
                  opacity: 0.8
                }}>
                  [{log.timestamp}]
                </span>
                <div style={{
                  color: log.type === "user_speech" ? "#81c784" :
                         log.type === "assistant_speech" ? "#64b5f6" :
                         log.type === "warning_speech" ? "#ff7043" :
                         log.type === "error" ? "#ff6b6b" :
                         log.type === "success" ? "#51cf66" :
                         log.type === "warning" ? "#ffd43b" :
                         log.type === "voice" ? "#91a7ff" :
                         log.type === "command" ? "#69db7c" :
                         log.type === "detection" ? "#ff8cc8" :
                         log.type === "system" ? "#74c0fc" : "#ffffff",
                  fontWeight: (log.type === "user_speech" || log.type === "assistant_speech" || log.type === "warning_speech") ? "600" : "normal",
                  fontSize: (log.type === "user_speech" || log.type === "assistant_speech" || log.type === "warning_speech") ? "15px" : "14px",
                  marginTop: "2px"
                }}>
                  {log.message}
                </div>
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
          <span>Conversation logs: {logs.filter(log => log.type.includes('speech')).length}</span>
          <span>Last: {logs.length > 0 ? logs[logs.length - 1]?.timestamp : "N/A"}</span>
        </div>
      </div>

      {/* RIGHT SIDE - CAMERA FEED AND SCENE DATA */}
      <div style={{
        width: "50%",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "#ffffff"
      }}>
        
        {/* Header */}
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
            🎥 English Vision Assistant
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
              backgroundColor: isConnected ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {isConnected ? "🟢 Camera Active" : "🔴 Camera Offline"}
            </span>
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
            width: "fit-content",
            marginBottom: "20px"
          }}>
            <img
              src="http://127.0.0.1:8000/video_feed"
              alt="Live Object Detection Feed"
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
              🤖 Real-time object detection with voice commands
            </div>
          </div>
        ) : (
          <div style={{
            padding: "60px 40px",
            backgroundColor: "#f8f9fa",
            borderRadius: "15px",
            textAlign: "center",
            color: "#666",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            marginBottom: "20px"
          }}>
            <h3>📡 Connecting to Camera...</h3>
            <p>Make sure your FastAPI server is running</p>
            <div style={{ marginTop: "20px" }}>
              <code style={{
                backgroundColor: "#e9ecef",
                padding: "10px",
                borderRadius: "5px",
                display: "block"
              }}>
                python main.py
              </code>
            </div>
          </div>
        )}

        {/* Scene Data */}
        {sceneData && sceneData.objects.length > 0 && (
          <div style={{
            width: "100%",
            backgroundColor: "#f8f9fa",
            borderRadius: "10px",
            padding: "15px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ color: "#333", marginBottom: "15px", textAlign: "center" }}>
              📊 Detected Objects ({sceneData.total_count})
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "10px",
              maxHeight: "200px",
              overflowY: "auto"
            }}>
              {sceneData.objects.map((obj, index) => (
                <div key={index} style={{
                  backgroundColor: "white",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: `3px solid ${
                    obj.side === 'left' ? '#ff6b6b' :
                    obj.side === 'right' ? '#51cf66' :
                    '#339af0'
                  }`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{obj.class}</div>
                  <div>📐 {obj.distance_meters}m away</div>
                  <div>📍 {obj.side} side</div>
                  <div>🎯 {(obj.confidence * 100).toFixed(0)}% confidence</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Commands Help */}
        <div style={{
          width: "100%",
          marginTop: "20px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ color: "#333", marginBottom: "15px", textAlign: "center" }}>
            🎙️ Try These Voice Commands
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "13px",
            color: "#666"
          }}>
            <div>🗣️ "What's on screen?"</div>
            <div>🗣️ "What's on the left?"</div>
            <div>🗣️ "How far is the person?"</div>
            <div>🗣️ "How many objects?"</div>
            <div>🗣️ "What's the closest object?"</div>
            <div>🗣️ "Help me"</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Objectpage;
