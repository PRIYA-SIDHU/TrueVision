"""
===============================
ENGLISH VISION VOICE ASSISTANT - WITH CONVERSATION LOGGING
===============================
"""

import warnings
warnings.filterwarnings('ignore')

import threading
import queue
import time
import math
import sys
import numpy as np
import cv2
from datetime import datetime
import asyncio
import json
import hashlib
from typing import List
from concurrent.futures import ThreadPoolExecutor

# FastAPI imports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

try:
    from ultralytics import YOLO
    import speech_recognition as sr
    import pyttsx3
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Please install required packages: pip install ultralytics speechrecognition pyttsx3 pyaudio")
    sys.exit(1)

# ====== CONFIGURATION SETTINGS ======
CAMERA_URL = "http://10.215.67.197:8080/video"
LAPTOP_CAMERA_INDEX = 0
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
DEPTH_PROCESSING_SKIP = 2
DETECTION_CONFIDENCE = 0.5
ANGLE_THRESHOLD = 25
DEPTH_PATCH_SIZE = 7
CALIBRATION_TARGET_DISTANCE = 1.0
INITIAL_DEPTH_SCALE = 2.5
MINIMUM_ALERT_DISTANCE = 1.0
USE_GRAYSCALE_MODE = False

REAL_OBJECT_HEIGHTS = {
    "person": 1.7,
    "chair": 1.0,
    "bottle": 0.25,
    "car": 1.5,
    "laptop": 0.02
}
REAL_OBJECT_WIDTHS = {
    "person": 0.5,
    "chair": 0.45,
    "bottle": 0.07,
    "car": 1.7,
    "laptop": 0.31
}

# -------------------- FASTAPI SETUP --------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=4)

# -------------------- WEBSOCKET CONNECTION MANAGER --------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.broadcast_log("🌐 English Vision Assistant connected", "success")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_log(self, message: str, log_type: str = "info"):
        if self.active_connections:
            log_data = {
                "timestamp": time.strftime("%H:%M:%S"),
                "message": message,
                "type": log_type
            }
            
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(json.dumps(log_data))
                except:
                    disconnected.append(connection)
            
            for connection in disconnected:
                self.active_connections.remove(connection)

manager = ConnectionManager()

# -------------------- LOGGING FUNCTIONS --------------------
def log_to_terminal_and_web_sync(message: str, log_type: str = "info"):
    """Synchronous logging for non-async contexts"""
    print(f"📱 {message}")
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(manager.broadcast_log(message, log_type))
    except RuntimeError:
        pass

# -------------------- CONVERSATION LOGGING --------------------
def log_conversation(speaker: str, message: str, conv_type: str = "conversation"):
    """Log conversations between user and assistant"""
    if speaker == "user":
        log_message = f"👤 You: {message}"
        log_type = "user_speech"
    elif speaker == "assistant":
        log_message = f"🤖 Assistant: {message}"
        log_type = "assistant_speech"
    elif speaker == "warning":
        log_message = f"⚠️ Warning: {message}"
        log_type = "warning_speech"
    else:
        log_message = f"💬 {speaker}: {message}"
        log_type = "conversation"
    
    log_to_terminal_and_web_sync(log_message, log_type)

# -------------------- GLOBAL VARIABLES --------------------
command_queue = queue.Queue()
latest_scene_data = []
scene_data_lock = threading.Lock()
stop_program_event = threading.Event()
current_depth_scale = INITIAL_DEPTH_SCALE
is_depth_calibrated = False
is_currently_speaking = threading.Event()
microphone_is_active = threading.Event()
last_warning_time_class = {}
WARNING_COOLDOWN = 5.0

# -------------------- WORKING TTS SYSTEM --------------------
def create_tts_engine():
    """Create a fresh TTS engine instance"""
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 180)
        engine.setProperty('volume', 1.0)
        
        # Set voice to first available voice
        voices = engine.getProperty('voices')
        if voices and len(voices) > 0:
            engine.setProperty('voice', voices[0].id)
        
        return engine
    except Exception as e:
        log_to_terminal_and_web_sync(f"⚠️ TTS Engine creation error: {e}", "error")
        return None

def speak_text_directly(text, speaker="assistant"):
    """Direct TTS execution in separate thread"""
    def _speak():
        try:
            # Log the conversation
            log_conversation(speaker, text)
            
            engine = create_tts_engine()
            if engine is None:
                log_to_terminal_and_web_sync("❌ Could not create TTS engine", "error")
                return
            
            # Set speaking flag
            is_currently_speaking.set()
            
            # Speak the text
            engine.say(text)
            engine.runAndWait()
            
            # Clean up
            engine.stop()
            del engine
            
        except Exception as e:
            log_to_terminal_and_web_sync(f"❌ TTS execution error: {e}", "error")
        finally:
            # Clear speaking flag
            is_currently_speaking.clear()
    
    # Run in separate thread
    try:
        thread = threading.Thread(target=_speak, daemon=True)
        thread.start()
    except Exception as e:
        log_to_terminal_and_web_sync(f"❌ TTS thread creation error: {e}", "error")

def speak_text(text, speaker="assistant"):
    """Main speak function with conversation logging"""
    speak_text_directly(text, speaker)

# -------------------- UTILITY FUNCTIONS --------------------
def determine_side_from_angle(angle_degrees, threshold=ANGLE_THRESHOLD):
    if angle_degrees < -threshold:
        return "left"
    elif angle_degrees > threshold:
        return "right"
    else:
        return "center"

def create_camera_intrinsics(image_width, image_height):
    focal_length = 0.9 * image_width
    return {
        'fx': focal_length,
        'fy': focal_length,
        'cx': image_width / 2,
        'cy': image_height / 2
    }

def convert_pixel_to_camera_coordinates(pixel_u, pixel_v, depth_z, camera_intrinsics):
    x = (pixel_u - camera_intrinsics['cx']) * depth_z / camera_intrinsics['fx']
    y = (pixel_v - camera_intrinsics['cy']) * depth_z / camera_intrinsics['fy']
    z = depth_z
    return np.array([x, y, z])

def get_focal_length(frame_width, fov_deg=60):
    return frame_width / (2 * math.tan(math.radians(fov_deg / 2)))

def calculate_distance(bbox, obj_class, frame_height, frame_width):
    x1, y1, x2, y2 = bbox
    h_pixel = y2 - y1
    w_pixel = x2 - x1
    focal_length = get_focal_length(frame_width)
    if obj_class in REAL_OBJECT_HEIGHTS and h_pixel > 0:
        real_height = REAL_OBJECT_HEIGHTS[obj_class]
        distance = (real_height * focal_length) / h_pixel
    elif obj_class in REAL_OBJECT_WIDTHS and w_pixel > 0:
        real_width = REAL_OBJECT_WIDTHS[obj_class]
        distance = (real_width * focal_length) / w_pixel
    else:
        distance = 3.0
    return round(max(0.2, min(12.0, distance)), 2)

# -------------------- DEPTH MODEL --------------------
class SimpleDepthModel:
    def __init__(self):
        self.previous_depth = None
        
    def estimate_depth(self, frame):
        height, width = frame.shape[:2]
        vertical_gradient = np.linspace(0, 1, height)[:, None]
        horizontal_gradient = np.abs(np.linspace(-0.5, 0.5, width)[None, :])
        noise = np.random.normal(0, 0.05, (height, width))
        depth_map = np.clip(
            0.1 + 0.7 * vertical_gradient + 0.1 * horizontal_gradient + noise,
            0.05, 0.95
        )
        if self.previous_depth is not None:
            depth_map = 0.7 * depth_map + 0.3 * self.previous_depth
        self.previous_depth = depth_map.copy()
        return depth_map

# -------------------- OBJECT DETECTOR --------------------
class ObjectDetector:
    def __init__(self, model_name="yolov8n.pt"):
        try:
            self.yolo_model = YOLO(model_name)
            self.class_names = self.yolo_model.names
            log_to_terminal_and_web_sync(f"✅ Loaded YOLO model: {model_name}", "system")
        except Exception as e:
            log_to_terminal_and_web_sync(f"❌ Error loading YOLO model: {e}", "error")
            sys.exit(1)

    def detect_objects(self, frame):
        global DETECTION_CONFIDENCE
        detected_objects = []
        confidence_levels = [
            DETECTION_CONFIDENCE,
            max(0.15, DETECTION_CONFIDENCE - 0.1),
            min(0.9, DETECTION_CONFIDENCE + 0.1)
        ]
        
        for confidence in confidence_levels:
            try:
                results = self.yolo_model(frame, imgsz=640, conf=confidence, verbose=False)
                if results and results[0].boxes:
                    for box in results[0].boxes:
                        try:
                            confidence_score = float(box.conf[0])
                            class_id = int(box.cls[0])
                            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                            box_width = x2 - x1
                            box_height = y2 - y1
                            frame_height, frame_width = frame.shape[:2]
                            
                            if (box_width < 15 or box_height < 15 or
                                box_width > frame_width * 0.85 or
                                box_height > frame_height * 0.85):
                                continue
                                
                            class_name = self.class_names.get(class_id, f"object_{class_id}")
                            
                            is_duplicate = False
                            for existing_obj in detected_objects:
                                ex1, ey1, ex2, ey2 = existing_obj['bbox']
                                overlap_x = max(0, min(x2, ex2) - max(x1, ex1))
                                overlap_y = max(0, min(y2, ey2) - max(y1, ey1))
                                overlap_area = overlap_x * overlap_y
                                current_area = box_width * box_height
                                if overlap_area > current_area * 0.3:
                                    if confidence_score > existing_obj['confidence']:
                                        detected_objects = [obj for obj in detected_objects if obj != existing_obj]
                                    else:
                                        is_duplicate = True
                                    break
                                    
                            if not is_duplicate:
                                detected_objects.append({
                                    'class': class_name,
                                    'confidence': confidence_score,
                                    'bbox': [x1, y1, x2, y2]
                                })
                        except Exception as e:
                            continue
            except Exception as e:
                continue
                
            if len(detected_objects) >= 12:
                break
                
        detected_objects.sort(key=lambda x: -x['confidence'])
        return detected_objects[:12]

# -------------------- VOICE RECOGNITION --------------------
def voice_recognition_thread():
    global microphone_is_active
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True
    recognizer.pause_threshold = 0.6
    
    try:
        microphone = sr.Microphone()
        microphone_is_active.set()
        with microphone:
            recognizer.adjust_for_ambient_noise(microphone, duration=2)
        
        log_to_terminal_and_web_sync("🎤 Voice recognition initialized", "voice")
        speak_text("English Vision Assistant is ready! Say 'help' for commands.")
        
        while not stop_program_event.is_set():
            try:
                if not is_currently_speaking.is_set() and microphone_is_active.is_set():
                    with microphone:
                        audio = recognizer.listen(microphone, timeout=2, phrase_time_limit=6)
                    try:
                        command_text = recognizer.recognize_google(audio, language='en-US').lower().strip()
                        if len(command_text) > 2:
                            # Log user's speech in conversation format
                            log_conversation("user", command_text)
                            command_queue.put(command_text)
                    except sr.UnknownValueError:
                        pass
                    except sr.RequestError as e:
                        log_to_terminal_and_web_sync(f"⚠️ Speech recognition error: {e}", "warning")
                else:
                    time.sleep(0.1)
            except sr.WaitTimeoutError:
                continue
            except Exception as e:
                log_to_terminal_and_web_sync(f"⚠️ Voice recognition error: {e}", "error")
                time.sleep(0.5)
    except Exception as e:
        log_to_terminal_and_web_sync(f"❌ Microphone initialization error: {e}", "error")
        microphone_is_active.clear()

# -------------------- VOICE COMMAND PROCESSING --------------------
def process_voice_command(command_text):
    global latest_scene_data
    
    with scene_data_lock:
        current_scene = latest_scene_data.copy()
    
    log_to_terminal_and_web_sync(f"🤖 Processing command: {command_text}", "command")
    
    def format_object_list(objects):
        if not objects:
            return "nothing"
        object_counts = {}
        for obj in objects:
            class_name = obj['class']
            object_counts[class_name] = object_counts.get(class_name, 0) + 1
        formatted_items = []
        for class_name, count in object_counts.items():
            if count > 1:
                formatted_items.append(f"{count} {class_name}s")
            else:
                formatted_items.append(class_name)
        return ", ".join(formatted_items)
    
    # Process different command types
    if any(keyword in command_text for keyword in ['screen', 'see', 'describe', 'everything', 'what']):
        if not current_scene:
            speak_text("The screen appears to be empty")
            return
        
        log_to_terminal_and_web_sync(f"📊 Found {len(current_scene)} objects on screen", "detection")
        speak_text(f"I can see {len(current_scene)} objects on screen")
        
        time.sleep(1)  # Short pause between sentences
        
        for side in ['left', 'center', 'right']:
            side_objects = [obj for obj in current_scene if obj['side'] == side]
            if side_objects:
                speak_text(f"On the {side}: {format_object_list(side_objects)}")
                time.sleep(0.5)
        
        if current_scene:
            closest_object = min(current_scene, key=lambda x: x['distance_meters'])
            speak_text(f"The closest object is {closest_object['class']} at {closest_object['distance_meters']:.1f} meters")
    
    elif any(keyword in command_text for keyword in ['left', 'right', 'center', 'front', 'middle']):
        target_side = None
        for side in ['left', 'right', 'center']:
            if side in command_text:
                target_side = side
                break
        
        if target_side:
            side_objects = [obj for obj in current_scene if obj['side'] == target_side]
            if side_objects:
                speak_text(f"On the {target_side} side I see: {format_object_list(side_objects)}")
            else:
                speak_text(f"I don't see any objects on the {target_side} side")
    
    elif any(keyword in command_text for keyword in ['how far', 'distance', 'far is']):
        if current_scene:
            closest_object = min(current_scene, key=lambda x: x['distance_meters'])
            speak_text(f"The closest object is {closest_object['class']} at {closest_object['distance_meters']:.1f} meters away")
        else:
            speak_text("I don't see any objects to measure distance to")
    
    elif any(keyword in command_text for keyword in ['how many', 'count', 'total']):
        if current_scene:
            speak_text(f"I can see a total of {len(current_scene)} objects")
            time.sleep(0.5)
            speak_text(f"They are: {format_object_list(current_scene)}")
        else:
            speak_text("I don't see any objects to count")
    
    elif any(keyword in command_text for keyword in ['closest', 'nearest']):
        if current_scene:
            closest_object = min(current_scene, key=lambda x: x['distance_meters'])
            speak_text(f"The closest object is {closest_object['class']} at {closest_object['distance_meters']:.1f} meters")
        else:
            speak_text("I don't see any objects on screen")
    
    elif any(keyword in command_text for keyword in ['help', 'commands', 'what can']):
        log_to_terminal_and_web_sync("ℹ️ Help command requested", "info")
        speak_text("You can ask me: what's on screen, what's on the left or right, how far is something, how many objects, or what's the closest object")
    
    else:
        log_to_terminal_and_web_sync(f"❓ Unknown command: {command_text}", "warning")
        speak_text("I'm not sure what you're looking for. Try asking 'what's on screen' or say 'help' for available commands")

# -------------------- SYSTEM INITIALIZATION --------------------
object_detector = None
depth_estimator = None
video_capture = None

def initialize_system():
    global object_detector, depth_estimator, video_capture
    
    log_to_terminal_and_web_sync("🚀 Initializing English Vision Voice Assistant", "system")
    
    # Test TTS first
    log_to_terminal_and_web_sync("🔊 Testing TTS system...", "system")
    speak_text("TTS system test successful")
    
    # Initialize object detector
    object_detector = ObjectDetector()
    depth_estimator = SimpleDepthModel()
    
    # Initialize camera
    log_to_terminal_and_web_sync("📹 Connecting to camera...", "system")
    video_capture = cv2.VideoCapture(CAMERA_URL)
    
    if not video_capture.isOpened():
        log_to_terminal_and_web_sync("📱 Phone camera not available, trying laptop camera...", "warning")
        video_capture = cv2.VideoCapture(LAPTOP_CAMERA_INDEX)
    
    if not video_capture.isOpened():
        log_to_terminal_and_web_sync("❌ No camera available!", "error")
        return False
    
    video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    
    # Test camera
    ret, test_frame = video_capture.read()
    if not ret or test_frame is None:
        log_to_terminal_and_web_sync("❌ Camera read test failed", "error")
        video_capture.release()
        return False
    
    log_to_terminal_and_web_sync("✅ Camera initialized successfully", "success")
    
    # Start voice recognition thread
    voice_thread = threading.Thread(target=voice_recognition_thread, daemon=True)
    voice_thread.start()
    
    log_to_terminal_and_web_sync("✅ English Vision Assistant is ready!", "success")
    return True

# -------------------- MAIN VIDEO PROCESSING --------------------
def generate_frames():
    global latest_scene_data, video_capture, object_detector, depth_estimator
    global USE_GRAYSCALE_MODE, DETECTION_CONFIDENCE, last_warning_time_class
    
    if not initialize_system():
        log_to_terminal_and_web_sync("❌ System initialization failed", "error")
        return
    
    frame_counter = 0
    fps_counter = 0
    last_depth_map = None
    fps_timer = time.time()
    
    ret, test_frame = video_capture.read()
    if not ret:
        return
        
    frame_height, frame_width = test_frame.shape[:2]
    camera_intrinsics = create_camera_intrinsics(frame_width, frame_height)
    
    log_to_terminal_and_web_sync(f"📐 Frame size: {frame_width}x{frame_height}", "system")
    
    while not stop_program_event.is_set():
        ret, current_frame = video_capture.read()
        frame_counter += 1
        
        if not ret or current_frame is None:
            continue
            
        display_frame = current_frame.copy()
        
        if USE_GRAYSCALE_MODE:
            processing_frame = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
            processing_frame = cv2.cvtColor(processing_frame, cv2.COLOR_GRAY2BGR)
        else:
            processing_frame = current_frame
        
        # Object detection
        detected_objects = object_detector.detect_objects(processing_frame)
        
        if frame_counter % DEPTH_PROCESSING_SKIP == 0:
            last_depth_map = depth_estimator.estimate_depth(current_frame)
        
        scene_objects = []
        current_time = time.time()
        
        # Process each detected object
        for detection in detected_objects:
            x1, y1, x2, y2 = detection['bbox']
            center_u = (x1 + x2) // 2
            center_v = (y1 + y2) // 2
            
            # Calculate distance
            actual_distance = calculate_distance(detection['bbox'], detection['class'], frame_height, frame_width)
            
            # Calculate position
            camera_x, camera_y, camera_z = convert_pixel_to_camera_coordinates(center_u, center_v, actual_distance, camera_intrinsics)
            angle_degrees = math.degrees(math.atan2(camera_x, camera_z))
            side_position = determine_side_from_angle(angle_degrees)
            
            scene_objects.append({
                'class': detection['class'],
                'confidence': detection['confidence'],
                'bbox': detection['bbox'],
                'distance_meters': actual_distance,
                'angle_degrees': round(angle_degrees, 1),
                'side': side_position
            })
            
            # Warning system with conversation logging
            objclass = detection['class']
            if actual_distance < MINIMUM_ALERT_DISTANCE:
                if (objclass not in last_warning_time_class or
                    current_time - last_warning_time_class[objclass] > WARNING_COOLDOWN):
                    
                    # Warning with conversation logging
                    warning_message = f"{objclass} is very close at {actual_distance:.1f} meters!"
                    speak_text(warning_message, "warning")
                    
                    last_warning_time_class[objclass] = current_time
        
        # Update global scene data
        with scene_data_lock:
            latest_scene_data = scene_objects.copy()
        
        # Draw bounding boxes and labels
        for i, obj in enumerate(scene_objects):
            x1, y1, x2, y2 = obj['bbox']
            
            if obj['side'] == 'left':
                box_color = (255, 100, 100)
            elif obj['side'] == 'right':
                box_color = (100, 255, 100)
            else:
                box_color = (100, 100, 255)
            
            brightness = int(155 + 100 * obj['confidence'])
            box_color = tuple(min(255, int(color * brightness / 255)) for color in box_color)
            thickness = 3 if obj['confidence'] > 0.5 else 2
            
            cv2.rectangle(display_frame, (x1, y1), (x2, y2), box_color, thickness)
            
            label_text = f"{obj['class']} {obj['distance_meters']:.1f}m"
            if obj['distance_meters'] < MINIMUM_ALERT_DISTANCE:
                label_text += " ⚠️"
            
            (text_width, text_height), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(display_frame, (x1, y1 - text_height - 8), (x1 + text_width + 5, y1), box_color, -1)
            cv2.putText(display_frame, label_text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
            cv2.putText(display_frame, str(i + 1), (x1 + 5, y1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, box_color, 2)
        
        # Add status overlay
        tts_status = "🔊 SPEAKING" if is_currently_speaking.is_set() else "🎤 LISTENING"
        cv2.putText(display_frame, f"English Assistant {tts_status}", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Object counts by side
        left_count = len([obj for obj in scene_objects if obj['side'] == 'left'])
        center_count = len([obj for obj in scene_objects if obj['side'] == 'center'])
        right_count = len([obj for obj in scene_objects if obj['side'] == 'right'])
        cv2.putText(display_frame, f"Left: {left_count} | Center: {center_count} | Right: {right_count}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # FPS monitoring (less frequent)
        fps_counter += 1
        if fps_counter % 120 == 0:
            current_fps = 120 / (time.time() - fps_timer)
            log_to_terminal_and_web_sync(f"📊 FPS: {current_fps:.1f} | Objects: {len(scene_objects)}", "system")
            fps_timer = time.time()
        
        # Process voice commands
        commands_processed = 0
        while not command_queue.empty() and commands_processed < 2:
            try:
                voice_command = command_queue.get_nowait()
                command_thread = threading.Thread(target=process_voice_command, args=(voice_command,), daemon=True)
                command_thread.start()
                commands_processed += 1
            except queue.Empty:
                break
        
        # Encode frame for streaming
        ret, buffer = cv2.imencode('.jpg', display_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret:
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    
    # Cleanup
    if video_capture:
        video_capture.release()

# -------------------- WEBSOCKET ENDPOINT --------------------
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# -------------------- REST ENDPOINTS --------------------
@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/")
async def root():
    return {"message": "🎥 English Vision Voice Assistant API"}

@app.get("/status")
async def get_status():
    return {
        "mode": "ENGLISH_VISION_ASSISTANT",
        "objects_detected": len(latest_scene_data),
        "microphone_active": microphone_is_active.is_set(),
        "is_speaking": is_currently_speaking.is_set(),
        "confidence_threshold": DETECTION_CONFIDENCE,
        "active_connections": len(manager.active_connections),
    }

@app.get("/scene_data")
async def get_scene_data():
    """Get current scene objects data"""
    with scene_data_lock:
        return {
            "objects": latest_scene_data.copy(),
            "total_count": len(latest_scene_data),
            "timestamp": time.strftime("%H:%M:%S")
        }

# -------------------- CLEANUP ON SHUTDOWN --------------------
@app.on_event("shutdown")
async def shutdown_event():
    stop_program_event.set()
    if video_capture:
        video_capture.release()
    log_to_terminal_and_web_sync("🛑 English Vision Assistant shutting down", "system")

if __name__ == "__main__":
    import uvicorn
    print("🎥🗣️ English Vision Voice Assistant - WITH CONVERSATION LOGGING")
    print("🚀 Features:")
    print("   📹 Real-time object detection with YOLO")
    print("   🎤 Voice commands and TTS responses")
    print("   📐 Distance estimation and spatial awareness") 
    print("   📱 Live WebSocket logging")
    print("   🌐 React frontend integration")
    print("   🔊 Working TTS warnings for close objects!")
    print("   💬 CONVERSATION LOGGING - User & Assistant talks")
    uvicorn.run(app, host="127.0.0.1", port=8000)
