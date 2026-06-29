from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .db import init_db
from .routes import auth, tasks, ai, onboarding, profile, admin, messages, settings

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="PyLess API", version="1.0.0",
              description="Interactive Python learning platform. © 1998-2026 Nick Antonov / Borodachamba Studio. All rights reserved.",
              lifespan=lifespan)

ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(ai.router)
app.include_router(onboarding.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(messages.router)
app.include_router(settings.router)


import time

_start_time = time.time()


@app.get("/api/health")
def health():
    import sqlite3
    from .db import DB_PATH
    result = {
        "status": "ok",
        "version": "1.0.0",
        "uptime_seconds": int(time.time() - _start_time),
        "copyright": "© 1998-2026 Nick Antonov / Borodachamba Studio. All rights reserved.",
    }
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        db_size = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
        users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        tasks_done = conn.execute("SELECT COUNT(*) as c FROM progress WHERE status='completed'").fetchone()["c"]
        conn.close()
        result["db_size_mb"] = round(db_size / 1024 / 1024, 2)
        result["total_users"] = users
        result["tasks_completed"] = tasks_done
    except Exception:
        result["db_error"] = True
    return result


if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if not full_path:
            return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
        file_path = os.path.join(FRONTEND_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        ext = os.path.splitext(full_path)[1].lower()
        if ext in ('.js', '.css', '.map', '.json', '.wasm', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2', '.ttf'):
            from fastapi.responses import Response
            return Response(status_code=404)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
