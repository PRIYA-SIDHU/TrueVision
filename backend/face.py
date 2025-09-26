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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


executor = ThreadPoolExecutor(max_workers=4)

# -------------------- GLOBAL VARIABLES --------------------
is_page_visible = True
active_video_clients = 0
system_paused = False
stranger_interaction_active = False
stranger_processed = set()
STRANGER_COOLDOWN_DURATION = 45
detected_persons = set()  # Track currently detected persons


url = "http://10.200.19.61:8080/video"


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


# -------------------- WEBSOCKET CONNECTION MANAGER --------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            async with self.connection_lock:
                self.active_connections.append(websocket)
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

    async def broadcast_detected_persons(self, persons_list):
        if not self.active_connections:
            return
            
        data = {
            "type": "detected_persons",
            "persons": persons_list,
            "timestamp": time.strftime("%H:%M:%S")
        }
        
        disconnected = []
        async with self.connection_lock:
            connections_copy = self.active_connections.copy()
            
        for connection in connections_copy:
            try:
                await connection.send_text(json.dumps(data))
            except Exception as e:
                disconnected.append(connection)
        
        if disconnected:
            async with self.connection_lock:
                for connection in disconnected:
                    if connection in self.active_connections:
                        self.active_connections.remove(connection)


manager = ConnectionManager()


# -------------------- UTILITY FUNCTIONS --------------------
def preprocess_face_image(face_img):
    try:
        return cv2.resize(face_img, (112, 112))
    except Exception as e:
        print(f"⚠️ Preprocessing error: {e}")
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
        return
        
    try:
        engine = init_tts()
        engine.say(text)
        engine.runAndWait()
        engine.stop()
    except Exception as e:
        print(f"⚠️ TTS error: {e}")


def listen_voice_threaded():
    if system_paused:
        return None
        
    try:
        r = sr.Recognizer()
        r.energy_threshold = 400
        r.dynamic_energy_threshold = True
        
        with sr.Microphone() as source:
            r.adjust_for_ambient_noise(source, duration=1)
            audio = r.listen(source, timeout=10, phrase_time_limit=5)
            
        text = r.recognize_google(audio).lower().strip()
        return text
        
    except sr.WaitTimeoutError:
        return None
    except sr.UnknownValueError:
        return None
    except Exception as e:
        print(f"⚠️ Voice recognition error: {e}")
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
        processed_face = preprocess_face_image(face_img)
        
        person_folder = os.path.join(DATASET_PATH, person_name)
        os.makedirs(person_folder, exist_ok=True)
        
        face_path = os.path.join(person_folder, f"{person_name}_{int(time.time())}.jpg")
        cv2.imwrite(face_path, processed_face)
        
        img = Image.fromarray(cv2.cvtColor(processed_face, cv2.COLOR_BGR2RGB))
        emb = ibed.to_embeddings(img)[0]
        
        cur.execute(
            "INSERT INTO persons (name, embedding) VALUES (%s, %s)",
            (person_name, emb.tolist())
        )
        conn.commit()
        
        tts_speak_threaded(f"{person_name} enrolled successfully")
        print(f"✅ {person_name} successfully enrolled!")
        
    except Exception as e:
        print(f"❌ Enrollment error: {e}")
        tts_speak_threaded("Error enrolling person")


def save_known_stranger_threaded(face_img):
    try:
        processed_face = preprocess_face_image(face_img)
        
        stranger_path = os.path.join(KNOWN_STRANGER_PATH, f"stranger_{int(time.time())}.jpg")
        cv2.imwrite(stranger_path, processed_face)
        
        img = Image.fromarray(cv2.cvtColor(processed_face, cv2.COLOR_BGR2RGB))
        emb = ibed.to_embeddings(img)[0]
        
        cur.execute(
            "INSERT INTO persons (name, embedding) VALUES (%s, %s)",
            ("Known Stranger", emb.tolist())
        )
        conn.commit()
        
        tts_speak_threaded("Saved as known stranger")
        print("✅ Person saved as known stranger")
        
    except Exception as e:
        print(f"❌ Error saving stranger: {e}")


def handle_stranger_interaction_instant(face_img, face_hash):
    global stranger_interaction_active
    
    if system_paused:
        return
    
    try:
        stranger_interaction_active = True
        stranger_processed.add((face_hash, time.time()))
        
        tts_speak_threaded("Stranger detected! Say yes to add them or no to skip.")
        
        response = listen_voice_threaded()
        
        if response is None:
            tts_speak_threaded("No response. Auto-saved as known stranger.")
            save_known_stranger_threaded(face_img)
            return
        
        if any(word in response for word in ["yes", "add", "enroll"]):
            tts_speak_threaded("Say the person's name.")
            
            person_name = listen_voice_threaded()
            
            if person_name and len(person_name.strip()) > 1:
                clean_name = " ".join(word.capitalize() for word in person_name.strip().split())
                
                enroll_new_person_threaded(clean_name, face_img)
                
                global known_names, known_embeddings
                known_names, known_embeddings = load_embeddings_avg()
                
            else:
                tts_speak_threaded("Invalid name. Saved as known stranger.")
                save_known_stranger_threaded(face_img)
        else:
            tts_speak_threaded("Saved as known stranger.")
            save_known_stranger_threaded(face_img)
            
    except Exception as e:
        print(f"❌ Stranger interaction error: {e}")
        tts_speak_threaded("Error occurred. Saved as known stranger.")
        save_known_stranger_threaded(face_img)
    finally:
        stranger_interaction_active = False


# -------------------- VIDEO PROCESSING --------------------
def generate_frames():
    global stranger_interaction_active, known_names, known_embeddings, active_video_clients, system_paused, detected_persons
    
    active_video_clients += 1
    
    try:
        cap = cv2.VideoCapture(url)
        
        if not cap.isOpened():
            print("❌ Failed to open camera")
            return 
        
        modelFile = "res10_300x300_ssd_iter_140000.caffemodel"
        configFile = "deploy.prototxt"
        
        if not os.path.exists(modelFile) or not os.path.exists(configFile):
            print("❌ Model files not found")
            return
            
        net = cv2.dnn.readNetFromCaffe(configFile, modelFile)
        
        DETECTION_CONFIDENCE = 0.6
        SIMILARITY_THRESHOLD = 0.88
        
        known_names, known_embeddings = load_embeddings_avg()
        
        frame_count = 0
        last_broadcast = 0
        
        while active_video_clients > 0:
            
            if system_paused:
                time.sleep(1)
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
                break
                
            frame_count += 1
            current_detected = set()
            
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
                    
                    # Only add to detected if not "Known Stranger"
                    if name != "Known Stranger":
                        current_detected.add(name)
                    
                else:
                    is_processed = any(processed_hash == face_hash for processed_hash, _ in stranger_processed)
                    
                    if is_processed:
                        name = "Known Stranger"
                        color = (128, 128, 128)
                    else:
                        name = "🚨 NEW STRANGER!"
                        color = (0, 0, 255)
                        
                        if not stranger_interaction_active and not system_paused:
                            threading.Thread(
                                target=handle_stranger_interaction_instant,
                                args=(processed_face.copy(), face_hash),
                                daemon=True
                            ).start()
                
                cv2.rectangle(frame_small, (x, y), (x2, y2), color, 2)
                
                label = f"{name} ({best_score:.2f})"
                cv2.putText(frame_small, label, (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            
            # Update detected persons and broadcast if changed
            if current_detected != detected_persons:
                detected_persons = current_detected.copy()
                # Broadcast to WebSocket clients
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(manager.broadcast_detected_persons(list(detected_persons)))
                    loop.close()
                except:
                    pass
            
            ret, buffer = cv2.imencode('.jpg', frame_small)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        cap.release()
        
    except Exception as e:
        print(f"❌ Camera error: {e}")
    finally:
        active_video_clients -= 1


# -------------------- WEBSOCKET ENDPOINT --------------------
@app.websocket("/ws/detected_persons")
async def websocket_detected_persons(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                if message == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                break
            except Exception as e:
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket endpoint error: {e}")
    finally:
        await manager.disconnect(websocket)


# -------------------- REST ENDPOINTS --------------------
@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/detected_persons")
async def get_detected_persons():
    return {"detected_persons": list(detected_persons)}


@app.post("/api/resume-system")
async def resume_system():
    global is_page_visible, system_paused
    is_page_visible = True
    system_paused = False
    return {"status": "resumed", "system_paused": system_paused}


@app.get("/")
async def root():
    return {"message": "⚡ Face Recognition API"}


@app.get("/status")
async def get_status():
    return {
        "interaction_active": stranger_interaction_active,
        "processed_strangers": len(stranger_processed),
        "active_connections": len(manager.active_connections),
        "similarity_threshold": 0.88,
        "known_persons": len([n for n in known_names if n != 'Known Stranger']) if 'known_names' in globals() else 0,
        "page_visible": is_page_visible,
        "system_paused": system_paused,
        "active_video_clients": active_video_clients,
        "detected_persons": list(detected_persons)
    }


if __name__ == "__main__":
    import uvicorn
    print("⚡ FACE RECOGNITION SYSTEM STARTING ⚡")
    uvicorn.run(app, host="127.0.0.1", port=8000)
