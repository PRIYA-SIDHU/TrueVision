
import cv2
import numpy as np
import pyttsx3
import speech_recognition as sr
import threading, queue
import winsound

# ----------------------
# Setup TTS with queue
# ----------------------
engine = pyttsx3.init()
engine.setProperty('rate', 150)
speech_queue = queue.Queue()
 
def speak(text):
    print(f"[TTS]: {text}")
    speech_queue.put(text)

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
# Color ranges (HSV)
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

# Skin range to filter out
skin_range = (np.array([0, 30, 60]), np.array([20, 150, 255]))

# ----------------------
# Detection function
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

    return frame, list(set(detected_colors))  # unique colors only

# ----------------------
# Voice control
# ----------------------
recognizer = sr.Recognizer()
mic = sr.Microphone()

detecting = False
specific_color = None

# Track last spoken time for throttling
last_spoken_times = {}
SPEAK_INTERVAL = 5  # seconds

def listen_commands():
    global detecting, specific_color
    with mic as source:
        recognizer.adjust_for_ambient_noise(source)
    while True:
        try:
            with mic as source:
                print(" Listening for command...")
                audio = recognizer.listen(source, timeout=None, phrase_time_limit=5)
            command = recognizer.recognize_google(audio).lower()
            print(f" Command: {command}")

            if "detect colors" in command or "detect colours" in command:
                detecting = True
                specific_color = None
                speak("Started detecting all colors")

            elif "detect" in command:
                for color in color_ranges.keys():
                    if color in command:
                        detecting = True
                        specific_color = color
                        speak(f"Started detecting {color}")
                        break

            elif "stop" in command:
                detecting = False
                specific_color = None
                speak("Stopped detecting colors")

        except sr.WaitTimeoutError:
            continue
        except sr.UnknownValueError:
            print(" Could not understand audio")
        except sr.RequestError:
            print(" Speech recognition service error.")

# ----------------------
# Camera loop
# ----------------------
cam=0
# cam="http://192.168.1.13:4747/video"
cap = cv2.VideoCapture(cam)
speak("Voice control started. Say detect colors, detect particular color, or stop detecting colors.")
listener_thread = threading.Thread(target=listen_commands, daemon=True)
listener_thread.start()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    current_time = cv2.getTickCount() / cv2.getTickFrequency()

    if detecting:
        frame, colors_found = detect_colors(frame)

        if specific_color:
            if specific_color in colors_found:
                last_time = last_spoken_times.get(specific_color, 0)
                if current_time - last_time > SPEAK_INTERVAL:
                    winsound.Beep(1000, 200)
                    speak(f"{specific_color} detected")
                    last_spoken_times[specific_color] = current_time
            else:
                last_time = last_spoken_times.get(f"notfound_{specific_color}", 0)
                if current_time - last_time > SPEAK_INTERVAL:
                    speak(f"{specific_color} not found")
                    last_spoken_times[f"notfound_{specific_color}"] = current_time
        else:
            for color in colors_found:
                last_time = last_spoken_times.get(color, 0)
                if current_time - last_time > SPEAK_INTERVAL:
                    speak(f"{color} color")
                    last_spoken_times[color] = current_time

    cv2.imshow("Color Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# Stop TTS thread
speech_queue.put(None)
speech_thread.join()
