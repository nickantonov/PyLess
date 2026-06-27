import sqlite3
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional

from ..db import get_db
from ..routes.auth import get_current_user, optional_user, _ensure_user_rows
from ..gamification import get_level, get_user_xp, get_user_profile, get_leaderboard

router = APIRouter(prefix="/api/profile", tags=["profile"])


def get_or_create_guest(db: sqlite3.Connection) -> int:
    row = db.execute("SELECT id FROM users WHERE username = '__guest__'").fetchone()
    if row:
        return row["id"]
    db.execute("INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)",
               ("__guest__", "guest@local", "none", "Користувач"))
    db.commit()
    uid = db.execute("SELECT id FROM users WHERE username = '__guest__'").fetchone()["id"]
    _ensure_user_rows(db, uid)
    return uid


def merge_guest_to_user(db: sqlite3.Connection, guest_id: int, user_id: int):
    if guest_id == user_id:
        return
    for table, col in [("progress", "task_id"), ("badges", "badge_id")]:
        rows = db.execute(f"SELECT * FROM {table} WHERE user_id = ?", (guest_id,)).fetchall()
        for row in rows:
            try:
                if table == "progress":
                    db.execute(
                        f"INSERT INTO {table} (user_id, task_id, status, attempts, best_code, first_try, completed_at) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?) "
                        "ON CONFLICT(user_id, task_id) DO UPDATE SET "
                        "status = CASE WHEN excluded.status = 'completed' THEN 'completed' ELSE status END, "
                        "attempts = MAX(attempts, excluded.attempts), "
                        "best_code = COALESCE(excluded.best_code, best_code)",
                        (user_id, row["task_id"], row["status"], row["attempts"],
                         row["best_code"], row["first_try"], row["completed_at"]),
                    )
                elif table == "badges":
                    db.execute(
                        f"INSERT OR IGNORE INTO {table} (user_id, badge_id) VALUES (?, ?)",
                        (user_id, row["badge_id"]),
                    )
            except sqlite3.IntegrityError:
                pass

    xp_rows = db.execute("SELECT amount, reason, created_at FROM xp_log WHERE user_id = ?", (guest_id,)).fetchall()
    for row in xp_rows:
        db.execute("INSERT INTO xp_log (user_id, amount, reason, created_at) VALUES (?, ?, ?, ?)",
                    (user_id, row["amount"], row["reason"], row["created_at"]))

    streak = db.execute("SELECT * FROM streaks WHERE user_id = ?", (guest_id,)).fetchone()
    if streak:
        user_streak = db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,)).fetchone()
        if user_streak:
            best = max(user_streak["best_streak"], streak["best_streak"])
            current = max(user_streak["current_streak"], streak["current_streak"])
            db.execute("UPDATE streaks SET current_streak = ?, best_streak = ? WHERE user_id = ?",
                        (current, best, user_id))
        else:
            db.execute("INSERT INTO streaks (user_id, current_streak, best_streak, last_active_date) VALUES (?, ?, ?, ?)",
                        (user_id, streak["current_streak"], streak["best_streak"], streak["last_active_date"]))

    db.execute("DELETE FROM xp_log WHERE user_id = ?", (guest_id,))
    db.execute("DELETE FROM progress WHERE user_id = ?", (guest_id,))
    db.execute("DELETE FROM badges WHERE user_id = ?", (guest_id,))
    db.execute("DELETE FROM streaks WHERE user_id = ?", (guest_id,))
    db.execute("DELETE FROM combo WHERE user_id = ?", (guest_id,))
    db.execute("DELETE FROM users WHERE id = ?", (guest_id,))
    db.commit()


@router.get("/me")
def get_profile(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    user = None
    if authorization:
        try:
            user = get_current_user(authorization, db)
        except HTTPException:
            pass

    if user:
        uid = user["id"]
    else:
        uid = get_or_create_guest(db)

    xp = get_user_xp(db, uid)
    level = get_level(xp)

    streak_row = db.execute("SELECT * FROM streaks WHERE user_id = ?", (uid,)).fetchone()
    combo_row = db.execute("SELECT * FROM combo WHERE user_id = ?", (uid,)).fetchone()

    from ..gamification import BADGES
    badge_rows = db.execute("SELECT badge_id FROM badges WHERE user_id = ?", (uid,)).fetchall()
    earned_ids = {r["badge_id"] for r in badge_rows}
    badges = [{"id": k, **v} for k, v in BADGES.items() if k in earned_ids]

    total_tasks = db.execute("SELECT COUNT(DISTINCT task_id) FROM progress WHERE user_id = ?", (uid,)).fetchone()[0]
    completed = db.execute("SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND status = 'completed'", (uid,)).fetchone()["c"]

    display_name = user["display_name"] if user else "Користувач"
    avatar_url = user["avatar_url"] if user and "avatar_url" in user.keys() else ""

    return {
        "user_id": uid,
        "display_name": display_name,
        "avatar_url": avatar_url,
        "logged_in": user is not None,
        "level": level,
        "streak": {"current": streak_row["current_streak"] if streak_row else 0, "best": streak_row["best_streak"] if streak_row else 0},
        "combo": {"current": combo_row["current_combo"] if combo_row else 0, "best": combo_row["best_combo"] if combo_row else 0},
        "badges": badges,
        "total_completed": completed,
        "total_tasks": total_tasks,
    }


@router.get("/leaderboard")
def leaderboard(db: sqlite3.Connection = Depends(get_db)):
    return get_leaderboard(db)
