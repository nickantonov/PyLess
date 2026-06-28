# PyLess — План розвитку

## Автор: Nick Antonov (nick.antonov1@gmail.com)
## Borodachamba Studio © 1998-2026

---

## Поточний статус: MVP v1.0
- Backend: FastAPI + SQLite + Groq AI
- Frontend: React + TypeScript + Vite + Monaco + Pyodide
- Комміт: ac7613c, тег: v1.0-mvp

---

## Фаза 2: Кросплатформність ✅
- Linux PyInstaller build (28MB standalone binary)
- `run_desktop.py` entry point

## Фаза 3: PHP/MySQL версія ✅
- Location: `/home/fox/DEPLOY/PyLess-php/`
- PHP 8.1+ / MySQL 5.7+
- All API endpoints matching Python version
- Schema: 12 tables with InnoDB + utf8mb4
- React SPA frontend (static build)

### Мета
Самодостатні виконувані файли для Windows, macOS, Linux — без потреби встановлювати Python/Node.

### Варіанти
1. **PyInstaller** —打包 Python backend + frontend в один .exe/.app
   - Переваги: простий, працює з існуючим кодом
   - Недоліки: великі файли (100+ MB), повільний старт
   - Підходящий для desktop-версії

2. **Electron + Pyodide** — фронтенд в Electron, Python в браузері (Pyodide)
   - Переваги: повна кросплатформність, UI виглядає однаково
   - Недоліки: великий розмір (200+ MB), надлишковий Chromium

3. **Tauri** — Rust backend + WebView, Python через Pyodide
   - Переваги: малий розмір (10-20 MB), швидкий
   - Недоліки: потребує Rust, складніша збірка

4. **Docker** — контейнерізований backend + Nginx
   - Переваги: просте розгортання на будь-якому сервері
   - Недоліки: потребує Docker

### Рекомендація
- **Desktop**: PyInstaller (найпростіше, працює з існуючим FastAPI)
- **Server**: Docker контейнер з Nginx + backend
- **Web**: поточна версія (FastAPI serving static files)

---

## Фаза 3: PHP/MySQL версія

### Мета
Версія для простого хостингу — будь-який PHP+MySQL хостинг (000webhost, InfinityFree, XAMPP, etc.)

### Архітектура
```
/ (web root)
├── index.php              — фронтенд (SPA)
├── api/
│   ├── auth.php           — register/login/Google OAuth
│   ├── tasks.php          — CRUD задач
│   ├── profile.php        — профіль + гейміфікація
│   ├── admin.php          — admin/mentor панель
│   ├── messages.php       — месенджер
│   └── ai.php             — Groq AI (curl до API)
├── config/
│   └── db.php             — MySQL connection
├── includes/
│   ├── functions.php      — утиліти (JWT, bcrypt, etc.)
│   └── middleware.php     — auth middleware
├── assets/
│   ├── css/               — стилі
│   ├── js/                — JavaScript
│   └── img/               — зображення
├── schema.sql             — MySQL schema (migrated з SQLite)
└── .htaccess              — URL rewriting
```

### Завдання міграції

#### 1. База даних (SQLite → MySQL)
- [ ] Переписати schema.sql (MySQL синтаксис)
- [ ] Замінити `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT AUTO_INCREMENT PRIMARY KEY`
- [ ] Замінити `TEXT DEFAULT ''` → `VARCHAR(255) DEFAULT ''`
- [ ] Замінити `BOOLEAN` → `TINYINT(1) DEFAULT 0`
- [ ] Додати `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
- [ ] Замінити WAL mode → InnoDB
- [ ] Замінити `PRAGMA` → MySQL settings

#### 2. Backend (Python → PHP)
- [ ] FastAPI routes → PHP endpoints
- [ ] Pydantic models → PHP validation
- [ ] SQLite queries → MySQLi/PDO
- [ ] python-jose JWT → Firebase JWT (PHP)
- [ ] passlib bcrypt → PHP password_hash/password_verify
- [ ] httpx (Groq) → curl
- [ ] CORS middleware → .htaccess headers

#### 3. Фронтенд (мінімальні зміни)
- [ ] React SPA залишається (build → static files)
- [ ] API base URL → `/api/`
- [ ] Token storage → localStorage (без змін)
- [ ] Google OAuth redirect → `/api/auth/google/callback`
- [ ] Pyodide CDN → залишається (без змін)
- [ ] Monaco CDN → залишається (без змін)

#### 4. Інтеграція
- [ ] Google OAuth → PHP callback
- [ ] Groq AI → curl до API
- [ ] File uploads (avatar) → move_uploaded_file
- [ ] Session management → JWT в localStorage

### Мінімальні вимоги до хостингу
- PHP 8.1+
- MySQL 5.7+ / MariaDB 10.3+
- mod_rewrite (Apache) або equivalent
- curl extension
- 100MB+ storage

### Порівняння
| Фіча | Python/FastAPI | PHP/MySQL |
|-------|---------------|-----------|
| Швидкість | Висока | Середня |
| Пам'ять | ~50MB | ~20MB |
| Хостинг | VPS/Docker | Shared hosting |
| Ціна | $5-10/міс | $0-5/міс |
| Масштабування | Горизонтальне | Вертикальне |
| Розгортання | Docker/venv | FTP upload |

---

## Фаза 4: Додаткові модулі

### Web Development
- HTML/CSS/JavaScript модулі
- React basics
- API design

### Desktop/CLI
- Python GUI (tkinter/PyQt)
- CLI tools
- Automation scripts

---

## Timeline
1. **Фаза 2** (2-4 тижні): PyInstaller desktop build
2. **Фаза 3** (4-8 тижнів): PHP/MySQL версія
3. **Фаза 4** (відкрито): Додаткові модулі
