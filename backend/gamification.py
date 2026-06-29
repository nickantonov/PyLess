import sqlite3
import random
from datetime import date, timedelta

LEVELS = [
    (0, "Стажист", "🟢"),
    (500, "Новачок", "🟢"),
    (1500, "Учень", "🔵"),
    (3500, "Програміст", "🔵"),
    (7000, "Розробник", "🟣"),
    (12000, "Майстер", "🟣"),
    (20000, "Експерт", "🔴"),
    (35000, "Архітектор", "🔴"),
    (60000, "Ґуру", "⭐"),
    (100000, "Легенда", "👑"),
]

BADGES = {
    "first_step": {"name": "🐣 Перший крок", "desc": "Виконай перше завдання", "rarity": "common"},
    "week_streak": {"name": "🔥 Тиждень", "desc": "7 днів streak", "rarity": "common"},
    "no_mistakes_10": {"name": "💯 Без помилок", "desc": "10 завдань з першої спроби", "rarity": "uncommon"},
    "speed_demon": {"name": "⚡ Швидкий стрілець", "desc": "Завдання за < 30 секунд", "rarity": "rare"},
    "python_master": {"name": "🐍 Знавець Python", "desc": "Заверши Python Fundamentals", "rarity": "rare"},
    "web_master": {"name": "🌐 Веб-майстер", "desc": "Заверши Web Development", "rarity": "rare"},
    "hundred_days": {"name": "💎 Стоденник", "desc": "100 днів streak", "rarity": "epic"},
    "legend": {"name": "👑 Легенда", "desc": "Level 10", "rarity": "legendary"},
    "debug_master": {"name": "🧩 Debug Master", "desc": "50 складних завдань", "rarity": "rare"},
    "ai_user": {"name": "🤖 Людина з AI", "desc": "100 запитань AI", "rarity": "uncommon"},
    "module_perfect": {"name": "🎯 Перфекціоніст", "desc": "Всі завдання модуля з першої", "rarity": "epic"},
    "night_owl": {"name": "🌙 Нічна сова", "desc": "5 завдань між 0:00-5:00", "rarity": "uncommon"},
    "early_bird": {"name": "🌅 Рання пташка", "desc": "5 завдань між 5:00-7:00", "rarity": "uncommon"},
    "hard_conqueror": {"name": "🏔️ Підкорювач", "desc": "Всі hard-завдання модуля", "rarity": "epic"},
    "thirty_streak": {"name": "🔥🔥🔥 Місячник", "desc": "30 днів streak", "rarity": "epic"},
    "speed_bronze": {"name": "🥉 Бронзовий", "desc": "Розв'язок за < 5 хвилин", "rarity": "common"},
    "speed_silver": {"name": "🥈 Срібний", "desc": "Розв'язок за < 3 хвилини", "rarity": "uncommon"},
    "speed_gold": {"name": "🥇 Золотий", "desc": "Розв'язок за < 1 хвилину", "rarity": "rare"},
    "speed_diamond": {"name": "💎 Алмазний", "desc": "Розв'язок за < 30 секунд", "rarity": "epic"},
    "marathon": {"name": "🏃 Марафонець", "desc": "10 завдань за один день", "rarity": "uncommon"},
    "all_modules": {"name": "🎓 Випускник", "desc": "Заверши хоча б одне завдання в кожному модулі", "rarity": "rare"},
}


def get_user_xp(db: sqlite3.Connection, user_id: int) -> int:
    row = db.execute("SELECT COALESCE(SUM(amount), 0) as total FROM xp_log WHERE user_id = ?", (user_id,)).fetchone()
    return row["total"]


def get_level(xp: int) -> dict:
    level = 0
    for i, (threshold, name, icon) in enumerate(LEVELS):
        if xp >= threshold:
            level = i + 1
            rank_name = name
            rank_icon = icon
    current_threshold = LEVELS[level - 1][0]
    next_threshold = LEVELS[level][0] if level < len(LEVELS) else LEVELS[-1][0]
    return {
        "level": level,
        "name": rank_name,
        "icon": rank_icon,
        "xp": xp,
        "xp_in_level": xp - current_threshold,
        "xp_for_next": next_threshold - current_threshold,
        "next_level_xp": next_threshold,
    }


def add_xp(db: sqlite3.Connection, user_id: int, amount: int, reason: str) -> dict:
    streak_mult = get_streak_multiplier(db, user_id)
    final_amount = int(amount * streak_mult)
    db.execute("INSERT INTO xp_log (user_id, amount, reason) VALUES (?, ?, ?)", (user_id, final_amount, reason))
    db.commit()
    total_xp = get_user_xp(db, user_id)
    return {"added": final_amount, "total": total_xp, "multiplier": streak_mult, "reason": reason}


def get_streak_multiplier(db: sqlite3.Connection, user_id: int) -> float:
    row = db.execute("SELECT current_streak FROM streaks WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        return 1.0
    streak = row["current_streak"]
    if streak >= 30:
        return 3.0
    if streak >= 14:
        return 2.0
    if streak >= 7:
        return 1.5
    return 1.0


def update_streak(db: sqlite3.Connection, user_id: int) -> dict:
    today = date.today().isoformat()
    row = db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,)).fetchone()

    if not row:
        db.execute("INSERT INTO streaks (user_id, current_streak, best_streak, last_active_date) VALUES (?, 1, 1, ?)", (user_id, today))
        db.commit()
        return {"streak": 1, "best": 1, "message": "Початок streak!"}

    last = row["last_active_date"]
    if last == today:
        return {"streak": row["current_streak"], "best": row["best_streak"], "message": "Вже активний сьогодні"}

    last_date = date.fromisoformat(last) if last else None
    today_date = date.fromisoformat(today)
    diff = (today_date - last_date).days if last_date else 999

    if diff == 1:
        new_streak = row["current_streak"] + 1
        grace_used = 0
    elif diff == 2 and row["grace_used"] == 0:
        new_streak = row["current_streak"]
        grace_used = 1
    else:
        new_streak = 1
        grace_used = 0

    best = max(row["best_streak"], new_streak)
    db.execute(
        "UPDATE streaks SET current_streak = ?, best_streak = ?, last_active_date = ?, grace_used = ? WHERE user_id = ?",
        (new_streak, best, today, grace_used, user_id),
    )
    db.commit()

    msg = ""
    if new_streak == 7:
        msg = "🔥 Тиждень! ×1.5 множник XP!"
    elif new_streak == 14:
        msg = "🔥🔥 14 днів! ×2 множник XP!"
    elif new_streak == 30:
        msg = "🔥🔥🔥 Місяць! ×3 множник XP!"
    elif grace_used:
        msg = "🛡️ Grace day використано. Завтра обов'язково!"
    elif diff > 2:
        msg = "😢 Streak втрачено. Починаємо заново!"

    return {"streak": new_streak, "best": best, "message": msg}


def update_combo(db: sqlite3.Connection, user_id: int, passed: bool) -> dict:
    row = db.execute("SELECT * FROM combo WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        db.execute("INSERT INTO combo (user_id, current_combo, best_combo) VALUES (?, 0, 0)", (user_id,))
        row = db.execute("SELECT * FROM combo WHERE user_id = ?", (user_id,)).fetchone()

    if passed:
        new_combo = row["current_combo"] + 1
    else:
        new_combo = 0

    best = max(row["best_combo"], new_combo)
    db.execute("UPDATE combo SET current_combo = ?, best_combo = ? WHERE user_id = ?", (new_combo, best, user_id))
    db.commit()

    mult = 1.0
    if new_combo >= 4:
        mult = 3.0
    elif new_combo >= 3:
        mult = 2.0
    elif new_combo >= 2:
        mult = 1.5

    return {"combo": new_combo, "best": best, "multiplier": mult}


def check_badges(db: sqlite3.Connection, user_id: int, elapsed_seconds: float = 0) -> list:
    earned = []
    existing = {r["badge_id"] for r in db.execute("SELECT badge_id FROM badges WHERE user_id = ?", (user_id,)).fetchall()}

    total_xp = get_user_xp(db, user_id)
    level = get_level(total_xp)["level"]
    streak_row = db.execute("SELECT current_streak FROM streaks WHERE user_id = ?", (user_id,)).fetchone()
    streak = streak_row["current_streak"] if streak_row else 0
    total_completed = db.execute("SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND status = 'completed'", (user_id,)).fetchone()["c"]
    first_try_count = db.execute("SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND status = 'completed' AND first_try = 1", (user_id,)).fetchone()["c"]

    today_tasks = db.execute(
        "SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND status = 'completed' AND completed_at >= date('now')",
        (user_id,)
    ).fetchone()["c"]

    modules_done = db.execute(
        "SELECT COUNT(DISTINCT module) as c FROM progress p JOIN tasks t ON p.task_id = t.id WHERE p.user_id = ? AND p.status = 'completed'",
        (user_id,)
    ).fetchone()["c"]

    checks = {
        "first_step": total_completed >= 1,
        "week_streak": streak >= 7,
        "no_mistakes_10": first_try_count >= 10,
        "thirty_streak": streak >= 30,
        "hundred_days": streak >= 100,
        "legend": level >= 10,
        "debug_master": total_completed >= 50,
        "marathon": today_tasks >= 10,
        "all_modules": modules_done >= 10,
    }

    if elapsed_seconds > 0:
        checks["speed_bronze"] = elapsed_seconds < 300
        checks["speed_silver"] = elapsed_seconds < 180
        checks["speed_gold"] = elapsed_seconds < 60
        checks["speed_diamond"] = elapsed_seconds < 30

    for badge_id, condition in checks.items():
        if condition and badge_id not in existing:
            db.execute("INSERT INTO badges (user_id, badge_id) VALUES (?, ?)", (user_id, badge_id))
            earned.append(BADGES[badge_id])

    db.commit()
    return earned


def get_daily_challenge(db: sqlite3.Connection) -> dict:
    today = date.today().isoformat()
    row = db.execute("SELECT * FROM daily_challenges WHERE date = ?", (today,)).fetchone()
    if row:
        return {"task_id": row["task_id"], "bonus_xp": row["bonus_xp"], "date": today}

    random.seed(today)
    task_id = random.choice(["py-01-01", "py-02-01", "py-03-01", "py-04-01", "py-05-01",
                              "py-01-03", "py-02-03", "py-03-02", "py-04-02", "py-06-01",
                              "py-06-03", "py-07-01", "py-10-01"])
    db.execute("INSERT INTO daily_challenges (date, task_id, bonus_xp) VALUES (?, ?, 150)", (today, task_id))
    db.commit()
    return {"task_id": task_id, "bonus_xp": 150, "date": today}


def get_leaderboard(db: sqlite3.Connection, limit: int = 10) -> list:
    rows = db.execute("""
        SELECT u.id, u.username, u.display_name,
               COALESCE(SUM(x.amount), 0) as total_xp,
               COALESCE(s.current_streak, 0) as streak
        FROM users u
        LEFT JOIN xp_log x ON u.id = x.user_id
        LEFT JOIN streaks s ON u.id = s.user_id
        GROUP BY u.id
        ORDER BY total_xp DESC
        LIMIT ?
    """, (limit,)).fetchall()
    result = []
    for i, row in enumerate(rows):
        result.append({
            "rank": i + 1,
            "username": row["username"],
            "display_name": row["display_name"],
            "total_xp": row["total_xp"],
            "streak": row["streak"],
            "level": get_level(row["total_xp"]),
        })
    return result


def get_user_profile(db: sqlite3.Connection, user_id: int) -> dict:
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    xp = get_user_xp(db, user_id)
    level = get_level(xp)
    streak_row = db.execute("SELECT * FROM streaks WHERE user_id = ?", (user_id,)).fetchone()
    combo_row = db.execute("SELECT * FROM combo WHERE user_id = ?", (user_id,)).fetchone()
    badge_rows = db.execute("SELECT badge_id, earned_at FROM badges WHERE user_id = ?", (user_id,)).fetchall()
    total_completed = db.execute("SELECT COUNT(*) as c FROM progress WHERE user_id = ? AND status = 'completed'", (user_id,)).fetchone()["c"]
    total_tasks = db.execute("SELECT COUNT(DISTINCT task_id) FROM progress").fetchone()[0]

    badges = []
    for b in badge_rows:
        if b["badge_id"] in BADGES:
            info = BADGES[b["badge_id"]]
            badges.append({"id": b["badge_id"], "name": info["name"], "desc": info["desc"], "rarity": info["rarity"], "earned_at": b["earned_at"]})

    return {
        "username": user["username"],
        "display_name": user["display_name"],
        "level": level,
        "streak": {
            "current": streak_row["current_streak"] if streak_row else 0,
            "best": streak_row["best_streak"] if streak_row else 0,
        },
        "combo": {
            "current": combo_row["current_combo"] if combo_row else 0,
            "best": combo_row["best_combo"] if combo_row else 0,
        },
        "badges": badges,
        "total_completed": total_completed,
        "total_tasks": total_tasks,
        "xp_history": get_xp_history(db, user_id),
    }


def get_xp_history(db: sqlite3.Connection, user_id: int, days: int = 7) -> list:
    rows = db.execute("""
        SELECT DATE(created_at) as day, SUM(amount) as total
        FROM xp_log WHERE user_id = ? AND created_at >= date('now', ?)
        GROUP BY DATE(created_at) ORDER BY day
    """, (user_id, f"-{days} days")).fetchall()
    return [{"day": r["day"], "xp": r["total"]} for r in rows]
