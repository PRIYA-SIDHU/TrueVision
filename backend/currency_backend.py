


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from ultralytics import YOLO
import pyttsx3
import cv2
import time
import threading
from collections import deque
import queue
from fastapi.responses import StreamingResponse
import io

app = FastAPI()

# Enable CORS
origins = [
    "http://localhost",
    "http://192.168.1.13",
    "http://localhost:3000",       # Add your React dev server origin if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Thread-safe TTS with clean shutdown
# -------------------------
class ThreadSafeTTS:
    def __init__(self):
        self.tts_queue = queue.Queue()
        self._stop_event = threading.Event()
        self.is_speaking = False
        self.worker_thread = threading.Thread(target=self._tts_worker, daemon=True)
        self.worker_thread.start()

    def _tts_worker(self):
        engine = pyttsx3.init()
        engine.setProperty('rate', 180)
        engine.setProperty('volume', 0.9)
        while not self._stop_event.is_set():
            try:
                text = self.tts_queue.get(timeout=0.5)
                self.is_speaking = True
                engine.say(text)
                engine.runAndWait()
                self.is_speaking = False
                self.tts_queue.task_done()
            except queue.Empty:
                continue
        engine.stop()

    def speak_async(self, text):
        if not self.is_speaking:
            self.tts_queue.put(text)
            self.is_speaking = True

    def stop(self):
        self._stop_event.set()
        self.worker_thread.join()

# -------------------------
# Separate thread for camera capture
# -------------------------
class CameraCapture:
    def __init__(self, source):
        self.cap = cv2.VideoCapture(source)
        if not self.cap.isOpened():
            raise IOError(f"Cannot open video source {source}")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 10)  # Lower FPS to reduce load
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self.queue = queue.Queue(maxsize=1)
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _run(self):
        while not self.stop_event.is_set():
            ret, frame = self.cap.read()
            if not ret:
                print("Failed to read frame, retrying...")
                time.sleep(0.1)
                continue

            # Clear old frames to keep only latest frame
            while not self.queue.empty():
                try:
                    self.queue.get_nowait()
                except queue.Empty:
                    break

            self.queue.put(frame)

    def get_frame(self):
        try:
            return self.queue.get(timeout=1)
        except queue.Empty:
            return None

    def stop(self):
        self.stop_event.set()
        self.thread.join()
        self.cap.release()

# -------------------------
# YOLO detection and TTS worker
# -------------------------
class DetectionSystem:
    def __init__(self, model_path, camera_url):
        print("Loading YOLO model...")
        self.model = YOLO(model_path)
        print("Model loaded successfully!")

        self.tts_system = ThreadSafeTTS()
        self.cam_capture = CameraCapture(camera_url)

        self.note_values = {
            "10 Rupee": 10,
            "20 Rupee": 20,
            "50 Rupee": 50,
            "100 Rupee": 100,
            "200 Rupee": 200,
            "500 Rupee": 500,
            "2000 Rupee": 2000
        }

        self.recent_detections = deque(maxlen=5)
        self.last_spoken_time = 0
        self.cooldown = 8
        self.last_sentence = ""
        self.fps_counter = 0
        self.fps_timer = time.time()
        self.MIN_BOX_WIDTH = 40
        self.MIN_BOX_HEIGHT = 25
        self.CONF_THRESHOLD = 0.6
        self.DISPLAY_WIDTH = 640
        self.DISPLAY_HEIGHT = 480
        self.running = True

    def process_frame(self):
        frame = self.cam_capture.get_frame()
        if frame is None:
            return None

        self.fps_counter += 1
        if time.time() - self.fps_timer > 1:
            print(f"FPS: {self.fps_counter / (time.time() - self.fps_timer):.1f}")
            self.fps_counter = 0
            self.fps_timer = time.time()

        display_frame = cv2.resize(frame, (self.DISPLAY_WIDTH, self.DISPLAY_HEIGHT))
        process_frame = cv2.resize(frame, (320, 240))

        results = self.model(
            process_frame,
            verbose=False,
            conf=self.CONF_THRESHOLD,
            iou=0.5,
            imgsz=320
        )

        detected_labels = []
        if results and results[0].boxes:
            names = results[0].names
            for box in results[0].boxes:
                conf = float(box.conf[0])
                if conf < self.CONF_THRESHOLD:
                    continue
                cls_id = int(box.cls[0])
                label = names[cls_id].replace("_", " ")
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                x1 = int(x1 * self.DISPLAY_WIDTH / 320)
                y1 = int(y1 * self.DISPLAY_HEIGHT / 240)
                x2 = int(x2 * self.DISPLAY_WIDTH / 320)
                y2 = int(y2 * self.DISPLAY_HEIGHT / 240)
                width, height = x2 - x1, y2 - y1
                if width < self.MIN_BOX_WIDTH or height < self.MIN_BOX_HEIGHT:
                    continue
                detected_labels.append(label)
                color = (0, 255, 0) if conf > 0.7 else (0, 255, 255)
                cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
                text = f"{label} {conf:.2f}"
                cv2.putText(display_frame, text, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        self.recent_detections.append(detected_labels)

        if detected_labels and len(self.recent_detections) == self.recent_detections.maxlen:
            from collections import Counter
            all_labels = [label for sublist in self.recent_detections for label in sublist]
            label_counts = Counter(all_labels)
            consistent_labels = [label for label, count in label_counts.items() if count >= 3]

            if consistent_labels:
                total_value = sum(self.note_values.get(label, 0) for label in consistent_labels)
                current_total = total_value

                labels_str = ", ".join(sorted(list(set(consistent_labels))))
                sentence = f"Detected {len(consistent_labels)} notes: {labels_str}. Total value is {current_total} rupees."

                current_time = time.time()
                if sentence != self.last_sentence or (current_time - self.last_spoken_time) > self.cooldown:
                    self.tts_system.speak_async(sentence)
                    self.last_sentence = sentence
                    self.last_spoken_time = current_time
                    print(f"Speaking: {sentence}")
            else:
                self.last_sentence = ""

        fps = int(self.fps_counter / (time.time() - self.fps_timer))
        status_text = f"FPS: {fps}"
        cv2.putText(display_frame, status_text, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        return display_frame

    def stop(self):
        self.running = False
        self.tts_system.stop()
        self.cam_capture.stop()
        cv2.destroyAllWindows()

# Initialize the detection system
detection_system = DetectionSystem(
    model_path=r"C:\Users\Hp\Downloads\best (3).pt",
    camera_url="http://10.200.19.164:4747/video"  # Update your camera source here or use 0 for USB webcam
)

@app.get("/video_frame")
def get_video_frame():
    frame = detection_system.process_frame()
    if frame is None:
        return {"error": "No frame available"}

    ret, jpeg = cv2.imencode('.jpg', frame)
    if not ret:
        return {"error": "Failed to encode frame"}

    return StreamingResponse(io.BytesIO(jpeg.tobytes()), media_type="image/jpeg")

@app.on_event("shutdown")
def shutdown_event():
    detection_system.stop()
    print("Shutting down backend and releasing resources")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
