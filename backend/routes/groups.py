# Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
import sqlite3

from ..db import get_db
from ..routes.auth import get_current_user

router = APIRouter(prefix="/api/groups", tags=["groups"])


def _require_teacher(authorization: Optional[str], db: sqlite3.Connection):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    user = get_current_user(authorization, db)
    if user.get("role") not in ("admin", "teacher"):
        raise HTTPException(403, "Teacher or admin required")
    return user


def _is_teacher_or_admin(user: dict) -> bool:
    return user.get("role") in ("admin", "teacher")


@router.post("/")
def create_group(body: dict, authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    user = _require_teacher(authorization, db)
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Group name required")

    cur = db.execute(
        "INSERT INTO groups (name, creator_id, description) VALUES (?, ?, ?)",
        (name, user["id"], body.get("description", ""))
    )
    db.commit()
    group_id = cur.lastrowid

    db.execute(
        "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'teacher')",
        (group_id, user["id"])
    )
    db.commit()

    return {"ok": True, "group_id": group_id}


@router.get("/")
def list_groups(authorization: Optional[str] = Header(None),
                db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        return []
    user = get_current_user(authorization, db)

    if user.get("role") == "admin":
        rows = db.execute(
            "SELECT g.*, u.display_name as creator_name FROM groups g "
            "JOIN users u ON g.creator_id = u.id ORDER BY g.created_at DESC"
        ).fetchall()
    elif user.get("role") == "teacher":
        rows = db.execute(
            "SELECT DISTINCT g.*, u.display_name as creator_name FROM groups g "
            "JOIN users u ON g.creator_id = u.id "
            "WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = ? AND role = 'teacher') "
            "ORDER BY g.created_at DESC",
            (user["id"],)
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT DISTINCT g.*, u.display_name as creator_name FROM groups g "
            "JOIN users u ON g.creator_id = u.id "
            "WHERE g.id IN (SELECT group_id FROM group_members WHERE user_id = ?) "
            "ORDER BY g.created_at DESC",
            (user["id"],)
        ).fetchall()

    result = []
    for g in rows:
        members = db.execute(
            "SELECT gm.*, u.username, u.display_name, u.email FROM group_members gm "
            "JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?",
            (g["id"],)
        ).fetchall()
        result.append({
            "id": g["id"],
            "name": g["name"],
            "description": g["description"],
            "creator_name": g["creator_name"],
            "members": [
                {"user_id": m["user_id"], "role": m["role"], "username": m["username"],
                 "display_name": m["display_name"], "email": m["email"]}
                for m in members
            ],
            "created_at": g["created_at"],
        })
    return result


@router.get("/{group_id}")
def get_group(group_id: int, db: sqlite3.Connection = Depends(get_db)):
    g = db.execute("SELECT g.*, u.display_name as creator_name FROM groups g "
                    "JOIN users u ON g.creator_id = u.id WHERE g.id = ?", (group_id,)).fetchone()
    if not g:
        raise HTTPException(404, "Group not found")

    members = db.execute(
        "SELECT gm.*, u.username, u.display_name, u.email FROM group_members gm "
        "JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?",
        (group_id,)
    ).fetchall()

    return {
        "id": g["id"],
        "name": g["name"],
        "description": g["description"],
        "creator_name": g["creator_name"],
        "members": [
            {"user_id": m["user_id"], "role": m["role"], "username": m["username"],
             "display_name": m["display_name"], "email": m["email"]}
            for m in members
        ],
    }


@router.post("/{group_id}/members")
def add_member(group_id: int, body: dict, authorization: Optional[str] = Header(None),
               db: sqlite3.Connection = Depends(get_db)):
    user = _require_teacher(authorization, db)
    member_role = body.get("role", "student")
    if member_role not in ("student", "teacher"):
        raise HTTPException(400, "Role must be student or teacher")

    group = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        raise HTTPException(404, "Group not found")
    if group["creator_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not your group")

    target_user_id = body.get("user_id")
    if target_user_id:
        try:
            db.execute(
                "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)",
                (group_id, target_user_id, member_role)
            )
            db.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(400, "Already in group")
    elif body.get("email"):
        target = db.execute("SELECT id FROM users WHERE email = ?", (body["email"],)).fetchone()
        if not target:
            raise HTTPException(404, "User not found")
        try:
            db.execute(
                "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)",
                (group_id, target["id"], member_role)
            )
            db.commit()
        except sqlite3.IntegrityError:
            raise HTTPException(400, "Already in group")
    else:
        raise HTTPException(400, "user_id or email required")

    return {"ok": True}


@router.post("/{group_id}/join")
def join_group(group_id: int, body: dict = {}, authorization: Optional[str] = Header(None),
               db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    user = get_current_user(authorization, db)

    code = body.get("code", "")
    if code:
        invite = db.execute(
            "SELECT * FROM invite_codes WHERE code = ? AND group_id = ? AND active = 1",
            (code, group_id)
        ).fetchone()
        if not invite:
            raise HTTPException(400, "Invalid invite code")
    try:
        db.execute(
            "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'student')",
            (group_id, user["id"])
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Already in group")
    return {"ok": True}


@router.delete("/{group_id}/members/{user_id}")
def remove_member(group_id: int, user_id: int, authorization: Optional[str] = Header(None),
                  db: sqlite3.Connection = Depends(get_db)):
    user = _require_teacher(authorization, db)
    group = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        raise HTTPException(404, "Group not found")
    if group["creator_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not your group")

    db.execute("DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
               (group_id, user_id))
    db.commit()
    return {"ok": True}


@router.delete("/{group_id}")
def delete_group(group_id: int, authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    user = _require_teacher(authorization, db)
    group = db.execute("SELECT * FROM groups WHERE id = ?", (group_id,)).fetchone()
    if not group:
        raise HTTPException(404, "Group not found")
    if group["creator_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(403, "Not your group")

    db.execute("DELETE FROM group_members WHERE group_id = ?", (group_id,))
    db.execute("DELETE FROM groups WHERE id = ?", (group_id,))
    db.commit()
    return {"ok": True}
