# PyLess — План розвитку

## Автор: Nick Antonov (nick.antonov1@gmail.com)
## Borodachamba Studio © 1998-2026

---

## Поточний статус: v1.5 — freeCodeCamp Redesign
- Backend: FastAPI + SQLite + Groq AI + Settings API + lifespan + rate limiting
- Frontend: React + TypeScript + Vite + Monaco + Pyodide + CodeSandbox
- 63 задачі: 47 Python + 4 HTML + 4 CSS + 4 JavaScript + 4 React + GUI + CLI
- Multi-runtime: Python→Pyodide, HTML/CSS/JS/React→iframe sandbox
- Split-view: задача зліва, редактор справа (freeCodeCamp style)

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
- CORS: configurable via CORS_ORIGINS env var
- JWT: auto-generated secret, stored in settings DB
- lifespan context manager (deprecated @app.on_event removed)
- Message validation (max 2000 chars)
- AI rate limiting (10 req/min per IP)
- OAuth state: 15min expiry + cleanup
- Health check: DB size, user count, uptime, tasks completed
- Content: 63 задачі, demo/review на більшості Python задач

## Фаза 6: freeCodeCamp Redesign ✅
- Split-view layout: задача зліва (40%), редактор справа (60%)
- Left pane: instructions, hints (progressive reveal), output/test results
- Right pane: Monaco editor + CodeSandbox (for non-Python tasks)
- Persistent action bar: Run + Tests buttons
- Test results inline in left pane
- Hints with progressive reveal (show one at a time)

---

## Фаза 7: Контент + Gamification (планована)
- [ ] Більше задач в кожному модулі (ціль: 10+ на модуль)
- [ ] Щоденні челенджі з таймером
- [ ] Ачівки за швидкість розв'язання
- [ ] Публічний профіль з бейджами
- [ ] Лідерборд з фільтрами (за модулем, за період)

## Фаза 8: DevOps + Production (планована)
- [ ] GitHub Actions CI/CD
- [ ] Automated tests (backend + frontend)
- [ ] Docker Compose production (Nginx + SSL)
- [ ] Backup strategy для SQLite
- [ ] Моніторинг (uptime, помилки)

---

## Timeline
1. **Фаза 2** ✅: PyInstaller + Docker
2. **Фаза 3** ✅: PHP/MySQL версія
3. **Фаза 4** ✅: Multi-runtime модулі
4. **Фаза 5** ✅: Безпека + Product-Quality
5. **Фаза 6** ✅: freeCodeCamp Redesign
6. **Фаза 7** 🔵: Контент + Gamification
7. **Фаза 8** 🔵: DevOps + Production
