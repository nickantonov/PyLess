import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from fastapi.responses import RedirectResponse
from passlib.context import CryptContext
from jose import jwt, JWTError
import httpx
import sqlite3
import secrets

from ..db import get_db
from ..models import UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.environ.get("JWT_SECRET", "pylesss-secret-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_state_store: dict[str, dict] = {}


def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError):
        raise HTTPException(401, "Invalid token")
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        raise HTTPException(401, "User not found")
    return dict(user)


def optional_user(authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        return None
    try:
        return get_current_user(authorization, db)
    except HTTPException:
        return None


def _ensure_user_rows(db: sqlite3.Connection, user_id: int):
    db.execute("INSERT OR IGNORE INTO streaks (user_id) VALUES (?)", (user_id,))
    db.execute("INSERT OR IGNORE INTO combo (user_id, current_combo, best_combo) VALUES (?, 0, 0)", (user_id,))
    db.commit()


@router.post("/register")
def register(data: UserCreate, db: sqlite3.Connection = Depends(get_db)):
    if db.execute("SELECT 1 FROM users WHERE username = ?", (data.username,)).fetchone():
        raise HTTPException(400, "Username taken")
    if db.execute("SELECT 1 FROM users WHERE email = ?", (data.email,)).fetchone():
        raise HTTPException(400, "Email taken")
    hashed = pwd_context.hash(data.password)
    db.execute(
        "INSERT INTO users (username, email, password_hash, display_name, auth_provider) VALUES (?, ?, ?, ?, 'email')",
        (data.username, data.email, hashed, data.display_name or data.username),
    )
    db.commit()
    user = db.execute("SELECT * FROM users WHERE username = ?", (data.username,)).fetchone()
    _ensure_user_rows(db, user["id"])
    token = create_token(user["id"])
    return {"token": token, "user": _user_dict(user)}


@router.post("/join")
def join_with_code(code: str = "", authorization: Optional[str] = Header(None),
                   db: sqlite3.Connection = Depends(get_db)):
    if not code:
        raise HTTPException(400, "Invite code required")

    invite = db.execute(
        "SELECT * FROM invite_codes WHERE code = ? AND active = 1", (code,)
    ).fetchone()
    if not invite:
        raise HTTPException(404, "Invalid or expired invite code")

    if invite["expires_at"]:
        from datetime import datetime
        exp = datetime.fromisoformat(invite["expires_at"])
        if datetime.utcnow() > exp:
            raise HTTPException(400, "Invite code expired")

    if invite["uses"] >= invite["max_uses"]:
        raise HTTPException(400, "Invite code usage limit reached")

    user = None
    if authorization:
        try:
            user = get_current_user(authorization, db)
        except HTTPException:
            pass

    if not user:
        raise HTTPException(401, "Login first, then use this code to join a mentor's group")

    db.execute("UPDATE users SET mentor_id = ? WHERE id = ?", (invite["mentor_id"], user["id"]))
    db.execute("UPDATE invite_codes SET uses = uses + 1 WHERE id = ?", (invite["id"],))
    db.commit()

    updated = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return {"ok": True, "user": _user_dict(updated), "mentor_id": invite["mentor_id"]}


@router.post("/login")
def login(data: UserLogin, db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE (username = ? OR email = ?) AND auth_provider = 'email'",
                       (data.username, data.username)).fetchone()
    if not user or not user["password_hash"] or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_token(user["id"])
    return {"token": token, "user": _user_dict(user)}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return _user_dict(user)


@router.put("/settings")
def update_settings(theme: Optional[str] = None, editor_theme: Optional[str] = None, display_name: Optional[str] = None,
                    user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    if theme:
        db.execute("UPDATE users SET theme = ? WHERE id = ?", (theme, user["id"]))
    if editor_theme:
        db.execute("UPDATE users SET editor_theme = ? WHERE id = ?", (editor_theme, user["id"]))
    if display_name:
        db.execute("UPDATE users SET display_name = ? WHERE id = ?", (display_name, user["id"]))
    db.commit()
    updated = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return _user_dict(updated)


@router.get("/google")
def google_login():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google OAuth not configured. Set GOOGLE_CLIENT_ID.")
    state = secrets.token_urlsafe(32)
    _state_store[state] = {"created": datetime.utcnow().isoformat()}
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code&scope=openid%20email%20profile&state={state}&access_type=offline&prompt=consent"
    )
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str = "", state: str = "", db: sqlite3.Connection = Depends(get_db)):
    if not code:
        raise HTTPException(400, "Missing authorization code")
    _state_store.pop(state, None)

    token_resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }, timeout=15)
    if token_resp.status_code != 200:
        raise HTTPException(400, "Failed to exchange code for token")

    access_token = token_resp.json()["access_token"]
    user_info = httpx.get("https://www.googleapis.com/oauth2/v2/userinfo",
                          headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    if user_info.status_code != 200:
        raise HTTPException(400, "Failed to get user info")

    info = user_info.json()
    google_id = info["id"]
    email = info["email"]
    display_name = info.get("name", email.split("@")[0])
    avatar_url = info.get("picture", "")

    user = db.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
    if not user:
        user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if user:
            db.execute("UPDATE users SET google_id = ?, avatar_url = ?, auth_provider = 'google' WHERE id = ?",
                        (google_id, avatar_url, user["id"]))
            db.commit()
            user = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
        else:
            username = email.split("@")[0]
            base_username = username
            counter = 1
            while db.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
                username = f"{base_username}{counter}"
                counter += 1
            db.execute(
                "INSERT INTO users (username, email, password_hash, display_name, avatar_url, auth_provider, google_id) "
                "VALUES (?, ?, '', ?, ?, 'google', ?)",
                (username, email, display_name, avatar_url, google_id),
            )
            db.commit()
            user = db.execute("SELECT * FROM users WHERE google_id = ?", (google_id,)).fetchone()
            _ensure_user_rows(db, user["id"])
    else:
        if avatar_url and avatar_url != user["avatar_url"]:
            db.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user["id"]))
            db.commit()

    token = create_token(user["id"])
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:8000")
    return RedirectResponse(f"{frontend_url}/?token={token}")


@router.post("/promote")
def promote_to_admin(code: str = "", user=Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    admin_code = os.environ.get("ADMIN_CODE", "")
    if not admin_code:
        admin_count = db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").fetchone()["c"]
        if admin_count == 0:
            db.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user["id"],))
            db.commit()
            updated = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            return {"ok": True, "user": _user_dict(updated), "message": "First user promoted to admin"}
        raise HTTPException(403, "ADMIN_CODE env var required for non-first users")

    if code != admin_code:
        raise HTTPException(403, "Invalid admin code")

    db.execute("UPDATE users SET role = 'admin' WHERE id = ?", (user["id"],))
    db.commit()
    updated = db.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return {"ok": True, "user": _user_dict(updated)}


@router.post("/promote/{target_id}")
def promote_user(target_id: int, role: str = "mentor",
                 authorization: Optional[str] = Header(None),
                 db: sqlite3.Connection = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "Not authenticated")
    admin = get_current_user(authorization, db)
    if admin.get("role") != "admin":
        raise HTTPException(403, "Admin only")

    if role not in ("user", "mentor", "admin"):
        raise HTTPException(400, "Invalid role")

    target = db.execute("SELECT * FROM users WHERE id = ?", (target_id,)).fetchone()
    if not target:
        raise HTTPException(404, "User not found")

    db.execute("UPDATE users SET role = ? WHERE id = ?", (role, target_id))
    db.commit()
    updated = db.execute("SELECT * FROM users WHERE id = ?", (target_id,)).fetchone()
    return {"ok": True, "user": _user_dict(updated)}


def _user_dict(user) -> dict:
    keys = user.keys()
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "display_name": user["display_name"],
        "avatar_url": user["avatar_url"] if "avatar_url" in keys else "",
        "auth_provider": user["auth_provider"] if "auth_provider" in keys else "email",
        "role": user["role"] if "role" in keys else "user",
        "mentor_id": user["mentor_id"] if "mentor_id" in keys else 0,
        "theme": user["theme"],
        "editor_theme": user["editor_theme"],
    }
