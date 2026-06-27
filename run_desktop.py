#!/usr/bin/env python3
"""PyLess — Entry point for PyInstaller build."""
import os, sys, threading, webbrowser, time

def _open_browser():
    time.sleep(2)
    webbrowser.open("http://localhost:8000")

def main():
    base = Path(sys._MEIPASS) if getattr(sys, '_MEIPASS', None) else Path(__file__).resolve().parent

    os.environ.setdefault("GROQ_API_KEY", "")
    os.environ.setdefault("FRONTEND_URL", "http://localhost:8000")

    from backend.db import init_db
    init_db()

    FRONTEND_DIR = base / "frontend" / "dist"
    if not FRONTEND_DIR.exists():
        FRONTEND_DIR = base / "dist"

    import uvicorn
    from backend.main import app

    if not os.environ.get("PYLESS_NO_BROWSER"):
        threading.Thread(target=_open_browser, daemon=True).start()

    print()
    print("  🐍 PyLess — Python Learning Platform")
    print("  © 1998-2026 Nick Antonov / Borodachamba Studio")
    print()
    print(f"  🌐 Open: http://localhost:8000")
    print(f"  📁 Frontend: {FRONTEND_DIR}")
    print()
    print("  Press Ctrl+C to stop")
    print()

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    from pathlib import Path
    main()
