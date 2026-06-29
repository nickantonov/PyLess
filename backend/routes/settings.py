from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
import sqlite3

from ..db import get_db
from ..routes.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])

PUBLIC_KEYS = {"site_name", "site_description"}


def get_setting(db: sqlite3.Connection, key: str) -> str:
    row = db.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else ""


def set_setting(db: sqlite3.Connection, key: str, value: str):
    db.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        (key, value),
    )
    db.commit()


@router.get("/{key}")
def read_setting(key: str, authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    if key not in PUBLIC_KEYS:
        if not authorization:
            raise HTTPException(401, "Not authenticated")
        user = get_current_user(authorization, db)
        if user.get("role") != "admin":
            raise HTTPException(403, "Admin only")
    value = get_setting(db, key)
    return {"key": key, "value": value}


@router.get("/")
def list_settings(authorization: str = Header(...),
                  db: sqlite3.Connection = Depends(get_db)):
    user = get_current_user(authorization, db)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    rows = db.execute("SELECT key, value, updated_at FROM settings ORDER BY key").fetchall()
    return [{"key": r["key"], "value": r["value"], "updated_at": r["updated_at"]} for r in rows]


@router.post("/")
def update_settings(body: dict, authorization: str = Header(...),
                    db: sqlite3.Connection = Depends(get_db)):
    user = get_current_user(authorization, db)
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    for key, value in body.items():
        if not isinstance(value, str):
            continue
        set_setting(db, key, value)
    return {"ok": True, "updated": len(body)}
