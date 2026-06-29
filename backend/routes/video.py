import json
import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, WebSocket, WebSocketDisconnect
import sqlite3

from ..db import get_db
from ..routes.auth import get_current_user
from ..video_hub import hub

router = APIRouter(prefix="/api/video", tags=["video"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.pptx', '.ppt', '.docx', '.doc', '.mp4', '.webm', '.zip'}


def _require_auth(authorization: Optional[str], db: sqlite3.Connection):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    return get_current_user(authorization, db)


@router.post("/rooms")
def create_room(body: dict, authorization: Optional[str] = Header(None),
                db: sqlite3.Connection = Depends(get_db)):
    user = _require_auth(authorization, db)
    if user.get("role") not in ("admin", "mentor"):
        raise HTTPException(403, "Mentor or admin required")

    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Room name required")

    room_code = uuid.uuid4().hex[:8]
    db.execute(
        "INSERT INTO video_rooms (creator_id, name, room_code, scheduled_at) VALUES (?, ?, ?, ?)",
        (user["id"], name, room_code, body.get("scheduled_at"))
    )
    db.commit()

    room = db.execute("SELECT * FROM video_rooms WHERE room_code = ?", (room_code,)).fetchone()
    return {
        "ok": True,
        "room": {
            "id": room["id"],
            "name": room["name"],
            "room_code": room_code,
            "scheduled_at": room["scheduled_at"],
        }
    }


@router.get("/rooms")
def list_rooms(authorization: Optional[str] = Header(None),
               db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        return []
    user = get_current_user(authorization, db)

    if user.get("role") in ("admin", "mentor"):
        rooms = db.execute(
            "SELECT v.*, u.display_name as creator_name FROM video_rooms v "
            "JOIN users u ON v.creator_id = u.id ORDER BY v.created_at DESC"
        ).fetchall()
    else:
        rooms = db.execute(
            "SELECT v.*, u.display_name as creator_name FROM video_rooms v "
            "JOIN users u ON v.creator_id = u.id "
            "WHERE v.creator_id IN (SELECT mentor_id FROM users WHERE id = ?) "
            "OR v.creator_id = ? ORDER BY v.created_at DESC",
            (user["id"], user["id"])
        ).fetchall()

    return [
        {
            "id": r["id"],
            "name": r["name"],
            "room_code": r["room_code"],
            "creator_name": r["creator_name"],
            "scheduled_at": r["scheduled_at"],
            "is_active": bool(r["is_active"]),
        }
        for r in rooms
    ]


@router.post("/rooms/{room_id}/start")
def start_room(room_id: int, authorization: Optional[str] = Header(None),
               db: sqlite3.Connection = Depends(get_db)):
    user = _require_auth(authorization, db)
    db.execute("UPDATE video_rooms SET is_active = 1 WHERE id = ?", (room_id,))
    db.commit()
    return {"ok": True}


@router.post("/rooms/{room_id}/end")
def end_room(room_id: int, authorization: Optional[str] = Header(None),
             db: sqlite3.Connection = Depends(get_db)):
    user = _require_auth(authorization, db)
    db.execute("UPDATE video_rooms SET is_active = 0 WHERE id = ?", (room_id,))
    db.commit()
    return {"ok": True}


@router.delete("/rooms/{room_id}")
def delete_room(room_id: int, authorization: Optional[str] = Header(None),
                db: sqlite3.Connection = Depends(get_db)):
    user = _require_auth(authorization, db)
    room = db.execute("SELECT * FROM video_rooms WHERE id = ?", (room_id,)).fetchone()
    if not room:
        raise HTTPException(404, "Room not found")
    if room["creator_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not your room")
    db.execute("DELETE FROM lesson_materials WHERE room_id = ?", (room_id,))
    db.execute("DELETE FROM video_rooms WHERE id = ?", (room_id,))
    db.commit()
    return {"ok": True}


@router.post("/rooms/{room_id}/materials")
async def upload_material(room_id: int, authorization: str = Header(...),
                          file: UploadFile = File(...), db: sqlite3.Connection = Depends(get_db)):
    user = _require_auth(authorization, db)

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {ext} not allowed")

    file_id = uuid.uuid4().hex
    filename = f"{file_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    db.execute(
        "INSERT INTO lesson_materials (room_id, uploader_id, filename, original_name, file_type, file_size) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (room_id, user["id"], filename, file.filename, ext, len(content))
    )
    db.commit()

    return {
        "ok": True,
        "material": {
            "id": file_id,
            "filename": filename,
            "original_name": file.filename,
            "file_type": ext,
            "file_size": len(content),
            "url": f"/api/video/materials/{filename}",
        }
    }


@router.get("/rooms/{room_id}/materials")
def list_materials(room_id: int, db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute(
        "SELECT m.*, u.display_name as uploader_name FROM lesson_materials m "
        "JOIN users u ON m.uploader_id = u.id WHERE m.room_id = ? ORDER BY m.created_at",
        (room_id,)
    ).fetchall()
    return [
        {
            "id": r["id"],
            "filename": r["filename"],
            "original_name": r["original_name"],
            "file_type": r["file_type"],
            "file_size": r["file_size"],
            "uploader_name": r["uploader_name"],
            "url": f"/api/video/materials/{r['filename']}",
        }
        for r in rows
    ]


@router.get("/materials/{filename}")
def get_material(filename: str):
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found")
    from fastapi.responses import FileResponse
    return FileResponse(filepath, filename=filename)


@router.websocket("/ws/{room_code}/{user_id}/{user_name}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, user_id: int, user_name: str):
    await hub.connect(websocket, room_code, user_id, user_name)
    try:
        while True:
            data = await websocket.receive_json()
            await hub.handle_message(room_code, f"{user_id}_{user_name}", data)
    except WebSocketDisconnect:
        await hub.disconnect(websocket, room_code, user_id, user_name)
