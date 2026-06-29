# Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
import sqlite3

from ..db import get_db
from ..routes.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _require_mentor(authorization: Optional[str], db: sqlite3.Connection):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    user = get_current_user(authorization, db)
    if user.get("role") not in ("admin", "mentor"):
        raise HTTPException(403, "Mentor or admin required")
    return user


@router.post("/custom")
def create_custom_task(body: dict, authorization: Optional[str] = Header(None),
                       db: sqlite3.Connection = Depends(get_db)):
    user = _require_mentor(authorization, db)

    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(400, "Title required")

    cur = db.execute(
        "INSERT INTO custom_tasks (creator_id, title, description, starter_code, hints, tests, difficulty, language, explanation) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (user["id"], title,
         body.get("description", ""),
         body.get("starter_code", ""),
         json.dumps(body.get("hints", [])),
         json.dumps(body.get("tests", [])),
         body.get("difficulty", "medium"),
         body.get("language", "python"),
         body.get("explanation", ""))
    )
    db.commit()
    task_id = cur.lastrowid

    assign_to = body.get("assign_to", [])
    if "all" in assign_to:
        db.execute(
            "INSERT INTO task_assignments (task_id, creator_id, all_students) VALUES (?, ?, 1)",
            (task_id, user["id"])
        )
        db.commit()
    else:
        for student_id in assign_to:
            db.execute(
                "INSERT INTO task_assignments (task_id, creator_id, student_id) VALUES (?, ?, ?)",
                (task_id, user["id"], student_id)
            )
        db.commit()

    return {"ok": True, "task_id": task_id}


@router.get("/custom")
def list_custom_tasks(authorization: Optional[str] = Header(None),
                      db: sqlite3.Connection = Depends(get_db)):
    user = _require_mentor(authorization, db)

    tasks = db.execute(
        "SELECT * FROM custom_tasks WHERE creator_id = ? ORDER BY created_at DESC",
        (user["id"],)
    ).fetchall()

    result = []
    for t in tasks:
        assignments = db.execute(
            "SELECT * FROM task_assignments WHERE task_id = ?", (t["id"],)
        ).fetchall()
        result.append({
            "id": f"custom-{t['id']}",
            "db_id": t["id"],
            "title": t["title"],
            "description": t["description"],
            "starter_code": t["starter_code"],
            "hints": json.loads(t["hints"]),
            "tests": json.loads(t["tests"]),
            "difficulty": t["difficulty"],
            "language": t["language"],
            "explanation": t["explanation"],
            "assignments": [
                {
                    "id": a["id"],
                    "student_id": a["student_id"],
                    "all_students": bool(a["all_students"]),
                    "due_date": a["due_date"],
                }
                for a in assignments
            ],
            "created_at": t["created_at"],
        })
    return result


@router.get("/assigned")
def get_assigned_tasks(authorization: Optional[str] = Header(None),
                       db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        return []
    user = get_current_user(authorization, db)

    rows = db.execute("""
        SELECT ct.*, ta.due_date, ta.all_students, u.display_name as creator_name
        FROM task_assignments ta
        JOIN custom_tasks ct ON ta.task_id = ct.id
        JOIN users u ON ta.creator_id = u.id
        WHERE ta.student_id = ? OR ta.all_students = 1
        ORDER BY ta.created_at DESC
    """, (user["id"],)).fetchall()

    return [
        {
            "id": f"custom-{r['id']}",
            "db_id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "starter_code": r["starter_code"],
            "hints": json.loads(r["hints"]),
            "tests": json.loads(r["tests"]),
            "difficulty": r["difficulty"],
            "language": r["language"],
            "explanation": r["explanation"],
            "creator_name": r["creator_name"],
            "due_date": r["due_date"],
        }
        for r in rows
    ]


@router.delete("/custom/{task_id}")
def delete_custom_task(task_id: int, authorization: Optional[str] = Header(None),
                       db: sqlite3.Connection = Depends(get_db)):
    user = _require_mentor(authorization, db)
    task = db.execute("SELECT * FROM custom_tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        raise HTTPException(404, "Task not found")
    if task["creator_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not your task")
    db.execute("DELETE FROM task_assignments WHERE task_id = ?", (task_id,))
    db.execute("DELETE FROM custom_tasks WHERE id = ?", (task_id,))
    db.commit()
    return {"ok": True}
