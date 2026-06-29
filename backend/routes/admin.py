import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
import sqlite3

from ..db import get_db
from ..routes.auth import get_current_user, _user_dict
from ..gamification import get_level, get_user_xp, BADGES

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(user=Depends(get_current_user)):
    role = user.get("role", "user")
    if role not in ("admin", "mentor"):
        raise HTTPException(403, "Admin or mentor role required")
    return user


def _generate_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _student_stats(db: sqlite3.Connection, user_id: int) -> dict:
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return {}

    xp = get_user_xp(db, user_id)
    level = get_level(xp)

    streak_row = db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,)).fetchone()
    combo_row = db.execute("SELECT * FROM combo WHERE user_id = ?", (user_id,)).fetchone()

    total_completed = db.execute(
        "SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND status = 'completed'", (user_id,)
    ).fetchone()["c"]
    total_attempted = db.execute(
        "SELECT COUNT(*) as c FROM progress WHERE user_id = ?", (user_id,)
    ).fetchone()["c"]
    first_try_count = db.execute(
        "SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND first_try = 1", (user_id,)
    ).fetchone()["c"]

    last_activity = db.execute(
        "SELECT MAX(completed_at) as last FROM progress WHERE user_id = ?", (user_id,)
    ).fetchone()["last"]

    badge_count = db.execute(
        "SELECT COUNT(*) as c FROM badges WHERE user_id = ?", (user_id,)
    ).fetchone()["c"]

    notes = db.execute(
        "SELECT n.text, n.created_at, u.display_name as mentor_name "
        "FROM mentor_notes n JOIN users u ON n.mentor_id = u.id "
        "WHERE n.student_id = ? ORDER BY n.created_at DESC LIMIT 10",
        (user_id,)
    ).fetchall()

    return {
        "id": user_id,
        "username": user["username"],
        "email": user["email"],
        "display_name": user["display_name"],
        "avatar_url": user["avatar_url"] if "avatar_url" in user.keys() else "",
        "role": user["role"] if "role" in user.keys() else "user",
        "level": level,
        "streak": {
            "current": streak_row["current_streak"] if streak_row else 0,
            "best": streak_row["best_streak"] if streak_row else 0,
        },
        "combo": {
            "current": combo_row["current_combo"] if combo_row else 0,
            "best": combo_row["best_combo"] if combo_row else 0,
        },
        "total_completed": total_completed,
        "total_attempted": total_attempted,
        "first_try_count": first_try_count,
        "badges_count": badge_count,
        "last_activity": last_activity,
        "notes": [{"text": n["text"], "date": n["created_at"], "mentor": n["mentor_name"]} for n in notes],
    }


@router.get("/students")
def list_students(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    students = db.execute(
        "SELECT id FROM users WHERE mentor_id = ? AND role = 'user'", (admin["id"],)
    ).fetchall()

    return [_student_stats(db, s["id"]) for s in students]


@router.get("/all-students")
def list_all_students(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))
    role = admin.get("role", "user")
    if role != "admin":
        raise HTTPException(403, "Admin only")

    students = db.execute(
        "SELECT id FROM users WHERE role = 'user' ORDER BY created_at DESC"
    ).fetchall()

    return [_student_stats(db, s["id"]) for s in students]


@router.get("/student/{student_id}")
def get_student(student_id: int, authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    student = db.execute("SELECT * FROM users WHERE id = ?", (student_id,)).fetchone()
    if not student:
        raise HTTPException(404, "Student not found")

    role = admin.get("role", "user")
    if role == "mentor" and student["mentor_id"] != admin["id"]:
        raise HTTPException(403, "This student is not assigned to you")

    stats = _student_stats(db, student_id)

    progress = db.execute(
        "SELECT p.task_id, p.status, p.attempts, p.first_try, p.completed_at "
        "FROM progress p WHERE p.user_id = ? ORDER BY p.completed_at",
        (student_id,)
    ).fetchall()
    stats["progress"] = [dict(r) for r in progress]

    xp_history = db.execute(
        "SELECT DATE(created_at) as day, SUM(amount) as xp "
        "FROM xp_log WHERE user_id = ? AND created_at >= date('now', '-30 days') "
        "GROUP BY DATE(created_at) ORDER BY day",
        (student_id,)
    ).fetchall()
    stats["xp_history"] = [dict(r) for r in xp_history]

    return stats


@router.post("/invite")
def create_invite(max_uses: int = 50, days_valid: int = 90,
                  authorization: Optional[str] = Header(None),
                  db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    code = _generate_code()
    while db.execute("SELECT 1 FROM invite_codes WHERE code = ?", (code,)).fetchone():
        code = _generate_code()

    expires = (datetime.utcnow() + timedelta(days=days_valid)).isoformat()
    db.execute(
        "INSERT INTO invite_codes (code, mentor_id, max_uses, expires_at) VALUES (?, ?, ?, ?)",
        (code, admin["id"], max_uses, expires),
    )
    db.commit()

    return {"code": code, "max_uses": max_uses, "expires_at": expires, "uses": 0}


@router.get("/invites")
def list_invites(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    rows = db.execute(
        "SELECT * FROM invite_codes WHERE mentor_id = ? ORDER BY created_at DESC", (admin["id"],)
    ).fetchall()

    return [dict(r) for r in rows]


@router.delete("/invite/{code}")
def revoke_invite(code: str, authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    invite = db.execute("SELECT * FROM invite_codes WHERE code = ? AND mentor_id = ?",
                         (code, admin["id"])).fetchone()
    if not invite:
        raise HTTPException(404, "Invite not found")

    db.execute("DELETE FROM invite_codes WHERE code = ?", (code,))
    db.commit()
    return {"ok": True}


@router.post("/note/{student_id}")
def add_note(student_id: int, text: str = "",
             authorization: Optional[str] = Header(None),
             db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    student = db.execute("SELECT * FROM users WHERE id = ?", (student_id,)).fetchone()
    if not student:
        raise HTTPException(404, "Student not found")

    role = admin.get("role", "user")
    if role == "mentor" and student["mentor_id"] != admin["id"]:
        raise HTTPException(403, "This student is not assigned to you")

    db.execute(
        "INSERT INTO mentor_notes (mentor_id, student_id, text) VALUES (?, ?, ?)",
        (admin["id"], student_id, text),
    )
    db.commit()
    return {"ok": True}


@router.delete("/note/{note_id}")
def delete_note(note_id: int, authorization: Optional[str] = Header(None),
                db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    note = db.execute("SELECT * FROM mentor_notes WHERE id = ? AND mentor_id = ?",
                       (note_id, admin["id"])).fetchone()
    if not note:
        raise HTTPException(404, "Note not found")

    db.execute("DELETE FROM mentor_notes WHERE id = ?", (note_id,))
    db.commit()
    return {"ok": True}


@router.get("/stats")
def admin_stats(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    admin = require_admin(get_current_user(authorization, db))

    role = admin.get("role", "user")
    if role == "admin":
        total_users = db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'user'").fetchone()["c"]
        mentor_ids = [r["id"] for r in db.execute("SELECT id FROM users WHERE role IN ('admin','mentor')").fetchall()]
    else:
        total_users = db.execute("SELECT COUNT(*) as c FROM users WHERE mentor_id = ?", (admin["id"],)).fetchone()["c"]
        mentor_ids = [admin["id"]]

    total_tasks_done = db.execute(
        "SELECT COUNT(*) as c FROM progress WHERE status = 'completed'"
        + (" AND user_id IN (SELECT id FROM users WHERE mentor_id = ?)" if role != "admin" else ""),
        (admin["id"],) if role != "admin" else ()
    ).fetchone()["c"]

    active_today = db.execute(
        "SELECT COUNT(DISTINCT user_id) as c FROM progress WHERE completed_at >= date('now')"
        + (" AND user_id IN (SELECT id FROM users WHERE mentor_id = ?)" if role != "admin" else ""),
        (admin["id"],) if role != "admin" else ()
    ).fetchone()["c"]

    total_invites = db.execute(
        "SELECT COUNT(*) as c FROM invite_codes WHERE mentor_id = ?", (admin["id"],)
    ).fetchone()["c"]

    return {
        "total_students": total_users,
        "total_tasks_completed": total_tasks_done,
        "active_today": active_today,
        "total_invite_codes": total_invites,
    }
