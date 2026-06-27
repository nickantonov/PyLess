from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
import sqlite3

from ..db import get_db
from ..routes.auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _get_conversation_partners(user_id: int, db: sqlite3.Connection) -> list:
    user = db.execute("SELECT role, mentor_id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return []

    role = user["role"] if "role" in user.keys() else "user"
    mentor_id = user["mentor_id"] if "mentor_id" in user.keys() else 0

    if role in ("admin", "mentor"):
        students = db.execute(
            "SELECT id, display_name, avatar_url FROM users WHERE mentor_id = ? AND role = 'user'",
            (user_id,)
        ).fetchall()
        return [{"id": s["id"], "name": s["display_name"], "avatar": s["avatar_url"] or ""} for s in students]
    else:
        if mentor_id:
            mentor = db.execute(
                "SELECT id, display_name, avatar_url FROM users WHERE id = ?", (mentor_id,)
            ).fetchone()
            if mentor:
                return [{"id": mentor["id"], "name": mentor["display_name"], "avatar": mentor["avatar_url"] or ""}]
        return []


@router.get("/contacts")
def get_contacts(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    user = get_current_user(authorization, db)
    partners = _get_conversation_partners(user["id"], db)

    for p in partners:
        last = db.execute(
            "SELECT text, created_at FROM messages "
            "WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) "
            "ORDER BY created_at DESC LIMIT 1",
            (user["id"], p["id"], p["id"], user["id"])
        ).fetchone()
        unread = db.execute(
            "SELECT COUNT(*) as c FROM messages WHERE from_user_id = ? AND to_user_id = ? AND read = 0",
            (p["id"], user["id"])
        ).fetchone()["c"]

        p["last_message"] = last["text"] if last else ""
        p["last_time"] = last["created_at"] if last else ""
        p["unread"] = unread

    return partners


@router.get("/{other_user_id}")
def get_messages(other_user_id: int, limit: int = 50,
                 authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    user = get_current_user(authorization, db)

    _validate_conversation(user["id"], other_user_id, db)

    db.execute(
        "UPDATE messages SET read = 1 WHERE from_user_id = ? AND to_user_id = ?",
        (other_user_id, user["id"])
    )
    db.commit()

    rows = db.execute(
        "SELECT id, from_user_id, to_user_id, text, read, created_at "
        "FROM messages "
        "WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) "
        "ORDER BY created_at DESC LIMIT ?",
        (user["id"], other_user_id, other_user_id, user["id"], limit)
    ).fetchall()

    return [
        {"id": r["id"], "from": r["from_user_id"], "to": r["to_user_id"],
         "text": r["text"], "read": bool(r["read"]), "time": r["created_at"]}
        for r in reversed(rows)
    ]


@router.post("/{other_user_id}")
def send_message(other_user_id: int, body: dict = {},
                 authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    text = body.get("text", "")
    if not text.strip():
        raise HTTPException(400, "Empty message")

    user = get_current_user(authorization, db)
    _validate_conversation(user["id"], other_user_id, db)

    db.execute(
        "INSERT INTO messages (from_user_id, to_user_id, text) VALUES (?, ?, ?)",
        (user["id"], other_user_id, text.strip())
    )
    db.commit()
    return {"ok": True}


@router.get("/{other_user_id}/unread")
def unread_count(other_user_id: int,
                 authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        return {"count": 0}
    try:
        user = get_current_user(authorization, db)
    except HTTPException:
        return {"count": 0}

    row = db.execute(
        "SELECT COUNT(*) as c FROM messages WHERE from_user_id = ? AND to_user_id = ? AND read = 0",
        (other_user_id, user["id"])
    ).fetchone()
    return {"count": row["count"]}


def _validate_conversation(user_id: int, other_user_id: int, db: sqlite3.Connection):
    user = db.execute("SELECT role, mentor_id FROM users WHERE id = ?", (user_id,)).fetchone()
    other = db.execute("SELECT role, mentor_id FROM users WHERE id = ?", (other_user_id,)).fetchone()
    if not user or not other:
        raise HTTPException(404, "User not found")

    u_role = user["role"] if "role" in user.keys() else "user"
    o_role = other["role"] if "role" in other.keys() else "user"
    u_mentor = user["mentor_id"] if "mentor_id" in user.keys() else 0
    o_mentor = other["mentor_id"] if "mentor_id" in other.keys() else 0

    if u_role in ("admin", "mentor") and o_role == "user" and o_mentor == user_id:
        return
    if o_role in ("admin", "mentor") and u_role == "user" and u_mentor == other_user_id:
        return

    raise HTTPException(403, "You can only message your mentor or students")
