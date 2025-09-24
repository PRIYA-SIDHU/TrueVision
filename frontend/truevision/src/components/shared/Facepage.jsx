import { useState, useEffect, useRef } from "react";

export default function App() {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const logsEndRef = useRef(null);
  const websocketRef = useRef(null);

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
          message: "🌐 Connected to real-time logging system",
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
        // Attempt to reconnect after 3 seconds
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

  // Check backend connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/");
        if (response.ok) {
          setIsConnected(true);
        }
      } catch (error) {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const getLogStyle = (type) => {
    const baseStyle = {
      padding: "8px 12px",
      marginBottom: "4px",
      borderRadius: "4px",
      fontSize: "13px",
      fontFamily: "Consolas, Monaco, monospace",
      borderLeft: "3px solid"
    };

    switch (type) {
      case "success":
        return { ...baseStyle, backgroundColor: "#d4edda", borderLeftColor: "#28a745", color: "#155724" };
      case "error":
        return { ...baseStyle, backgroundColor: "#f8d7da", borderLeftColor: "#dc3545", color: "#721c24" };
      case "warning":
        return { ...baseStyle, backgroundColor: "#fff3cd", borderLeftColor: "#ffc107", color: "#856404" };
      case "stranger":
        return { ...baseStyle, backgroundColor: "#f8d7da", borderLeftColor: "#ff0000", color: "#721c24" };
      case "tts":
        return { ...baseStyle, backgroundColor: "#cce5ff", borderLeftColor: "#007bff", color: "#004085" };
      case "voice":
        return { ...baseStyle, backgroundColor: "#e7f3ff", borderLeftColor: "#17a2b8", color: "#0c5460" };
      case "user_input":
        return { ...baseStyle, backgroundColor: "#d1ecf1", borderLeftColor: "#17a2b8", color: "#0c5460" };
      case "enrollment":
        return { ...baseStyle, backgroundColor: "#d4edda", borderLeftColor: "#28a745", color: "#155724" };
      case "recognition":
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
      
      {/* LEFT SIDE - TERMINAL LOGS */}
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
          padding: "10px 15px",
          marginBottom: "15px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", color: "#00ff41" }}>
            📱 Real-Time System Logs
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

        {/* Terminal Logs Container */}
        <div style={{
          flex: 1,
          backgroundColor: "#000000",
          borderRadius: "8px",
          padding: "15px",
          overflow: "auto",
          fontSize: "14px",
          lineHeight: "1.4"
        }}>
          {logs.length === 0 ? (
            <div style={{ color: "#888", textAlign: "center", marginTop: "50px" }}>
              📡 Connecting to system logs...
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: "8px" }}>
                <span style={{ color: "#00ff41", marginRight: "8px" }}>
                  [{log.timestamp}]
                </span>
                <span style={{
                  color: log.type === "error" ? "#ff6b6b" :
                        log.type === "success" ? "#51cf66" :
                        log.type === "warning" ? "#ffd43b" :
                        log.type === "stranger" ? "#ff6b6b" :
                        log.type === "tts" ? "#74c0fc" :
                        log.type === "voice" ? "#91a7ff" :
                        log.type === "user_input" ? "#8ce99a" :
                        log.type === "enrollment" ? "#51cf66" :
                        log.type === "system" ? "#74c0fc" : "#ffffff"
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
          padding: "8px 15px",
          marginTop: "15px",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#888"
        }}>
          Total logs: {logs.length} | Last update: {logs.length > 0 ? logs[logs.length - 1]?.timestamp : "N/A"}
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
        
        {/* Camera Header */}
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
            🎥 Live Face Recognition
          </h1>
          
          <div style={{ marginBottom: "20px" }}>
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
              alt="Live Face Detection Feed"
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
              ⚡ Real-time detection with instant interaction
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

        {/* System Features */}
        <div style={{
          width: "100%",
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ color: "#333", marginBottom: "15px", textAlign: "center" }}>
            🤖 System Features
          </h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            fontSize: "13px",
            color: "#666"
          }}>
            <div>✅ Real-time face detection</div>
            <div>✅ Voice interaction</div>
            <div>✅ Database integration</div>
            <div>✅ Live system logging</div>
            <div>✅ Instant stranger detection</div>
            <div>✅ Duplicate prevention</div>
          </div>
        </div>
      </div>
    </div>
  );
}
