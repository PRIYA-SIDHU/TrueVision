from fastapi import FastAPI, File, UploadFile, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import os
import shutil
from pathlib import Path
import PyPDF2
import pyttsx3
import asyncio
import json
import threading
import queue
from typing import List, Dict, Any
from datetime import datetime
import uvicorn

app = FastAPI(title="PDF Reader System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Global variables
websocket_connections: List[WebSocket] = []
reading_status = {
    "is_reading": False,
    "current_pdf": None,
    "current_page": 0,
    "total_pages": 0,
    "paused": False
}

# TTS Setup
engine = None
speech_queue = queue.Queue()
reading_thread_active = False

def init_tts():
    global engine
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 0.9)
        voices = engine.getProperty('voices')
        if voices:
            engine.setProperty('voice', voices[0].id)
        return True
    except Exception as e:
        print(f"TTS initialization error: {e}")
        return False

# Initialize TTS
tts_available = init_tts()

def speak_text(text):
    """Add text to speech queue"""
    if tts_available and text.strip():
        speech_queue.put(text)

def speech_worker():
    """Worker thread for TTS"""
    global reading_thread_active
    reading_thread_active = True
    
    while reading_thread_active:
        try:
            text = speech_queue.get(timeout=1)
            if text is None:
                break
            
            if engine and not reading_status["paused"]:
                engine.say(text)
                engine.runAndWait()
                
        except queue.Empty:
            continue
        except Exception as e:
            print(f"Speech error: {e}")
            continue

# Start speech worker thread
if tts_available:
    speech_thread = threading.Thread(target=speech_worker, daemon=True)
    speech_thread.start()

# WebSocket broadcasting
async def broadcast_message(message: Dict[str, Any]):
    """Broadcast message to all connected WebSocket clients"""
    if websocket_connections:
        json_message = json.dumps(message)
        disconnected = []
        
        for websocket in websocket_connections:
            try:
                await websocket.send_text(json_message)
            except:
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for ws in disconnected:
            if ws in websocket_connections:
                websocket_connections.remove(ws)

def broadcast_sync(message: Dict[str, Any]):
    """Synchronous version for use in threads"""
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(broadcast_message(message))
    except:
        pass

# PDF processing functions
def get_pdf_info(file_path: Path):
    """Extract PDF metadata"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            return {
                "pages": len(pdf_reader.pages),
                "title": pdf_reader.metadata.get('/Title', 'Unknown') if pdf_reader.metadata else 'Unknown',
                "author": pdf_reader.metadata.get('/Author', 'Unknown') if pdf_reader.metadata else 'Unknown'
            }
    except Exception as e:
        print(f"Error reading PDF info: {e}")
        return {"pages": 0, "title": "Unknown", "author": "Unknown"}

async def extract_pdf_text(file_path: Path, start_page: int = 2):  # Default to page 2 (0-based index)
    """Extract text from PDF starting from specific page"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            for page_num in range(start_page, total_pages):
                if reading_status["paused"] or not reading_status["is_reading"]:
                    break
                    
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                if text.strip():
                    reading_status["current_page"] = page_num + 1
                    reading_status["total_pages"] = total_pages
                    
                    # Broadcast reading progress
                    await broadcast_message({
                        "type": "reading_progress",
                        "timestamp": datetime.now().strftime("%H:%M:%S"),
                        "message": f"📖 Reading page {page_num + 1}/{total_pages}",
                        "page": page_num + 1,
                        "total_pages": total_pages,
                        "text_preview": text[:100] + "..." if len(text) > 100 else text
                    })
                    
                    # Add to speech queue
                    speak_text(text)
                    
                    # Wait a bit before moving to next page
                    await asyncio.sleep(0.5)
                        
    except Exception as e:
        print(f"Error reading PDF: {e}")
        await broadcast_message({
            "type": "error",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": f"❌ Error reading PDF: {str(e)}"
        })

async def start_pdf_reading(file_path: Path, start_page: int = 2):
    """Start reading PDF in background task"""
    reading_status["is_reading"] = True
    reading_status["current_pdf"] = file_path.name
    reading_status["paused"] = False
    
    await broadcast_message({
        "type": "reading_started",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"🎧 Started reading: {file_path.name} from page {start_page + 1}",
        "pdf_name": file_path.name
    })
    
    # Start reading PDF
    await extract_pdf_text(file_path, start_page)
    
    reading_status["is_reading"] = False
    await broadcast_message({
        "type": "reading_finished",
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "message": f"✅ Finished reading: {file_path.name}"
    })

# API Endpoints
@app.get("/")
async def root():
    return {"message": "PDF Reader System API", "tts_available": tts_available}

@app.get("/pdfs")
async def list_pdfs():
    """Get list of all uploaded PDFs"""
    try:
        pdf_files = []
        for file_path in UPLOAD_DIR.glob("*.pdf"):
            pdf_info = get_pdf_info(file_path)
            pdf_files.append({
                "filename": file_path.name,
                "size": file_path.stat().st_size,
                "created": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat(),
                "pages": pdf_info["pages"],
                "title": pdf_info["title"],
                "author": pdf_info["author"],
                "url": f"/uploads/{file_path.name}"
            })
        
        return {"pdfs": sorted(pdf_files, key=lambda x: x["created"], reverse=True)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing PDFs: {str(e)}")

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        if file.filename == "":
            raise HTTPException(status_code=400, detail="No file selected")
        
        # Save file
        file_path = UPLOAD_DIR / file.filename
        
        # Handle duplicate names
        counter = 1
        original_name = file_path.stem
        while file_path.exists():
            file_path = UPLOAD_DIR / f"{original_name}_{counter}.pdf"
            counter += 1
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get PDF info
        pdf_info = get_pdf_info(file_path)
        
        # Broadcast upload success
        await broadcast_message({
            "type": "pdf_uploaded",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": f"📁 Uploaded: {file_path.name} ({pdf_info['pages']} pages)",
            "filename": file_path.name
        })
        
        return {
            "filename": file_path.name,
            "original_filename": file.filename,
            "size": file_path.stat().st_size,
            "pages": pdf_info["pages"],
            "title": pdf_info["title"],
            "author": pdf_info["author"],
            "url": f"/uploads/{file_path.name}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# FIXED: BackgroundTasks parameter moved to the end, after default parameters
@app.post("/read/{filename}")
async def read_pdf(filename: str, background_tasks: BackgroundTasks, start_page: int = 2):
    """Start reading a PDF file"""
    try:
        file_path = UPLOAD_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        if not tts_available:
            raise HTTPException(status_code=503, detail="Text-to-speech not available")
        
        # Stop any current reading
        if reading_status["is_reading"]:
            reading_status["is_reading"] = False
            reading_status["paused"] = False
            
            # Clear speech queue
            while not speech_queue.empty():
                try:
                    speech_queue.get_nowait()
                except queue.Empty:
                    break
        
        # Start reading in background
        background_tasks.add_task(start_pdf_reading, file_path, start_page)
        
        return {
            "message": f"Started reading {filename} from page {start_page + 1}",
            "filename": filename,
            "start_page": start_page + 1,  # Return 1-based page number
            "tts_available": tts_available
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting PDF reading: {str(e)}")

@app.post("/pause")
async def pause_reading():
    """Pause/Resume PDF reading"""
    try:
        if reading_status["is_reading"]:
            reading_status["paused"] = not reading_status["paused"]
            
            status = "paused" if reading_status["paused"] else "resumed"
            await broadcast_message({
                "type": "reading_paused" if reading_status["paused"] else "reading_resumed",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": f"⏸️ Reading {status}" if reading_status["paused"] else f"▶️ Reading {status}"
            })
            
            return {"status": status, "paused": reading_status["paused"]}
        else:
            return {"message": "No reading in progress"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error controlling reading: {str(e)}")

@app.post("/stop")
async def stop_reading():
    """Stop PDF reading"""
    try:
        if reading_status["is_reading"] or not speech_queue.empty():
            reading_status["is_reading"] = False
            reading_status["paused"] = False
            reading_status["current_pdf"] = None
            reading_status["current_page"] = 0
            reading_status["total_pages"] = 0
            
            # Clear speech queue
            while not speech_queue.empty():
                try:
                    speech_queue.get_nowait()
                except queue.Empty:
                    break
            
            await broadcast_message({
                "type": "reading_stopped",
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "message": "⏹️ Reading stopped"
            })
            
            return {"message": "Reading stopped"}
        else:
            return {"message": "No reading in progress"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping reading: {str(e)}")

@app.get("/status")
async def get_status():
    """Get current reading status"""
    return {
        **reading_status,
        "tts_available": tts_available,
        "connected_clients": len(websocket_connections),
        "queue_size": speech_queue.qsize()
    }

@app.delete("/delete/{filename}")
async def delete_pdf(filename: str):
    """Delete a PDF file"""
    try:
        file_path = UPLOAD_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="PDF file not found")
        
        # Stop reading if this file is currently being read
        if reading_status["current_pdf"] == filename:
            reading_status["is_reading"] = False
            reading_status["paused"] = False
            reading_status["current_pdf"] = None
        
        file_path.unlink()
        
        await broadcast_message({
            "type": "pdf_deleted",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": f"🗑️ Deleted: {filename}"
        })
        
        return {"message": f"Deleted {filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    
    print(f"🌐 WebSocket client connected. Total: {len(websocket_connections)}")
    
    try:
        # Send initial connection message
        await websocket.send_text(json.dumps({
            "type": "connected",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "message": "🌐 Connected to PDF Reader System",
            "tts_available": tts_available
        }))
        
        while True:
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
        print(f"🌐 WebSocket client disconnected. Total: {len(websocket_connections)}")

if __name__ == "__main__":
    print("🚀 Starting PDF Reader System...")
    print(f"📁 Upload directory: {UPLOAD_DIR}")
    print(f"🔊 TTS Available: {tts_available}")
    print("📖 Default reading starts from page 3 (as per your original code)")
    
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
