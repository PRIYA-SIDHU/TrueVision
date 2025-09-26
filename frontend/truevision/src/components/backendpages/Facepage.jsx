import React, { useEffect, useRef, useState } from "react";

const FaceDetectionPage = () => {
  const [error, setError] = useState(null);
  const [detectedPersons, setDetectedPersons] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const imgRef = useRef(null);
  const wsRef = useRef(null);

  // WebSocket connection for real-time detected persons
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket('ws://localhost:8000/ws/detected_persons');
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'detected_persons') {
              setDetectedPersons(data.persons);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
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

  // Video feed handling
  useEffect(() => {
    let mounted = true;
    const imgElement = imgRef.current;

    const loadNextFrame = () => {
      if (!mounted) return;
      const timestamp = new Date().getTime();
      imgElement.src = `http://localhost:8000/video_feed?timestamp=${timestamp}`;
    };

    const onLoadHandler = () => {
      if (!mounted) return;
      setError(null);
      setTimeout(loadNextFrame, 100);
    };

    const onErrorHandler = () => {
      if (!mounted) return;
      setError("Failed to load video feed from backend.");
      setTimeout(loadNextFrame, 2000);
    };

    imgElement.addEventListener("load", onLoadHandler);
    imgElement.addEventListener("error", onErrorHandler);

    loadNextFrame();

    return () => {
      mounted = false;
      imgElement.removeEventListener("load", onLoadHandler);
      imgElement.removeEventListener("error", onErrorHandler);
    };
  }, []);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  };

  const headerStyle = {
    color: '#333',
    marginBottom: '20px',
    fontSize: '24px',
    fontWeight: 'bold'
  };

  const buttonStyle = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    backgroundColor: '#28a745',
    color: 'white',
    marginBottom: '20px'
  };

  const videoContainerStyle = {
    position: 'relative',
    marginBottom: '20px',
    border: '3px solid #007bff',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
  };

  const videoStyle = {
    maxWidth: '100%',
    height: 'auto',
    display: 'block'
  };

  const statusStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: isConnected ? '#28a745' : '#dc3545',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold'
  };

  const detectedPersonsStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minWidth: '300px',
    textAlign: 'center'
  };

  const personListStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '15px'
  };

  const personItemStyle = {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  const errorStyle = {
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '20px',
    textAlign: 'center'
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Live Face Detection</h1>
      
      <button 
        style={buttonStyle}
        onClick={handleGoHome}
        onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
      >
        🏠 Home
      </button>
      
      {error && <div style={errorStyle}>{error}</div>}
      
      <div style={videoContainerStyle}>
        <img
          ref={imgRef}
          alt="Live detection feed"
          style={videoStyle}
        />
        <div style={statusStyle}>
          {isConnected ? '● CONNECTED' : '● DISCONNECTED'}
        </div>
      </div>

      <div style={detectedPersonsStyle}>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
          All Known Persons ({detectedPersons.length})
        </h3>
        
        {detectedPersons.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No persons in database
          </p>
        ) : (
          <div style={personListStyle}>
            {detectedPersons.map((person, index) => (
              <div key={index} style={personItemStyle}>
                {person}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceDetectionPage;
