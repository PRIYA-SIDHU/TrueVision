from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
import pyttsx3
import speech_recognition as sr
import threading
import queue
import asyncio
import json
import base64
from typing import List, Dict, Any
import time
from datetime import datetime
import winsound
import uvicorn

app = FastAPI(title="Color Detection System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
websocket_connections: List[WebSocket] = []
system_status = {
    "detecting": False,
    "specific_color": None,
    "system_paused": False,
    "connected_clients": 0,
    "detected_colors": [],
    "last_detection_time": None
}

# ----------------------
# Color Detection Setup
# ----------------------
color_ranges = {
    "red": [(np.array([0, 120, 70]), np.array([10, 255, 255])),
            (np.array([170, 120, 70]), np.array([180, 255, 255]))],
    "green": [(np.array([35, 50, 70]), np.array([85, 255, 255]))],
    "blue": [(np.array([90, 50, 70]), np.array([128, 255, 255]))],
    "yellow": [(np.array([20, 100, 100]), np.array([30, 255, 255]))],
    "orange": [(np.array([10, 100, 100]), np.array([20, 255, 255]))],
    "pink": [(np.array([140, 50, 100]), np.array([170, 255, 255]))],
    "purple": [(np.array([128, 50, 70]), np.array([140, 255, 255]))],
    "black": [(np.array([0, 0, 0]), np.array([180, 255, 30]))],
    "white": [(np.array([0, 0, 200]), np.array([180, 30, 255]))]
}

skin_range = (np.array([0, 30, 60]), np.array([20, 150, 255]))

# ----------------------
# TTS Setup with queue
# ----------------------
engine = pyttsx3.init()
engine.setProperty('rate', 150)
speech_queue = queue.Queue()

def speak(text):
    print(f"[TTS]: {text}")
    speech_queue.put(text)
    # Broadcast to websockets
    broadcast_log({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"🔊 {text}",
        "type": "tts"
    })

def speech_loop():
    while True:
        text = speech_queue.get()
        if text is None:
            break
        engine.say(text)
        engine.runAndWait()

speech_thread = threading.Thread(target=speech_loop, daemon=True)
speech_thread.start()

# ----------------------
# Voice Recognition Setup
# ----------------------
recognizer = sr.Recognizer()
try:
    mic = sr.Microphone()
    with mic as source:
        recognizer.adjust_for_ambient_noise(source)
except:
    mic = None
    print("Warning: No microphone found")

# Track last spoken time for throttling
last_spoken_times = {}
SPEAK_INTERVAL = 5  # seconds

# ----------------------
# Color Detection Function
# ----------------------
def detect_colors(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    detected_colors = []

    for color_name, ranges in color_ranges.items():
        mask = None
        for (lower, upper) in ranges:
            if mask is None:
                mask = cv2.inRange(hsv, lower, upper)
            else:
                mask = cv2.bitwise_or(mask, cv2.inRange(hsv, lower, upper))

        # Remove skin interference
        skin_mask = cv2.inRange(hsv, skin_range[0], skin_range[1])
        mask = cv2.bitwise_and(mask, cv2.bitwise_not(skin_mask))

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            if cv2.contourArea(cnt) > 800:
                x, y, w, h = cv2.boundingRect(cnt)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame, color_name, (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                detected_colors.append(color_name)

    return frame, list(set(detected_colors))

# ----------------------
# Voice Control Thread
# ----------------------
def listen_commands():
    global system_status
    if not mic:
        return
    
    while True:
        try:
            with mic as source:
                print("🎤 Listening for command...")
                audio = recognizer.listen(source, timeout=None, phrase_time_limit=5)
            command = recognizer.recognize_google(audio).lower()
            print(f"🎤 Command: {command}")
            
            broadcast_log({
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": f"🎤 Voice Command: {command}",
                "type": "voice"
            })

            if "detect colors" in command or "detect colours" in command:
                system_status["detecting"] = True
                system_status["specific_color"] = None
                speak("Started detecting all colors")

            elif "detect" in command:
                for color in color_ranges.keys():
                    if color in command:
                        system_status["detecting"] = True
                        system_status["specific_color"] = color
                        speak(f"Started detecting {color}")
                        break

            elif "stop" in command:
                system_status["detecting"] = False
                system_status["specific_color"] = None
                speak("Stopped detecting colors")

        except sr.WaitTimeoutError:
            continue
        except sr.UnknownValueError:
            print("🎤 Could not understand audio")
        except sr.RequestError:
            print("🎤 Speech recognition service error.")
        except Exception as e:
            print(f"🎤 Voice command error: {e}")

# Start voice command listener
voice_thread = threading.Thread(target=listen_commands, daemon=True)
voice_thread.start()

# ----------------------
# WebSocket Broadcasting
# ----------------------
async def broadcast_log(log_data: Dict[str, Any]):
    """Broadcast log data to all connected WebSocket clients"""
    if websocket_connections:
        message = json.dumps(log_data)
        disconnected = []
        for websocket in websocket_connections:
            try:
                await websocket.send_text(message)
            except:
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for ws in disconnected:
            if ws in websocket_connections:
                websocket_connections.remove(ws)

def broadcast_log_sync(log_data: Dict[str, Any]):
    """Synchronous version for use in threads"""
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(broadcast_log(log_data))
    except:
        pass

# ----------------------
# Camera Setup
# ----------------------
camera = None
camera_lock = threading.Lock()

def init_camera():
    global camera
    try:
        # Try different camera indices
        for i in range(5):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                camera = cap
                print(f"📷 Camera initialized on index {i}")
                break
            cap.release()
        
        if camera:
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            camera.set(cv2.CAP_PROP_FPS, 30)
    except Exception as e:
        print(f"📷 Camera initialization error: {e}")

# Initialize camera
init_camera()

def generate_frames():
    global camera, system_status, last_spoken_times
    
    while True:
        try:
            with camera_lock:
                if camera is None or not camera.isOpened():
                    init_camera()
                    if camera is None:
                        time.sleep(1)
                        continue
                
                ret, frame = camera.read()
                if not ret:
                    continue

            current_time = time.time()

            if system_status["detecting"] and not system_status["system_paused"]:
                frame, colors_found = detect_colors(frame)
                system_status["detected_colors"] = colors_found
                system_status["last_detection_time"] = datetime.now().isoformat()

                if system_status["specific_color"]:
                    color = system_status["specific_color"]
                    if color in colors_found:
                        last_time = last_spoken_times.get(color, 0)
                        if current_time - last_time > SPEAK_INTERVAL:
                            try:
                                winsound.Beep(1000, 200)
                            except:
                                pass
                            speak(f"{color} detected")
                            last_spoken_times[color] = current_time
                            
                            broadcast_log_sync({
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "message": f"✅ {color.upper()} color detected!",
                                "type": "detection"
                            })
                    else:
                        last_time = last_spoken_times.get(f"notfound_{color}", 0)
                        if current_time - last_time > SPEAK_INTERVAL:
                            speak(f"{color} not found")
                            last_spoken_times[f"notfound_{color}"] = current_time
                else:
                    for color in colors_found:
                        last_time = last_spoken_times.get(color, 0)
                        if current_time - last_time > SPEAK_INTERVAL:
                            speak(f"{color} color")
                            last_spoken_times[color] = current_time
                            
                            broadcast_log_sync({
                                "timestamp": datetime.now().strftime("%H:%M:%S"),
                                "message": f"🎨 {color.upper()} color detected",
                                "type": "detection"
                            })

            # Add status overlay
            status_text = "🟢 DETECTING" if system_status["detecting"] else "⏸️ STOPPED"
            if system_status["specific_color"]:
                status_text += f" ({system_status['specific_color'].upper()})"
            
            cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            if system_status["system_paused"]:
                cv2.putText(frame, "⏸️ SYSTEM PAUSED", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)

            # Encode frame
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(0.033)  # ~30 FPS
            
        except Exception as e:
            print(f"📷 Frame generation error: {e}")
            time.sleep(1)

# ----------------------
# API Endpoints
# ----------------------
@app.get("/")
async def root():
    return {"message": "Color Detection System API", "status": "running"}

@app.get("/status")
async def get_status():
    return {
        **system_status,
        "connected_clients": len(websocket_connections),
        "camera_available": camera is not None and camera.isOpened(),
        "available_colors": list(color_ranges.keys())
    }

@app.post("/start-detection")
async def start_detection(color: str = None):
    system_status["detecting"] = True
    system_status["specific_color"] = color
    
    message = f"Started detecting {color}" if color else "Started detecting all colors"
    speak(message)
    
    await broadcast_log({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"▶️ {message}",
        "type": "system"
    })
    
    return {"status": "started", "detecting": color or "all_colors"}

@app.post("/stop-detection")
async def stop_detection():
    system_status["detecting"] = False
    system_status["specific_color"] = None
    speak("Stopped detecting colors")
    
    await broadcast_log({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": "⏹️ Color detection stopped",
        "type": "system"
    })
    
    return {"status": "stopped"}

@app.post("/page-visible")
async def page_visible():
    system_status["system_paused"] = False
    await broadcast_log({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": "👁️ Page is now visible - System resumed",
        "type": "system"
    })
    return {"system_paused": False}

@app.post("/page-hidden")
async def page_hidden():
    system_status["system_paused"] = True
    await broadcast_log({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": "👁️‍🗨️ Page hidden - System paused",
        "type": "paused"
    })
    return {"system_paused": True}

@app.post("/resume-system")
async def resume_system():
    system_status["system_paused"] = False
    await broadcast_log({
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": "🔄 System manually resumed",
        "type": "system"
    })
    return {"system_paused": False}

@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    system_status["connected_clients"] = len(websocket_connections)
    
    print(f"🌐 WebSocket client connected. Total: {len(websocket_connections)}")
    
    try:
        # Send initial connection message
        await websocket.send_text(json.dumps({
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": "🌐 Connected to Color Detection System",
            "type": "success"
        }))
        
        while True:
            # Keep connection alive
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                if message == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                await websocket.send_text("ping")
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"🌐 WebSocket error: {e}")
    finally:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)
        system_status["connected_clients"] = len(websocket_connections)
        print(f"🌐 WebSocket client disconnected. Total: {len(websocket_connections)}")

if __name__ == "__main__":
    print("🚀 Starting Color Detection System...")
    print("📋 Available voice commands:")
    print("   - 'detect colors' - Start detecting all colors")
    print("   - 'detect [color]' - Start detecting specific color")
    print("   - 'stop' - Stop detection")
    print("🌈 Available colors:", ", ".join(color_ranges.keys()))
    
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
