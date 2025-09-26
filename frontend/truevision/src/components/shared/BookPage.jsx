import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const PDFReaderPage = () => {
  const [pdfs, setPdfs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const websocketRef = useRef(null);
  const navigate = useNavigate();

  // Load PDFs
  const loadPDFs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/pdfs');
      if (response.ok) {
        const data = await response.json();
        setPdfs(data.pdfs);
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
    }
  };

  // Upload PDF
  const uploadPDF = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadPDFs(); // Refresh PDF list
        return true;
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.detail}`);
        return false;
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadPDF(file);
    }
    // Reset input
    event.target.value = '';
  };

  // Handle drag and drop
  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      uploadPDF(pdfFile);
    } else {
      alert('Please upload only PDF files');
    }
  };

  // Start reading PDF
  const startReading = async (filename, startPage = 2) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/read/${filename}?start_page=${startPage}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log(`Started reading ${filename}`);
        alert(`Started reading ${filename}. The PDF will be read aloud from page ${startPage + 1}.`);
      } else {
        const error = await response.json();
        alert(`Failed to start reading: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error starting reading:', error);
      alert('Failed to start reading');
    }
  };

  // Control reading
  const controlReading = async (action) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        console.log(`${action} successful`);
        const actionText = action === 'pause' ? (status?.paused ? 'Resume' : 'Pause') : 'Stop';
        alert(`Reading ${actionText.toLowerCase()}ed successfully`);
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
    }
  };

  // Delete PDF
  const deletePDF = async (filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/delete/${filename}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadPDFs(); // Refresh PDF list
        alert(`Successfully deleted ${filename}`);
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    }
  };

  // Minimal WebSocket connection (just for status)
  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        console.log(`WebSocket connection attempt ${reconnectAttempts + 1}`);
        
        if (websocketRef.current) {
          websocketRef.current.close();
        }

        const ws = new WebSocket("ws://127.0.0.1:8000/ws/logs");
        websocketRef.current = ws;

        ws.onopen = () => {
          console.log("WebSocket connected successfully");
          setWebsocketConnected(true);
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            if (event.data === 'pong') return;
            // Just acknowledge messages, don't display them
            const logData = JSON.parse(event.data);
            console.log('Received:', logData.message);
          } catch (error) {
            console.error("Error parsing log data:", error);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket closed");
          setWebsocketConnected(false);
          
          if (reconnectAttempts < maxReconnectAttempts) {
            setTimeout(() => {
              reconnectAttempts++;
              connectWebSocket();
            }, Math.min(3000 * Math.pow(2, reconnectAttempts), 15000));
          }
        };

        ws.onerror = (error) => {
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
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Check status and load PDFs
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/status");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Status check error:", error);
        setIsConnected(false);
      }
    };

    checkStatus();
    loadPDFs();
    
    const interval = setInterval(() => {
      checkStatus();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      minHeight: "100vh",
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f5f5f5",
      padding: "20px"
    }}>
      
      {/* MAIN CONTENT - PDF LIBRARY (FULL WIDTH) */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "15px",
        padding: "30px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
      }}>
        
        {/* Header */}
        <div style={{ marginBottom: "30px", textAlign: "center" }}>
          <h1 style={{ 
            color: "#333", 
            marginBottom: "15px", 
            fontSize: "32px",
            fontWeight: "bold"
          }}>
            📚 PDF Reader System
          </h1>
          
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            gap: "15px", 
            marginBottom: "20px",
            flexWrap: "wrap"
          }}>
            <span style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: isConnected ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {isConnected ? "🟢 Backend Online" : "🔴 Backend Offline"}
            </span>
            
            <span style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: websocketConnected ? "#28a745" : "#dc3545",
              color: "white"
            }}>
              {websocketConnected ? "🔄 Connected" : "📡 Disconnected"}
            </span>
            
            <span style={{
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "bold",
              backgroundColor: status?.tts_available ? "#17a2b8" : "#6c757d",
              color: "white"
            }}>
              {status?.tts_available ? "🔊 TTS Ready" : "🔇 TTS Offline"}
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

       

        {/* Upload Area */}
        <div
          style={{
            border: dragOver ? "3px dashed #007bff" : "2px dashed #ccc",
            borderRadius: "15px",
            padding: "50px",
            textAlign: "center",
            marginBottom: "30px",
            backgroundColor: dragOver ? "#f0f8ff" : uploading ? "#fff3cd" : "#f9f9f9",
            cursor: uploading ? "not-allowed" : "pointer",
            transition: "all 0.3s ease"
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!uploading) handleDrop(e);
          }}
        >
          <div style={{ fontSize: "64px", marginBottom: "15px" }}>
            {uploading ? "⏳" : dragOver ? "📂" : "➕"}
          </div>
          <h3 style={{ 
            margin: "15px 0", 
            color: uploading ? "#856404" : "#333",
            fontSize: "24px"
          }}>
            {uploading ? "Uploading PDF..." : "Upload PDF File"}
          </h3>
          <p style={{ 
            color: uploading ? "#856404" : "#666", 
            margin: 0,
            fontSize: "16px"
          }}>
            {uploading ? "Please wait while we process your file..." : "Click here or drag & drop PDF files to upload"}
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            disabled={uploading}
          />
        </div>

        {/* PDF Library */}
        <div>
          <h2 style={{ 
            color: "#333", 
            marginBottom: "20px",
            fontSize: "24px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            📄 Your PDF Library ({pdfs.length} files)
            {pdfs.length > 0 && (
              <button
                onClick={loadPDFs}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#17a2b8",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                🔄 Refresh
              </button>
            )}
          </h2>
          
          {pdfs.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px",
              color: "#666",
              backgroundColor: "#f9f9f9",
              borderRadius: "15px",
              border: "1px solid #e0e0e0"
            }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>📁</div>
              <h3 style={{ margin: "0 0 15px 0", color: "#333", fontSize: "24px" }}>No PDF files found</h3>
              <p style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Upload your first PDF to get started with text-to-speech reading!</p>
              <p style={{ fontSize: "14px", margin: 0, color: "#999" }}>
                Supported format: PDF files only • Maximum file size: 50MB
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", 
              gap: "20px" 
            }}>
              {pdfs.map((pdf, index) => (
                <div key={index} style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "12px",
                  padding: "20px",
                  backgroundColor: "white",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                  transition: "box-shadow 0.2s ease, transform 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                  e.target.style.transform = "translateY(0)";
                }}>
                  
                  {/* PDF Header */}
                  <div style={{ marginBottom: "15px" }}>
                    <h4 style={{ 
                      margin: "0 0 10px 0", 
                      color: "#333", 
                      fontSize: "18px",
                      fontWeight: "bold",
                      wordBreak: "break-word"
                    }}>
                      📄 {pdf.filename}
                    </h4>
                    
                    {/* PDF Metadata */}
                    <div style={{ 
                      fontSize: "14px", 
                      color: "#666",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      marginBottom: "10px"
                    }}>
                      <span>📊 {pdf.pages} pages</span>
                      <span>💾 {formatFileSize(pdf.size)}</span>
                      <span>📅 {new Date(pdf.created).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                      <span>📋 PDF Document</span>
                    </div>

                    {/* PDF Title */}
                    {pdf.title && pdf.title !== "Unknown" && (
                      <div style={{ 
                        fontSize: "14px", 
                        color: "#555", 
                        marginTop: "10px",
                        fontStyle: "italic",
                        padding: "8px 0",
                        borderTop: "1px solid #eee"
                      }}>
                        <strong>Title:</strong> {pdf.title}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div style={{ 
                    display: "flex", 
                    gap: "10px", 
                    flexWrap: "wrap"
                  }}>
                    <button
                      onClick={() => startReading(pdf.filename)}
                      disabled={!status?.tts_available || (status?.is_reading && status?.current_pdf !== pdf.filename)}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        backgroundColor: (!status?.tts_available || (status?.is_reading && status?.current_pdf !== pdf.filename)) ? "#6c757d" : "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: (!status?.tts_available || (status?.is_reading && status?.current_pdf !== pdf.filename)) ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        minWidth: "120px"
                      }}
                      title={!status?.tts_available ? "TTS not available" : 
                             (status?.is_reading && status?.current_pdf !== pdf.filename) ? "Another PDF is being read" : 
                             "Start reading this PDF aloud from page 3"}
                    >
                      🎧 Read Aloud
                    </button>
                    
                    <a
                      href={`http://127.0.0.1:8000${pdf.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "12px 16px",
                        backgroundColor: "#007bff",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "bold",
                        minWidth: "100px"
                      }}
                      title="View PDF in browser"
                    >
                      👁️ View PDF
                    </a>
                    
                    <button
                      onClick={() => deletePDF(pdf.filename)}
                      style={{
                        padding: "12px 16px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        minWidth: "100px"
                      }}
                      title="Delete this PDF permanently"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFReaderPage;
