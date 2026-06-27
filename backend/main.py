from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from .db import init_db
from .routes import auth, tasks, ai, onboarding, profile, admin, messages

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

app = FastAPI(title="PyLess API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


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
