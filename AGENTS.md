# PyLess — Status & Instructions

## Project
Interactive Python learning platform. freeCodeCamp/Codecademy-style open-source alternative.
- Backend: FastAPI + SQLite + Groq AI + Gamification + Auth + Admin + Messaging
- Frontend: React + TypeScript + Vite + TailwindCSS + Zustand + Monaco Editor + Pyodide
- Location: `/home/fox/DEPLOY/PyLess/`

## What's Done (2026-06-27)

### Backend
- Auth: register/login (email+password), Google OAuth (redirect flow), JWT (30 days)
- Guest mode: `ensure_guest()` for unauthenticated users, progress tracked
- Profile: `/api/profile/me` — works with or without auth, returns level/streak/combo/badges
- Tasks: 28 exercises + 6 lessons across 10 modules
  - Lessons (l-py-*) auto-merge description/hints/tests/starter_code from exercises (py-*)
- Gamification: XP (100/75/50 × streak × combo), 10 levels, 15 badges, daily challenges, leaderboard
- Admin: roles (user/mentor/admin), invite codes, student management, mentor notes, stats
- Messaging: mentor↔student chat, contacts, unread count, validation (no student↔student)
- AI: Groq API (llama-3.3-70b-versatile), graceful 429 fallback
- DB: SQLite with WAL, `check_same_thread=False` (CRITICAL for FastAPI)

### Frontend
- AuthPage: login/register tabs, Google OAuth button, "continue as guest"
- Editor: custom Monaco wrapper (no @monaco-editor/react CDN issues)
  - Uses CDN `monaco-editor@0.52.2` via AMD loader directly
  - Workers not bundled — loads from CDN
- Task condition: compact header shows title, description, hint, expected output
- Sidebar: lessons + exercises grouped by module
- Profile: level, streak, badges, leaderboard, join mentor (invite code)
- AdminDashboard: overview stats, student list, invite management, student detail with notes
- ChatPanel: contacts list + real-time messaging
- AI Chat: Groq-powered tutor
- Pyodide: Python execution in browser
- Glassmorphism design, dark/light themes, 20 Monaco themes
- CSS: `input:not([type="checkbox"]):not([type="radio"])` for global input styles

## Known Issues / TODO
- Monaco editor loads from CDN (stackframe.js error is harmless, just console noise)
- 28 old-format tasks need review (they work but could have better descriptions)
- Web Development and Desktop/CLI modules planned
- freeCodeCamp-style split-view redesign still planned
- Google OAuth needs `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars
- No production deployment yet

## Start Commands
```bash
# Backend
GROQ_API_KEY="gsk_..." nohup python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --app-dir /home/fox/DEPLOY/PyLess &

# Frontend build
cd /home/fox/DEPLOY/PyLess/frontend && npx vite build

# Or use start.sh
bash start.sh
```

## Env Variables
- `GROQ_API_KEY` — AI tutor (required)
- `GOOGLE_CLIENT_ID` — Google OAuth (optional)
- `GOOGLE_CLIENT_SECRET` — Google OAuth (optional)
- `ADMIN_CODE` — promote to admin (optional, first user auto-promoted)
- `JWT_SECRET` — JWT signing key (optional, has default)

## Key Files
- `backend/main.py` — FastAPI app, routers, static file serving
- `backend/db.py` — SQLite schema, migrations
- `backend/routes/auth.py` — register/login/Google OAuth/promote/join
- `backend/routes/tasks.py` — task list, get (with lesson→exercise merge), complete, fail
- `backend/routes/profile.py` — profile with guest/auth modes, guest→user merge
- `backend/routes/admin.py` — mentor admin panel, invites, notes, stats
- `backend/routes/messages.py` — mentor↔student messaging
- `backend/routes/ai.py` — Groq AI chat
- `frontend/src/App.tsx` — main app, token handling, routing
- `frontend/src/store.ts` — Zustand store (auth, tasks, profile, UI state)
- `frontend/src/components/EditorPanel.tsx` — Monaco editor + task display
- `frontend/src/components/AuthPage.tsx` — login/register UI
- `frontend/src/components/AdminDashboard.tsx` — admin/mentor panel
- `frontend/src/components/ChatPanel.tsx` — messaging UI
- `frontend/src/components/Profile.tsx` — user profile popup

## Database Tables
- `users` (id, username, email, password_hash, display_name, avatar_url, auth_provider, google_id, role, mentor_id, theme, editor_theme)
- `progress` (user_id, task_id, status, attempts, best_code, first_try)
- `streaks` (user_id, current_streak, best_streak, last_active_date, grace_used)
- `combo` (user_id, current_combo, best_combo)
- `xp_log` (user_id, amount, reason)
- `badges` (user_id, badge_id)
- `daily_challenges` (date, task_id, bonus_xp)
- `onboarding` (user_id, answers, total_score, level, start_module, start_task)
- `invite_codes` (code, mentor_id, max_uses, uses, expires_at, active)
- `mentor_notes` (mentor_id, student_id, text)
- `messages` (from_user_id, to_user_id, text, read)
