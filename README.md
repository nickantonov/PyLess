# 🐍 PyLess — Interactive Python Learning Platform

> Free, open-source alternative to paid coding platforms like Codecademy, freeCodeCamp, and Code.org

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-yellow.svg)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green.svg)](https://fastapi.tiangolo.com)

---

## 📸 Screenshots

| Editor | Admin Panel | Video Chat |
|--------|-------------|------------|
| ![Editor](https://via.placeholder.com/400x250/1a1a2e/8b5cf6?text=Editor+%E2%9C%85) | ![Admin](https://via.placeholder.com/400x250/1a1a2e/ec4899?text=Admin+%E2%9C%85) | ![Video](https://via.placeholder.com/400x250/1a1a2e/06b6d4?text=Video+Chat+%E2%9C%85) |

---

## ✨ Features

### For Students
- 🎯 **109+ exercises** across 23 modules (Python, HTML, CSS, JavaScript, React, SQL, API, ORM)
- 🐍 **In-browser Python execution** via Pyodide (no server needed)
- 🌐 **Multi-language code editor** with Monaco (20 themes)
- 🏆 **Gamification**: XP, levels, streaks, combo multipliers, 20+ badges
- 📱 **FreeCodeCamp-style split view**: task left, editor right
- 💡 **Progressive hints**: reveal one at a time
- 🔥 **Daily challenges** with countdown timer
- 🤖 **AI tutor** powered by Groq (llama-3.3-70b-versatile)

### For Teachers
- 👥 **Student groups**: create groups, add students by email
- 📝 **Custom task creator**: create and assign tasks to groups or individuals
- 🎥 **Video lessons**: WebRTC P2P video chat with screen sharing
- 📎 **Material upload**: share presentations, photos, videos
- 📊 **Student management**: track progress, notes, stats

### For Admins
- ⚙️ **Admin panel**: overview, students, invites, tasks, settings
- 🔐 **Google OAuth**: configure in admin panel (no env vars needed)
- 🔗 **Invite system**: generate codes for student enrollment
- 🌐 **Configurable**: site name, description, AI key — all in admin UI
- 📊 **Analytics**: user count, tasks completed, uptime

---

## 🚀 Quick Start

### Option 1: One-line install (Linux server)

```bash
curl -fsSL https://raw.githubusercontent.com/borodachamba/PyLess/main/install.sh | sudo bash
```

### Option 2: Manual setup

```bash
# Clone
git clone https://github.com/borodachamba/PyLess.git
cd PyLess

# Backend
pip install -r requirements.txt
export GROQ_API_KEY="your-key"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Option 3: Docker

```bash
docker compose up --build
```

📖 **Full installation guide**: [docs/INSTALL.md](docs/INSTALL.md)

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/USERS.md](docs/USERS.md) | Student guide: how to use PyLess |
| [docs/TEACHERS.md](docs/TEACHERS.md) | Teacher guide: groups, tasks, video lessons |
| [docs/ENGINEERING.md](docs/ENGINEERING.md) | Technical docs: architecture, stack, code guide |
| [docs/API.md](docs/API.md) | API reference |

---

## 🏗️ Tech Stack

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  React 18 + TypeScript + Vite + TailwindCSS         │
│  Monaco Editor (CDN) + Pyodide (CDN)                │
│  Zustand (state) + WebRTC (video)                   │
└─────────────────────┬───────────────────────────────┘
                      │ REST API + WebSocket
┌─────────────────────┴───────────────────────────────┐
│                     Backend                          │
│  FastAPI + SQLite + Pydantic                        │
│  Groq AI (llama-3.3-70b) + JWT Auth                │
│  WebRTC signaling + File upload                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│                   Infrastructure                     │
│  Nginx (reverse proxy) + Let's Encrypt / Cloudflare │
│  Systemd + Docker + GitHub Actions CI/CD            │
└─────────────────────────────────────────────────────┘
```

### Backend
- **FastAPI** — async Python web framework
- **SQLite** — lightweight database (no server needed)
- **Pydantic** — data validation
- **JWT** — authentication (auto-generated secrets)
- **bcrypt** — password hashing
- **Groq API** — AI tutor (llama-3.3-70b-versatile)

### Frontend
- **React 18** — UI framework
- **TypeScript** — type safety
- **Vite** — fast build tool
- **TailwindCSS** — utility-first CSS
- **Zustand** — lightweight state management
- **Monaco Editor** — VS Code editor (CDN)
- **Pyodide** — Python in browser (CDN)
- **WebRTC** — peer-to-peer video chat

---

## 📁 Project Structure

```
PyLess/
├── backend/
│   ├── main.py              # FastAPI app, routers, static serving
│   ├── db.py                # SQLite schema, migrations
│   ├── models.py            # Pydantic models
│   ├── gamification.py      # XP, levels, badges, streak
│   ├── video_hub.py         # WebRTC signaling server
│   ├── routes/
│   │   ├── auth.py          # Register, login, Google OAuth
│   │   ├── tasks.py         # Task CRUD, completion, XP
│   │   ├── profile.py       # User profile, leaderboard
│   │   ├── admin.py         # Admin/mentor panel
│   │   ├── messages.py      # Chat system
│   │   ├── ai.py            # Groq AI tutor
│   │   ├── settings.py      # Key-value settings
│   │   ├── groups.py        # Student groups
│   │   ├── custom_tasks.py  # Teacher-created tasks
│   │   ├── video.py         # Video rooms, materials
│   │   └── onboarding.py    # Level assessment quiz
│   ├── tasks/               # 109+ exercise JSON files
│   │   ├── python/          # Python modules (00-23)
│   │   └── ...
│   └── tests/               # 19 API tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Root component, routing
│   │   ├── store.ts         # Zustand state management
│   │   ├── types.ts         # TypeScript types
│   │   └── components/      # 18 React components
│   ├── index.html
│   └── package.json
├── docs/                    # Documentation
├── scripts/                 # Backup scripts
├── install.sh               # One-line installer
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production (Nginx + SSL)
├── Dockerfile
├── nginx.conf
├── requirements.txt
└── LICENSE                  # GPL-3.0
```

---

## 🎓 Learning Modules (23 modules, 109+ exercises)

| # | Module | Exercises | Topics |
|---|--------|-----------|--------|
| 1 | Змінні | 5 | Variables, types, input/output |
| 2 | Оператори | 4 | Arithmetic, comparison, logic |
| 3 | Умови | 6 | if/elif/else, ternary, nested |
| 4 | Цикли | 4 | for, while, break/continue |
| 5 | Функції | 6 | Parameters, return, *args, lambda |
| 6 | Списки | 6 | Arrays, slicing, comprehension |
| 7 | Словники | 5 | Key-value, methods, nested |
| 8 | Файли | 4 | Read/write, context managers |
| 9 | Винятки | 3 | try/except, custom exceptions |
| 10 | ООП | 4 | Classes, inheritance, decorators |
| 11 | HTML | 4 | Tags, forms, semantic |
| 12 | CSS | 4 | Selectors, Flexbox, Grid |
| 13 | JavaScript | 4 | Variables, functions, arrays |
| 14 | React | 4 | Components, state, lists |
| 15 | GUI | 4 | tkinter basics |
| 16 | CLI | 4 | sys.argv, argparse |
| 17 | Файли (прос.) | 4 | JSON, CSV, pathlib |
| 18 | OOP (прос.) | 4 | property, classmethod, context manager |
| 19 | БД: Основи | 4 | CREATE, INSERT, SELECT |
| 20 | БД: Запити | 4 | WHERE, JOIN, GROUP BY |
| 21 | БД: Просунуте | 4 | Transactions, subqueries, indexes |
| 22 | API | 5 | requests, REST, async |
| 23 | ORM | 5 | SQLAlchemy models, CRUD, relationships |

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | No | AI tutor key (configure in admin panel) |
| `JWT_SECRET` | No | Auto-generated if not set |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `DB_DIR` | No | Database directory (default: backend/) |

### Admin Panel Settings

After first login, configure in admin panel (⚙️):
- Groq AI API key
- Google OAuth credentials
- Site name and description

---

## 🧪 Testing

```bash
# Backend tests (19 tests)
python3 -m pytest backend/tests/ -v

# Frontend build
cd frontend && npm run build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com)
Borodachamba Studio. All rights reserved.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```

---

## 👤 Author

**Nick Antonov** — [nick.antonov1@gmail.com](mailto:nick.antonov1@gmail.com)

**Borodachamba Studio** — © 1998-2026

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) — modern Python web framework
- [Pyodide](https://pyodide.org/) — Python in the browser
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code editor
- [Groq](https://groq.com/) — fast AI inference
- [freeCodeCamp](https://www.freecodecamp.org/) — inspiration for the learning model
