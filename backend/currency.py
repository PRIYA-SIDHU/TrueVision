
from ultralytics import YOLO
import pyttsx3
import cv2
import time

# -------------------------
# Initialize text-to-speech
# -------------------------
engine = pyttsx3.init()
engine.setProperty('rate', 150)

# -------------------------
# Load YOLO model
# -------------------------
model = YOLO(r"C:\Users\Hp\Downloads\best (1).pt")  # your trained model

# -------------------------
# Open webcam (0 = default camera)
# -------------------------
cam=0
# cam="http://192.168.1.13:4747/video"
cap = cv2.VideoCapture(cam)

# -------------------------
# Detection parameters
# -------------------------
MIN_BOX_WIDTH = 50
MIN_BOX_HEIGHT = 30
CONF_THRESHOLD = 0.5

# -------------------------
# Track already spoken notes
# -------------------------
spoken_labels = set()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)
    annotated_frame = results[0].plot()
    names = results[0].names

    detected_labels = set()

    for box in results[0].boxes:
        conf = float(box.conf[0])
        if conf < CONF_THRESHOLD:
            continue

        cls_id = int(box.cls[0])
        label = names[cls_id].replace("_", " ")
        x1, y1, x2, y2 = box.xyxy[0]
        width, height = x2 - x1, y2 - y1

        if width < MIN_BOX_WIDTH or height < MIN_BOX_HEIGHT:
            continue

        detected_labels.add(label)

    # Speak **newly detected notes only**
    new_labels = detected_labels - spoken_labels
    if new_labels:
        sentence = ", ".join(sorted(new_labels))
        engine.say(f"Detected: {sentence}")
        engine.runAndWait()
        spoken_labels.update(new_labels)

    # Reset spoken_labels if no detections to allow new notes to be spoken later
    if not detected_labels:
        spoken_labels.clear()

    # Show annotated video
    cv2.imshow("YOLO Live Detection", annotated_frame)

    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
