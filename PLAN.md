# PyLess — План розвитку

## Автор: Nick Antonov (nick.antonov1@gmail.com)
## Borodachamba Studio © 1998-2026

---

## Поточний статус: v1.8 — Production Ready
- Backend: FastAPI + SQLite + Groq AI + Settings API + lifespan + rate limiting
- Frontend: React + TypeScript + Vite + Monaco + Pyodide + CodeSandbox
- 77 задач: 47 Python + 4 HTML + 4 CSS + 4 JavaScript + 4 React + GUI + CLI
- Multi-runtime: Python→Pyodide, HTML/CSS/JS/React→iframe sandbox
- Split-view: задача зліва, редактор справа (freeCodeCamp style)
- Tests: 19 backend API tests (pytest)
- CI/CD: GitHub Actions
- Production: Docker Compose + Nginx (SSL, rate limiting)
- Backup: SQLite daily backup script

---

## Фаза 2: Кросплатформність ✅
- Linux PyInstaller build (28MB standalone binary)
- Docker container

## Фаза 3: PHP/MySQL версія ✅
- Location: `/home/fox/DEPLOY/PyLess-php/`
- PHP 8.1+ / MySQL 5.7+

## Фаза 4: Додаткові модулі ✅
- Multi-runtime архітектура (Pyodide + iframe CodeSandbox)
- HTML, CSS, JavaScript, React модулі
- GUI (tkinter), CLI модулі
- Invite code flow, Settings API, Admin dashboard

## Фаза 5: Безпека + Product-Quality ✅
- CORS configurable via CORS_ORIGINS env var
- JWT auto-generated secret, stored in settings DB
- lifespan context manager
- Message validation (max 2000 chars)
- AI rate limiting (10 req/min per IP)
- OAuth state: 15min expiry + cleanup
- Health check: DB size, user count, uptime, tasks completed

## Фаза 6: freeCodeCamp Redesign ✅
- Split-view layout: задача зліва (40%), редактор справа (60%)
- Left pane: instructions, progressive hints, output/test results
- Right pane: Monaco editor + CodeSandbox
- Progressive hint reveal

## Фаза 7: Контент + Gamification ✅
- 77 задач (+14 new: Conditions, Functions, Lists, Dicts, Files)
- Speed badges: bronze (<5min), silver (<3min), gold (<1min), diamond (<30s)
- Marathon badge: 10 tasks/day
- All-modules badge: completed at least one in each module
- Frontend tracks task start time

## Фаза 8: DevOps + Production ✅
- 19 backend API tests (pytest)
- GitHub Actions CI/CD (test → build Docker)
- Production Docker Compose + Nginx (SSL, rate limiting, gzip, security headers)
- SQLite backup script (daily, keeps 7 days)

---

## Git History
- `c468b85` — MVP v1.0
- `ac7613c` — Copyrights
- `74c7c65` — Roadmap
- `e5eb367` — Phase 2: PyInstaller
- `16c64c6` — Phase 2+3: Docker + PHP/MySQL
- `939ebd2` — Phase 4-6: Multi-runtime, Security, Redesign
- `0857df5` — Phase 7: Content + Gamification
- `70e79ad` — Phase 8: DevOps + Production
