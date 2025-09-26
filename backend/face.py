import cv2
import psycopg2
import numpy as np
from PIL import Image
from imgbeddings import imgbeddings
import pyttsx3
import speech_recognition as sr
import time
import os
import sys
from dotenv import load_dotenv
import threading
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
import hashlib
from typing import List
import logging


# -------------------- PATH SETUP --------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset")
KNOWN_STRANGER_PATH = os.path.join(DATASET_PATH, "Known_Stranger")
os.makedirs(KNOWN_STRANGER_PATH, exist_ok=True)
load_dotenv()


# -------------------- FASTAPI SETUP --------------------
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


executor = ThreadPoolExecutor(max_workers=4)

# -------------------- PAGE VISIBILITY CONTROL --------------------
is_page_visible = True
active_video_clients = 0
system_paused = False


# -------------------- ENHANCED WEBSOCKET CONNECTION MANAGER --------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            async with self.connection_lock:
                self.active_connections.append(websocket)
            await self.broadcast_log("🌐 Client connected to real-time logs", "success")
            print(f"✅ WebSocket connected. Total: {len(self.active_connections)}")
        except Exception as e:
            print(f"❌ WebSocket connect error: {e}")

    async def disconnect(self, websocket: WebSocket):
        try:
            async with self.connection_lock:
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
            print(f"🔌 WebSocket disconnected. Total: {len(self.active_connections)}")
        except Exception as e:
            print(f"❌ WebSocket disconnect error: {e}")

    async def broadcast_log(self, message: str, log_type: str = "info"):
        if not self.active_connections:
            return
            
        log_data = {
            "timestamp": time.strftime("%H:%M:%S"),
            "message": message,
            "type": log_type
        }
        
        disconnected = []
        async with self.connection_lock:
            connections_copy = self.active_connections.copy()
            
        for connection in connections_copy:
            try:
                await connection.send_text(json.dumps(log_data))
            except Exception as e:
                print(f"⚠️ Failed to send to WebSocket: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        if disconnected:
            async with self.connection_lock:
                for connection in disconnected:
                    if connection in self.active_connections:
                        self.active_connections.remove(connection)


manager = ConnectionManager()


# -------------------- FIXED LOGGING FUNCTION --------------------
def log_to_terminal_and_web_sync(message: str, log_type: str = "info"):
    """Synchronous logging function for non-async contexts"""
    print(f"📱 {message}")  # Terminal output
    
    # Try to send to web, but don't fail if no event loop
    try:
        # Get current event loop if exists
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule the async task
            asyncio.create_task(manager.broadcast_log(message, log_type))
    except RuntimeError:
        # No event loop running, just log to terminal
        pass


async def log_to_terminal_and_web_async(message: str, log_type: str = "info"):
    """Async logging function for async contexts"""
    print(f"📱 {message}")  # Terminal output
    await manager.broadcast_log(message, log_type)  # Web output


# -------------------- GLOBALS --------------------
stranger_interaction_active = False
stranger_processed = set()
STRANGER_COOLDOWN_DURATION = 45


url = "http://10.215.67.197:8080/video"


# -------------------- DB CONNECTION --------------------
DB_URL = os.getenv("DB_URL")
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()


cur.execute("""
CREATE TABLE IF NOT EXISTS persons (
    id SERIAL PRIMARY KEY,
    name TEXT,
    embedding FLOAT8[]
)
""")
conn.commit()


ibed = imgbeddings()


# -------------------- FUNCTIONS WITH PAUSE CONTROL --------------------
def preprocess_face_image(face_img):
    try:
        return cv2.resize(face_img, (112, 112))
    except Exception as e:
        log_to_terminal_and_web_sync(f"⚠️ Preprocessing error: {e}", "warning")
        return face_img


def get_face_hash(face_embedding):
    try:
        embedding_str = str(face_embedding.round(2))
        return hashlib.md5(embedding_str.encode()).hexdigest()[:8]
    except Exception as e:
        return str(time.time())


def cleanup_processed_strangers():
    current_time = time.time()
    expired = []
    
    for stranger_data in list(stranger_processed):
        if current_time - stranger_data[1] > STRANGER_COOLDOWN_DURATION:
            expired.append(stranger_data)
    
    for exp in expired:
        stranger_processed.discard(exp)


def init_tts():
    engine = pyttsx3.init()
    engine.setProperty('rate', 180)
    engine.setProperty('volume', 0.9)
    return engine


def tts_speak_threaded(text):
    if system_paused:
        log_to_terminal_and_web_sync(f"🔇 TTS Paused (system paused): {text}", "paused")
        return
        
    try:
        engine = init_tts()
        log_to_terminal_and_web_sync(f"🔊 TTS Speaking: {text}", "tts")
        engine.say(text)
        engine.runAndWait()
        engine.stop()
    except Exception as e:
        log_to_terminal_and_web_sync(f"⚠️ TTS error: {e}", "error")


def listen_voice_threaded():
    if system_paused:
        log_to_terminal_and_web_sync("🔇 Voice recognition paused (system paused)", "paused")
        return None
        
    try:
        log_to_terminal_and_web_sync("🎤 Starting voice recognition...", "voice")
        
        r = sr.Recognizer()
        r.energy_threshold = 400
        r.dynamic_energy_threshold = True
        
        with sr.Microphone() as source:
            log_to_terminal_and_web_sync("🎤 Adjusting for ambient noise...", "voice")
            r.adjust_for_ambient_noise(source, duration=1)
            log_to_terminal_and_web_sync("🎤 Listening for your response...", "voice")
            audio = r.listen(source, timeout=10, phrase_time_limit=5)
            
        log_to_terminal_and_web_sync("🎤 Processing your speech...", "voice")
        text = r.recognize_google(audio).lower().strip()
        log_to_terminal_and_web_sync(f"✅ You said: '{text}'", "user_input")
        return text
        
    except sr.WaitTimeoutError:
        log_to_terminal_and_web_sync("⚠️ Voice timeout - no speech detected", "warning")
        return None
    except sr.UnknownValueError:
        log_to_terminal_and_web_sync("⚠️ Could not understand your speech", "warning")
        return None
    except Exception as e:
        log_to_terminal_and_web_sync(f"⚠️ Voice recognition error: {e}", "error")
        return None


def load_embeddings_avg():
    cur.execute("SELECT name, embedding FROM persons")
    rows = cur.fetchall()
    embeddings_dict = defaultdict(list)
    
    for name, emb in rows:
        embeddings_dict[name].append(np.array(emb))
    
    names, embeddings = [], []
    for name, emb_list in embeddings_dict.items():
        avg_emb = np.mean(emb_list, axis=0)
        names.append(name)
        embeddings.append(avg_emb)
    
    return names, embeddings


def simple_cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def enroll_new_person_threaded(person_name, face_img):
    try:
        log_to_terminal_and_web_sync(f"📝 Starting enrollment for: {person_name}", "enrollment")
        
        processed_face = preprocess_face_image(face_img)
        
        person_folder = os.path.join(DATASET_PATH, person_name)
        os.makedirs(person_folder, exist_ok=True)
        
        face_path = os.path.join(person_folder, f"{person_name}_{int(time.time())}.jpg")
        cv2.imwrite(face_path, processed_face)
        
        log_to_terminal_and_web_sync(f"📸 Face image saved: {face_path}", "enrollment")
        
        img = Image.fromarray(cv2.cvtColor(processed_face, cv2.COLOR_BGR2RGB))
        emb = ibed.to_embeddings(img)[0]
        
        cur.execute(
            "INSERT INTO persons (name, embedding) VALUES (%s, %s)",
            (person_name, emb.tolist())
        )
        conn.commit()
        
        log_to_terminal_and_web_sync(f"💾 Database updated with {person_name}'s data", "enrollment")
        tts_speak_threaded(f"{person_name} enrolled successfully")
        log_to_terminal_and_web_sync(f"✅ {person_name} successfully enrolled!", "success")
        
    except Exception as e:
        log_to_terminal_and_web_sync(f"❌ Enrollment error: {e}", "error")
        tts_speak_threaded("Error enrolling person")


def save_known_stranger_threaded(face_img):
    try:
        log_to_terminal_and_web_sync("⚠️ Saving person as known stranger", "stranger")
        
        processed_face = preprocess_face_image(face_img)
        
        stranger_path = os.path.join(KNOWN_STRANGER_PATH, f"stranger_{int(time.time())}.jpg")
        cv2.imwrite(stranger_path, processed_face)
        
        log_to_terminal_and_web_sync(f"📸 Stranger image saved: {stranger_path}", "stranger")
        
        img = Image.fromarray(cv2.cvtColor(processed_face, cv2.COLOR_BGR2RGB))
        emb = ibed.to_embeddings(img)[0]
        
        cur.execute(
            "INSERT INTO persons (name, embedding) VALUES (%s, %s)",
            ("Known Stranger", emb.tolist())
        )
        conn.commit()
        
        tts_speak_threaded("Saved as known stranger")
        log_to_terminal_and_web_sync("✅ Person saved as known stranger", "success")
        
    except Exception as e:
        log_to_terminal_and_web_sync(f"❌ Error saving stranger: {e}", "error")


def handle_stranger_interaction_instant(face_img, face_hash):
    global stranger_interaction_active
    
    if system_paused:
        log_to_terminal_and_web_sync("⏸️ Stranger interaction paused (system paused)", "paused")
        return
    
    try:
        stranger_interaction_active = True
        stranger_processed.add((face_hash, time.time()))
        
        log_to_terminal_and_web_sync("🚨 NEW STRANGER DETECTED - Starting interaction!", "stranger")
        
        tts_speak_threaded("Stranger detected! Say yes to add them or no to skip.")
        
        response = listen_voice_threaded()
        
        if response is None:
            log_to_terminal_and_web_sync("⚠️ No response received - auto-saving as known stranger", "warning")
            tts_speak_threaded("No response. Auto-saved as known stranger.")
            save_known_stranger_threaded(face_img)
            return
            
        log_to_terminal_and_web_sync(f"📝 User response received: '{response}'", "user_input")
        
        if any(word in response for word in ["yes", "add", "enroll"]):
            log_to_terminal_and_web_sync("✅ User wants to enroll new person", "enrollment")
            tts_speak_threaded("Say the person's name.")
            
            person_name = listen_voice_threaded()
            
            if person_name and len(person_name.strip()) > 1:
                clean_name = " ".join(word.capitalize() for word in person_name.strip().split())
                log_to_terminal_and_web_sync(f"📝 Enrolling person as: '{clean_name}'", "enrollment")
                
                enroll_new_person_threaded(clean_name, face_img)
                
                global known_names, known_embeddings
                known_names, known_embeddings = load_embeddings_avg()
                
            else:
                log_to_terminal_and_web_sync("⚠️ Invalid name received", "warning")
                tts_speak_threaded("Invalid name. Saved as known stranger.")
                save_known_stranger_threaded(face_img)
        else:
            log_to_terminal_and_web_sync("❌ User declined enrollment", "info")
            tts_speak_threaded("Saved as known stranger.")
            save_known_stranger_threaded(face_img)
            
    except Exception as e:
        log_to_terminal_and_web_sync(f"❌ Stranger interaction error: {e}", "error")
        tts_speak_threaded("Error occurred. Saved as known stranger.")
        save_known_stranger_threaded(face_img)
    finally:
        stranger_interaction_active = False
        log_to_terminal_and_web_sync("✅ Stranger interaction completed", "success")


# -------------------- VIDEO PROCESSING WITH CLIENT TRACKING --------------------
def generate_frames():
    global stranger_interaction_active, known_names, known_embeddings, active_video_clients, system_paused
    
    # Track active video clients
    active_video_clients += 1
    
    try:
        log_to_terminal_and_web_sync("🎥 Starting camera and face detection system", "system")
        
        cap = cv2.VideoCapture(url)
        
        if not cap.isOpened():
            log_to_terminal_and_web_sync("❌ Failed to open camera", "error")
            return 
        
        modelFile = "res10_300x300_ssd_iter_140000.caffemodel"
        configFile = "deploy.prototxt"
        
        if not os.path.exists(modelFile) or not os.path.exists(configFile):
            log_to_terminal_and_web_sync("❌ Model files not found", "error")
            return
            
        net = cv2.dnn.readNetFromCaffe(configFile, modelFile)
        
        DETECTION_CONFIDENCE = 0.6
        SIMILARITY_THRESHOLD = 0.88
        
        known_names, known_embeddings = load_embeddings_avg()
        
        log_to_terminal_and_web_sync(f"📊 System initialized - Threshold: {SIMILARITY_THRESHOLD}", "system")
        log_to_terminal_and_web_sync(f"👥 Known persons in database: {len([n for n in known_names if n != 'Known Stranger'])}", "system")
        
        frame_count = 0
        
        while active_video_clients > 0:
            
            # Pause check
            if system_paused:
                time.sleep(1)
                
                # Create a simple pause frame
                pause_frame = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(pause_frame, "SYSTEM PAUSED", (200, 220), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                cv2.putText(pause_frame, "Click Resume to continue", (180, 260), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                ret, buffer = cv2.imencode('.jpg', pause_frame)
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                continue
                
            ret, frame = cap.read()
            if not ret:
                log_to_terminal_and_web_sync("❌ Failed to read frame from camera", "error")
                break
                
            frame_count += 1
            
            if frame_count % 60 == 0:
                cleanup_processed_strangers()
                
            frame_small = cv2.resize(frame, (640, 480))
            
            (h, w) = frame_small.shape[:2]
            blob = cv2.dnn.blobFromImage(
                cv2.resize(frame_small, (300, 300)), 
                1.0, (300, 300), 
                (104.0, 177.0, 123.0)
            )
            net.setInput(blob)
            detections = net.forward()
            
            for i in range(detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                if confidence < DETECTION_CONFIDENCE:
                    continue
                    
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (x, y, x2, y2) = box.astype("int")
                
                if (x < 0 or y < 0 or x2 > w or y2 > h or 
                    x2 <= x or y2 <= y or 
                    (x2-x) < 50 or (y2-y) < 50):
                    continue
                    
                face_img = frame_small[y:y2, x:x2]
                if face_img.size == 0:
                    continue
                
                processed_face = preprocess_face_image(face_img)
                
                try:
                    pil_face = Image.fromarray(cv2.cvtColor(processed_face, cv2.COLOR_BGR2RGB))
                    face_emb = ibed.to_embeddings(pil_face)[0]
                    face_hash = get_face_hash(face_emb)
                    
                except Exception as e:
                    continue
                
                best_score = -1
                best_name = None
                
                for known_name, known_emb in zip(known_names, known_embeddings):
                    score = simple_cosine_similarity(face_emb, known_emb)
                    if score > best_score:
                        best_score = score
                        best_name = known_name
                
                if best_score >= SIMILARITY_THRESHOLD:
                    name = best_name
                    color = (0, 255, 0)
                    
                    if frame_count % 60 == 0:
                        log_to_terminal_and_web_sync(f"👤 {best_name} recognized (confidence: {best_score:.2f})", "recognition")
                    
                else:
                    is_processed = any(processed_hash == face_hash for processed_hash, _ in stranger_processed)
                    
                    if is_processed:
                        name = "Known Stranger"
                        color = (128, 128, 128)
                    else:
                        name = "🚨 NEW STRANGER!"
                        color = (0, 0, 255)
                        
                        log_to_terminal_and_web_sync(f"🚨 NEW STRANGER DETECTED! Similarity score: {best_score:.3f}", "detection")
                        
                        if not stranger_interaction_active and not system_paused:
                            log_to_terminal_and_web_sync("⚡ Starting INSTANT interaction...", "system")
                            threading.Thread(
                                target=handle_stranger_interaction_instant,
                                args=(processed_face.copy(), face_hash),
                                daemon=True
                            ).start()
                
                cv2.rectangle(frame_small, (x, y), (x2, y2), color, 2)
                
                label = f"{name} ({best_score:.2f})"
                cv2.putText(frame_small, label, (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
            # Enhanced status display
            pause_status = "⏸️ PAUSED" if system_paused else "▶️ ACTIVE"
            status_lines = [
                f"⚡ REAL-TIME LOGGING {pause_status}",
                f"THRESHOLD: {SIMILARITY_THRESHOLD}",
                f"INTERACTION: {'🔴 ACTIVE' if stranger_interaction_active else '🟢 READY'}",
                f"PROCESSED: {len(stranger_processed)}",
                f"KNOWN: {len([n for n in known_names if n != 'Known Stranger'])}",
                f"CLIENTS: {active_video_clients}"
            ]
            
            for i, status in enumerate(status_lines):
                if i == 0:
                    color = (255, 0, 0) if system_paused else (0, 255, 255)
                elif i == 2 and stranger_interaction_active:
                    color = (0, 0, 255)
                else:
                    color = (255, 255, 255)
                
                cv2.putText(frame_small, status, (10, 25 + i * 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            ret, buffer = cv2.imencode('.jpg', frame_small)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        cap.release()
        
    except Exception as e:
        log_to_terminal_and_web_sync(f"❌ Camera error: {e}", "error")
    finally:
        active_video_clients -= 1
        if active_video_clients <= 0:
            log_to_terminal_and_web_sync("⏹️ No active video clients", "system")


# -------------------- ROBUST WEBSOCKET ENDPOINT --------------------
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                # Keep connection alive with ping/pong
                message = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                if message == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Normal timeout, continue loop
                continue
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket endpoint error: {e}")
    finally:
        await manager.disconnect(websocket)


# -------------------- PAGE VISIBILITY CONTROL ENDPOINTS --------------------
@app.post("/api/page-visible")
async def set_page_visible():
    global is_page_visible, system_paused
    is_page_visible = True
    system_paused = False
    await log_to_terminal_and_web_async("👁️ Page is now VISIBLE - System RESUMED", "system")
    return {"status": "visible", "system_paused": system_paused}


@app.post("/api/page-hidden")
async def set_page_hidden():
    global is_page_visible, system_paused
    is_page_visible = False
    system_paused = True
    await log_to_terminal_and_web_async("👁️ Page is now HIDDEN - System PAUSED", "system")
    return {"status": "hidden", "system_paused": system_paused}


@app.post("/api/resume-system")
async def resume_system():
    global is_page_visible, system_paused
    is_page_visible = True
    system_paused = False
    await log_to_terminal_and_web_async("🔄 System MANUALLY RESUMED", "system")
    return {"status": "resumed", "system_paused": system_paused}


# -------------------- REST ENDPOINTS --------------------
@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/")
async def root():
    return {"message": "⚡ Real-time Face Recognition API with Live Logging"}


@app.get("/status")
async def get_status():
    return {
        "mode": "REAL_TIME_LOGGING",
        "interaction_active": stranger_interaction_active,
        "processed_strangers": len(stranger_processed),
        "active_connections": len(manager.active_connections),
        "similarity_threshold": 0.88,
        "known_persons": len([n for n in known_names if n != 'Known Stranger']) if 'known_names' in globals() else 0,
        "page_visible": is_page_visible,
        "system_paused": system_paused,
        "active_video_clients": active_video_clients
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "system_paused": system_paused,
        "active_connections": len(manager.active_connections)
    }


if __name__ == "__main__":
    import uvicorn
    print("⚡⚡⚡ REAL-TIME FACE RECOGNITION WITH LIVE LOGGING ⚡⚡⚡")
    print("🚀 Features:")
    print("   📱 Live terminal output on React page")
    print("   🔥 Real-time WebSocket communication")
    print("   ⚡ Instant stranger detection")
    print("   🎤 Voice interaction logging")
    print("   📊 System status monitoring")
    print("   👁️ PAGE VISIBILITY CONTROL - Auto pause/resume")
    print("   🔗 ROBUST CONNECTION MANAGEMENT")
    uvicorn.run(app, host="127.0.0.1", port=8000)
