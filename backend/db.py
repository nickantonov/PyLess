import sqlite3
import os
from contextlib import contextmanager

DB_DIR = os.environ.get("DB_DIR", os.path.dirname(__file__))
DB_PATH = os.path.join(DB_DIR, "pylesss.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL DEFAULT '',
            display_name TEXT DEFAULT '',
            avatar_url TEXT DEFAULT '',
            auth_provider TEXT DEFAULT 'email',
            google_id TEXT DEFAULT '',
            theme TEXT DEFAULT 'dark',
            editor_theme TEXT DEFAULT 'vs-dark',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            task_id TEXT NOT NULL,
            status TEXT DEFAULT 'not_started',
            attempts INTEGER DEFAULT 0,
            best_code TEXT,
            first_try INTEGER DEFAULT 0,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, task_id)
        );

        CREATE TABLE IF NOT EXISTS streaks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            last_active_date DATE,
            grace_used INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS xp_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS badges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            badge_id TEXT NOT NULL,
            earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, badge_id)
        );

        CREATE TABLE IF NOT EXISTS daily_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE UNIQUE NOT NULL,
            task_id TEXT NOT NULL,
            bonus_xp INTEGER DEFAULT 150
        );

        CREATE TABLE IF NOT EXISTS combo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            current_combo INTEGER DEFAULT 0,
            best_combo INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS onboarding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            answers TEXT NOT NULL,
            total_score INTEGER DEFAULT 0,
            level TEXT DEFAULT 'beginner',
            start_module INTEGER DEFAULT 1,
            start_task TEXT DEFAULT 'py-01-01',
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    for col, typedef in [
        ("avatar_url", "TEXT DEFAULT ''"),
        ("auth_provider", "TEXT DEFAULT 'email'"),
        ("google_id", "TEXT DEFAULT ''"),
    ]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
        except sqlite3.OperationalError:
            pass
    conn.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL")
    for col, typedef in [
        ("role", "TEXT DEFAULT 'user'"),
        ("mentor_id", "INTEGER DEFAULT 0"),
    ]:
        try:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
        except sqlite3.OperationalError:
            pass

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            mentor_id INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 50,
            uses INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            active INTEGER DEFAULT 1,
            FOREIGN KEY (mentor_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS mentor_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mentor_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (mentor_id) REFERENCES users(id),
            FOREIGN KEY (student_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id INTEGER NOT NULL,
            to_user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (from_user_id) REFERENCES users(id),
            FOREIGN KEY (to_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.close()
