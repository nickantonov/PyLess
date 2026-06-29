# 🔧 Engineering Guide — PyLess

## Architecture Overview

PyLess is a full-stack web application with:
- **Backend**: FastAPI (Python) with SQLite
- **Frontend**: React 18 + TypeScript + Vite
- **Execution**: Pyodide (Python in browser) + CodeSandbox (HTML/CSS/JS)
- **Video**: WebRTC P2P with WebSocket signaling
- **AI**: Groq API (llama-3.3-70b-versatile)
- **Deploy**: Nginx + Docker + Systemd

---

## Tech Stack Deep Dive

### Backend (`backend/`)

#### Framework: FastAPI
- Async Python web framework
- Auto-generated OpenAPI docs at `/docs`
- Dependency injection for DB connections
- Pydantic models for validation

#### Database: SQLite
- File-based, no server needed
- WAL mode for concurrent reads
- `check_same_thread=False` for FastAPI
- Auto-migrations in `db.py`

#### Authentication: JWT
- Auto-generated secret on first run (stored in `settings` table)
- 30-day token expiry
- bcrypt password hashing
- Google OAuth support (configurable)

#### Key Patterns
```python
# Dependency injection
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Route with auth
@router.get("/protected")
def protected_route(authorization: str = Header(...), db = Depends(get_db)):
    user = get_current_user(authorization, db)
    return {"user": user}
```

### Frontend (`frontend/`)

#### Framework: React 18
- Functional components with hooks
- TypeScript for type safety
- Vite for fast builds

#### State Management: Zustand
```typescript
const useStore = create<Store>((set, get) => ({
  user: null,
  token: localStorage.getItem('pylesss_token'),
  // ... state and actions
}))
```

#### Code Execution
- **Python**: Pyodide (WebAssembly) runs in browser
- **HTML/CSS/JS/React**: iframe sandbox with postMessage

#### Monaco Editor
- Loaded from CDN (not bundled)
- Custom wrapper component
- 20 themes available

### Video System

#### WebRTC Signaling
- WebSocket server for peer discovery
- ICE candidates via STUN server
- Room-based architecture

```
Browser A ←──WebRTC──→ Browser B
    │                     │
    └──WebSocket──→ Server ┘
```

#### Components
- `video_hub.py` — signaling server
- `VideoRoom.tsx` — UI with video grid
- `LessonRooms.tsx` — room management

---

## Database Schema

### Core Tables
```sql
users (id, username, email, password_hash, role, mentor_id, ...)
progress (user_id, task_id, status, attempts, best_code, first_try)
streaks (user_id, current_streak, best_streak, last_active_date)
combo (user_id, current_combo, best_combo)
xp_log (user_id, amount, reason)
badges (user_id, badge_id)
```

### Education Tables
```sql
custom_tasks (id, creator_id, title, description, starter_code, ...)
task_assignments (task_id, creator_id, student_id, all_students, ...)
groups (id, name, creator_id, description)
group_members (group_id, user_id, role)
```

### Communication Tables
```sql
messages (from_user_id, to_user_id, text, read)
video_rooms (id, creator_id, name, room_code, is_active)
lesson_materials (room_id, uploader_id, filename, ...)
```

### System Tables
```sql
settings (key, value, updated_at)
invite_codes (code, mentor_id, max_uses, uses, ...)
```

---

## API Endpoints

### Auth (10 endpoints)
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — get JWT token
- `GET /api/auth/me` — current user
- `GET /api/auth/google` — Google OAuth redirect
- `GET /api/auth/google/callback` — OAuth callback
- `POST /api/auth/promote` — self-promote (first user)
- `POST /api/auth/promote/{id}` — promote user (admin)
- `POST /api/auth/join` — join via invite code
- `GET /api/auth/invite/{code}` — validate invite

### Tasks (9 endpoints)
- `GET /api/tasks/list` — all tasks with progress
- `GET /api/tasks/{id}` — task details
- `POST /api/tasks/{id}/complete` — mark complete + XP
- `POST /api/tasks/{id}/fail` — record attempt
- `POST /api/tasks/submit` — code submission (stub)
- `GET /api/tasks/daily/challenge` — daily challenge
- `GET /api/tasks/leaderboard/top` — leaderboard
- `GET /api/tasks/badges/list` — all badges

### Groups (7 endpoints)
- `POST /api/groups/` — create group
- `GET /api/groups/` — list groups
- `GET /api/groups/{id}` — group details
- `POST /api/groups/{id}/members` — add member
- `POST /api/groups/{id}/join` — join group
- `DELETE /api/groups/{id}/members/{uid}` — remove member
- `DELETE /api/groups/{id}` — delete group

### Video (8 endpoints)
- `POST /api/video/rooms` — create room
- `GET /api/video/rooms` — list rooms
- `POST /api/video/rooms/{id}/start` — start room
- `POST /api/video/rooms/{id}/end` — end room
- `DELETE /api/video/rooms/{id}` — delete room
- `POST /api/video/rooms/{id}/materials` — upload file
- `GET /api/video/rooms/{id}/materials` — list materials
- `WS /api/video/ws/{code}/{uid}/{name}` — WebSocket

---

## Development

### Setup
```bash
# Backend
pip install -r requirements.txt
python3 -m uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### Testing
```bash
# Backend (19 tests)
python3 -m pytest backend/tests/ -v

# Frontend build
cd frontend && npm run build
```

### Adding New Tasks

1. Create JSON file in `backend/tasks/python/{module}/`
2. Format:
```json
{
  "id": "py-XX-YY",
  "module": "Module Name",
  "module_order": XX,
  "language": "python",
  "title": "Task Title",
  "difficulty": "easy|medium|hard",
  "description": "What to do",
  "starter_code": "# Starting code",
  "hints": ["Hint 1", "Hint 2"],
  "tests": [{"input": "...", "expected": "..."}],
  "explanation": "Why this works"
}
```

3. Restart backend to load new tasks

### Adding New Modules

1. Create directory: `backend/tasks/python/XX_modulename/`
2. Add lesson file: `l-01.json`
3. Add exercise files: `01.json`, `02.json`, ...
4. Update `frontend/src/types.ts` MODULES array
5. Update `frontend/src/components/Sidebar.tsx` modules list

---

## Deployment

### Production Stack
```
Client → Cloudflare (SSL) → Nginx (proxy) → FastAPI (app) → SQLite (DB)
```

### Environment Variables
```bash
GROQ_API_KEY=        # AI tutor
JWT_SECRET=          # Auto-generated
CORS_ORIGINS=        # Comma-separated
DB_DIR=              # Database directory
ADMIN_CODE=          # Admin invite code
```

### Monitoring
- Health check: `GET /api/health`
- Logs: `journalctl -u pyless -f`
- Backup: `scripts/backup.sh` (daily cron)

---

## Security Notes

- JWT secrets auto-generated and stored in DB
- CORS configurable via env var
- Rate limiting on API (30r/s) and AI (5r/s)
- Message length validation (2000 chars)
- OAuth state expiry (15 min)
- bcrypt for passwords
- SQL parameterized queries (no injection)
- WebRTC uses STUN (no TURN server needed for same-network)

---

## Performance

- SQLite WAL mode for concurrent reads
- Static asset caching (30 days)
- Gzip compression
- Pyodide/Pyodide loaded from CDN
- No server-side code execution (all in browser)
