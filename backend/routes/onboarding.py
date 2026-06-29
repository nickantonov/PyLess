# Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import sqlite3
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header

from ..db import get_db
from ..routes.auth import optional_user
from ..routes.profile import get_or_create_guest

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

QUESTIONS = [
    {
        "id": "q1",
        "question": "Чи писав ти раніше код на будь-якій мові?",
        "options": [
            {"value": "none", "label": "Ні, ніколи", "score": 0},
            {"value": "basic", "label": "Так, трохи (HTML/CSS або простий скрипт)", "score": 1},
            {"value": "intermediate", "label": "Так, писав програми (Python, JS тощо)", "score": 2},
            {"value": "advanced", "label": "Так, професійно (проєкти, робота)", "score": 3},
        ],
    },
    {
        "id": "q2",
        "question": "Що таке змінна в програмуванні?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Щось на кшталт контейнера для даних", "score": 1},
            {"value": "c", "label": "Іменований блок пам'яті, що зберігає значення", "score": 2},
            {"value": "d", "label": "Змінна — це об'єкт з типом, ім'ям та значенням у певній області видимості", "score": 3},
        ],
    },
    {
        "id": "q3",
        "question": "Як працює цикл for?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Повторює код багато разів", "score": 1},
            {"value": "c", "label": "Ітерує по елементах колекції/діапазону", "score": 2},
            {"value": "d", "label": "Створює ітератор та виконує тіло для кожного елемента", "score": 3},
        ],
    },
    {
        "id": "q4",
        "question": "Що таке функція?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Блок коду, який можна викликати", "score": 1},
            {"value": "c", "label": "Іменований блок з параметрами, що повертає результат", "score": 2},
            {"value": "d", "label": "Перший клас об'єкт, що інкапсулює поведінку", "score": 3},
        ],
    },
    {
        "id": "q5",
        "question": "Як працює умова if/else?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Перевіряє щось і робить одне з двох", "score": 1},
            {"value": "c", "label": "Виконує блок коду залежно від істинності виразу", "score": 2},
            {"value": "d", "label": "Оцінює булевий вираз і виконує відповідний branch", "score": 3},
        ],
    },
    {
        "id": "q6",
        "question": "Що таке список (list) в Python?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Набір елементів у квадратних дужках", "score": 1},
            {"value": "c", "label": "Мутабельна послідовність з індексацією", "score": 2},
            {"value": "d", "label": "Динамічний массив з O(1) доступом за індексом та O(n) вставкою", "score": 3},
        ],
    },
    {
        "id": "q7",
        "question": "Навіщо потрібні винятки (exceptions)?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Щоб ловити помилки", "score": 1},
            {"value": "c", "label": "Щоб обробляти помилки та не зупиняти програму", "score": 2},
            {"value": "d", "label": "Для управління потоком виконання в умовах помилок", "score": 3},
        ],
    },
    {
        "id": "q8",
        "question": "Як працює словник (dict)?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Пари ключ-значення", "score": 1},
            {"value": "c", "label": "Асоціативний масив з хеш-таблицею", "score": 2},
            {"value": "d", "label": "Hash map з O(1) доступу за ключем", "score": 3},
        ],
    },
    {
        "id": "q9",
        "question": "Що таке ООП?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Програмування з класами", "score": 1},
            {"value": "c", "label": "Парадигма з інкапсуляцією, наслідуванням, поліморфізмом", "score": 2},
            {"value": "d", "label": "Патерн для моделювання реальних сутностей через об'єкти", "score": 3},
        ],
    },
    {
        "id": "q10",
        "question": "Як працює файлова система?",
        "options": [
            {"value": "a", "label": "Не знаю", "score": 0},
            {"value": "b", "label": "Можна читати і писати файли", "score": 1},
            {"value": "c", "label": "Потоки даних з відкриттям/закриттям та буферизацією", "score": 2},
            {"value": "d", "label": "File descriptors, буфери, encoding, context managers", "score": 3},
        ],
    },
    {
        "id": "goal",
        "question": "Чого ти хочеш навчитися?",
        "options": [
            {"value": "python", "label": "Python з нуля до про", "score": 0},
            {"value": "web", "label": "Веб-розробка (HTML/CSS/JS/React)", "score": 0},
            {"value": "desktop", "label": "Десктопні додатки", "score": 0},
            {"value": "all", "label": "Все по черзі", "score": 0},
        ],
    },
]


@router.get("/questions")
def get_questions():
    return QUESTIONS


@router.post("/submit")
def submit_onboarding(answers: dict, authorization: Optional[str] = Header(None), db: sqlite3.Connection = Depends(get_db)):
    user = optional_user(authorization, db) if authorization else None
    if user:
        uid = user["id"]
    else:
        uid = get_or_create_guest(db)

    total_score = 0
    for q in QUESTIONS:
        if q["id"] == "goal":
            continue
        answer = answers.get(q["id"])
        if answer:
            for opt in q["options"]:
                if opt["value"] == answer:
                    total_score += opt["score"]
                    break

    goal = answers.get("goal", "python")

    if total_score <= 4:
        level = "beginner"
        start_module = 1
        start_task = "py-01-01"
        label = "Початківець — починаємо з нуля"
    elif total_score <= 8:
        level = "elementary"
        start_module = 1
        start_task = "py-01-01"
        label = "Елементарний — повторимо основи швидко"
    elif total_score <= 16:
        level = "intermediate"
        start_module = 5
        start_task = "py-05-01"
        label = "Середній — починаємо з функцій"
    elif total_score <= 24:
        level = "advanced"
        start_module = 8
        start_task = "py-08-01"
        label = "Просунутий — перейдемо до ООП"
    else:
        level = "expert"
        start_module = 10
        start_task = "py-10-01"
        label = "Експерт — тобі потрібні проєкти, не завдання"

    db.execute(
        "INSERT INTO onboarding (user_id, answers, total_score, level, start_module, start_task) "
        "VALUES (?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(user_id) DO UPDATE SET answers=?, total_score=?, level=?, start_module=?, start_task=?",
        (uid, str(answers), total_score, level, start_module, start_task,
         str(answers), total_score, level, start_module, start_task),
    )
    db.commit()

    return {
        "level": level,
        "label": label,
        "total_score": total_score,
        "start_module": start_module,
        "start_task": start_task,
        "goal": goal,
    }
