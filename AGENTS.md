# PyLess — Status & Instructions

## Project
Interactive Python learning platform. freeCodeCamp/Codecademy-style open-source alternative.
- Backend: FastAPI + SQLite + Groq AI + Gamification + Auth + Admin + Messaging
- Frontend: React + TypeScript + Vite + TailwindCSS + Zustand + Monaco Editor + Pyodide + CodeSandbox
- Location: `/home/fox/DEPLOY/PyLess/`

## What's Done (2026-06-29)

### Backend
- Auth: register/login (email+password), Google OAuth (redirect flow), JWT (30 days, auto-generated secret)
- Guest mode: `ensure_guest()` for unauthenticated users, progress tracked
- Profile: `/api/profile/me` — works with or without auth, returns level/streak/combo/badges
- Tasks: 77 exercises + 6 lessons across 16 modules
  - Multi-runtime: Python→Pyodide, HTML/CSS/JS/React→iframe CodeSandbox
  - Lessons (l-*) auto-merge description/hints/tests/starter_code from exercises
- Gamification: XP (100/75/50 × streak × combo), 10 levels, 20 badges (incl. speed achievements), daily challenges, leaderboard
- Admin: roles (user/mentor/admin), invite codes, student management, mentor notes, stats, settings API
- Messaging: mentor↔student chat, contacts, unread count, validation (no student↔student), length limit (2000 chars)
- AI: Groq API (llama-3.3-70b-versatile), graceful 429 fallback, rate limiting (10 req/min)
- DB: SQLite with WAL, `check_same_thread=False` (CRITICAL for FastAPI)
- Health check: `/api/health` with uptime, DB size, user count, tasks completed
- Tests: 19 API tests (pytest)

### Frontend
- AuthPage: login/register tabs, Google OAuth button, "continue as guest"
- Editor: custom Monaco wrapper (CDN monaco-editor@0.52.2)
  - Split-view: task left (40%), editor right (60%) — freeCodeCamp style
  - Left pane: instructions, progressive hints, output/test results
  - Right pane: Monaco editor + CodeSandbox (for non-Python tasks)
- CodeSandbox: iframe-based execution for HTML/CSS/JS/React
- Task condition: compact header shows title, description, hint, expected output
- Sidebar: lessons + exercises grouped by module, 16 modules
- Profile: level, streak, badges, leaderboard, join mentor (invite code)
- AdminDashboard: overview stats, student list, invite management, student detail with notes, settings (Groq API key)
- ChatPanel: contacts list + real-time messaging
- AI Chat: Groq-powered tutor
- Pyodide: Python execution in browser
- Glassmorphism design, dark/light themes, 20 Monaco themes

### DevOps
- GitHub Actions CI/CD (test → build Docker)
- Docker Compose: development + production (Nginx + SSL)
- SQLite backup script (daily cron, keeps 7 days)
- Nginx: SSL, rate limiting, gzip, security headers

## Known Issues / TODO
- Monaco editor loads from CDN (stackframe.js error is harmless, just console noise)
- No production deployment yet (Docker Compose ready, needs SSL certs)
- Google OAuth needs `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars

## Start Commands
```bash
# Backend
GROQ_API_KEY="gsk_..." nohup python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --app-dir /home/fox/DEPLOY/PyLess &

# Frontend build
cd /home/fox/DEPLOY/PyLess/frontend && npx vite build

# Tests
python3 -m pytest backend/tests/ -v

# Or use start.sh
bash start.sh
```

## Env Variables
- `GROQ_API_KEY` — AI tutor (required)
- `GOOGLE_CLIENT_ID` — Google OAuth (optional)
- `GOOGLE_CLIENT_SECRET` — Google OAuth (optional)
- `ADMIN_CODE` — promote to admin (optional, first user auto-promoted)
- `JWT_SECRET` — JWT signing key (optional, auto-generated if not set)
- `CORS_ORIGINS` — comma-separated allowed origins (optional, defaults to `*`)
- `DB_DIR` — database directory (optional, defaults to backend/)

## Key Files
- `backend/main.py` — FastAPI app, routers, static file serving, lifespan
- `backend/db.py` — SQLite schema, migrations
- `backend/gamification.py` — XP, levels, badges, streak, combo, daily challenges
- `backend/routes/auth.py` — register/login/Google OAuth/promote/join/settings
- `backend/routes/tasks.py` — task list, get (with lesson→exercise merge), complete, fail
- `backend/routes/profile.py` — profile with guest/auth modes, guest→user merge
- `backend/routes/admin.py` — mentor admin panel, invites, notes, stats
- `backend/routes/messages.py` — mentor↔student messaging
- `backend/routes/ai.py` — Groq AI chat with rate limiting
- `backend/routes/settings.py` — key-value settings (groq_api_key, site_name, etc.)
- `frontend/src/App.tsx` — main app, token handling, routing
- `frontend/src/store.ts` — Zustand store (auth, tasks, profile, UI state)
- `frontend/src/components/EditorPanel.tsx` — Monaco editor + CodeSandbox + split-view
- `frontend/src/components/CodeSandbox.tsx` — iframe-based HTML/CSS/JS/React execution
- `frontend/src/components/AuthPage.tsx` — login/register UI
- `frontend/src/components/AdminDashboard.tsx` — admin/mentor panel + settings
- `frontend/src/components/ChatPanel.tsx` — messaging UI
- `frontend/src/components/InvitePage.tsx` — invite code landing page
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
- `settings` (key, value, updated_at)

## Git Rollback Points
- `939ebd2` — Phase 4-6 complete (safest rollback point)
- `0857df5` — Phase 7 complete
- `70e79ad` — Phase 8 complete (latest)
- Rollback: `git reset --hard <commit>`
