import json
import os
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Header
import sqlite3
from typing import Optional

from ..db import get_db
from ..models import CodeSubmission
from ..routes.auth import optional_user, _ensure_user_rows
from ..routes.profile import get_or_create_guest
from ..gamification import (
    add_xp, update_streak, update_combo, check_badges,
    get_daily_challenge, get_leaderboard, get_user_profile,
    BADGES,
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

TASKS_DIR = os.path.join(os.path.dirname(__file__), "..", "tasks", "python")


def load_all_tasks():
    tasks = []
    modules = sorted(os.listdir(TASKS_DIR)) if os.path.exists(TASKS_DIR) else []
    for i, module_dir in enumerate(modules):
        module_path = os.path.join(TASKS_DIR, module_dir)
        if not os.path.isdir(module_path):
            continue
        for fname in sorted(os.listdir(module_path)):
            if fname.endswith(".json"):
                with open(os.path.join(module_path, fname)) as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for item in data:
                            item["module_order"] = i + 1
                            if "difficulty" not in item:
                                item["difficulty"] = "easy"
                            if "module" not in item:
                                item["module"] = module_dir.split("_", 1)[1] if "_" in module_dir else module_dir
                            tasks.append(item)
                    else:
                        data["module_order"] = i + 1
                        tasks.append(data)
    return tasks


ALL_TASKS = load_all_tasks()


def _resolve_user_id(authorization: str, db: sqlite3.Connection) -> int:
    user = optional_user(authorization, db)
    if user:
        return user["id"]
    return get_or_create_guest(db)


@router.get("/list")
def list_tasks(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    uid = _resolve_user_id(authorization or "", db)
    result = []
    for task in ALL_TASKS:
        item = {
            "id": task["id"],
            "module": task.get("module", ""),
            "module_order": task.get("module_order", 0),
            "title": task.get("title", task.get("concept", "")),
            "difficulty": task.get("difficulty", "easy"),
            "type": task.get("type", "task"),
            "duration": task.get("duration", ""),
        }
        row = db.execute(
            "SELECT status, attempts FROM progress WHERE user_id = ? AND task_id = ?",
            (uid, task["id"]),
        ).fetchone()
        item["status"] = row["status"] if row else "not_started"
        item["attempts"] = row["attempts"] if row else 0
        result.append(item)
    return result


@router.get("/{task_id}")
def get_task(task_id: str):
    for task in ALL_TASKS:
        if task["id"] == task_id:
            result = dict(task)
            if task_id.startswith("l-"):
                exercise_id = task_id[2:]
                exercise = next((t for t in ALL_TASKS if t["id"] == exercise_id), None)
                if exercise:
                    for key in ("tests", "description", "hints", "starter_code"):
                        if exercise.get(key):
                            result[key] = exercise[key]
            return result
    raise HTTPException(404, "Task not found")


@router.post("/submit")
def submit_code(sub: CodeSubmission, authorization: Optional[str] = Header(None),
                db: sqlite3.Connection = Depends(get_db)):
    task = next((t for t in ALL_TASKS if t["id"] == sub.task_id), None)
    if not task:
        raise HTTPException(404, "Task not found")
    return {"results": [], "all_passed": False}


@router.post("/{task_id}/complete")
def complete_task(task_id: str, best_code: str = "",
                  authorization: Optional[str] = Header(None),
                  db: sqlite3.Connection = Depends(get_db)):
    uid = _resolve_user_id(authorization or "", db)

    existing = db.execute(
        "SELECT status, attempts FROM progress WHERE user_id = ? AND task_id = ?",
        (uid, task_id),
    ).fetchone()

    was_completed = existing and existing["status"] == "completed"
    if was_completed:
        return {"ok": True, "xp_added": 0, "already_completed": True}

    attempts = (existing["attempts"] if existing else 0) + 1
    is_first_try = attempts == 1

    db.execute(
        "INSERT INTO progress (user_id, task_id, status, attempts, best_code, first_try, completed_at) "
        "VALUES (?, ?, 'completed', ?, ?, ?, CURRENT_TIMESTAMP) "
        "ON CONFLICT(user_id, task_id) DO UPDATE SET status='completed', attempts=?, best_code=?, first_try=?, completed_at=CURRENT_TIMESTAMP",
        (uid, task_id, attempts, best_code, 1 if is_first_try else 0, attempts, best_code, 1 if is_first_try else 0),
    )
    db.commit()

    task = next((t for t in ALL_TASKS if t["id"] == task_id), None)
    base_xp = 100
    if attempts >= 4:
        base_xp = 50
    elif attempts >= 2:
        base_xp = 75

    if task and task.get("difficulty") == "hard":
        base_xp = int(base_xp * 1.5)

    if is_first_try:
        base_xp += 25

    streak_info = update_streak(db, uid)
    combo_info = update_combo(db, uid, passed=True)

    xp_result = add_xp(db, uid, base_xp, f"Task: {task_id}")
    new_badges = check_badges(db, uid)

    return {
        "ok": True,
        "xp_added": xp_result["added"],
        "xp_total": xp_result["total"],
        "multiplier": xp_result["multiplier"],
        "streak": streak_info,
        "combo": combo_info,
        "badges": [{"name": b["name"], "desc": b["desc"], "rarity": b["rarity"]} for b in new_badges],
    }


@router.post("/{task_id}/fail")
def fail_task(task_id: str, authorization: Optional[str] = Header(None),
              db: sqlite3.Connection = Depends(get_db)):
    uid = _resolve_user_id(authorization or "", db)

    db.execute(
        "INSERT INTO progress (user_id, task_id, status, attempts) VALUES (?, ?, 'attempted', 1) "
        "ON CONFLICT(user_id, task_id) DO UPDATE SET status='attempted', attempts = attempts + 1",
        (uid, task_id),
    )
    db.commit()
    update_combo(db, uid, passed=False)
    return {"ok": True}


@router.get("/daily/challenge")
def daily_challenge(db: sqlite3.Connection = Depends(get_db)):
    challenge = get_daily_challenge(db)
    task = next((t for t in ALL_TASKS if t["id"] == challenge["task_id"]), None)
    return {**challenge, "task": task}


@router.get("/leaderboard/top")
def leaderboard(db: sqlite3.Connection = Depends(get_db)):
    return get_leaderboard(db)


@router.get("/profile/{user_id}")
def profile(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    return get_user_profile(db, user_id)


@router.get("/badges/list")
def badges_list():
    return [{"id": k, **v} for k, v in BADGES.items()]
