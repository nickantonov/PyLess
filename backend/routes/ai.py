import os
import httpx
from fastapi import APIRouter

from ..models import AIRequest

router = APIRouter(prefix="/api/ai", tags=["ai"])

GROQ_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

TUTOR_SYSTEM = """Ти — Python-викладач в системі навчання PyLess.

Правила:
1. НІКОЛИ не давай готову відповідь. Направляй натяками.
2. Пояснюй коротко (3-5 речень).
3. Якщо є помилки в тестах — аналізуй чому.
4. Мовою спілкування користувача (українська або російська).
5. Якщо код правильний — запропонуй покращення.
6. Форматуй код в markdown."""


@router.post("/chat")
async def ai_chat(req: AIRequest):
    if not GROQ_KEY:
        return {"reply": "⚠️ AI не налаштований. Додайте GROQ_API_KEY."}

    messages = [{"role": "system", "content": TUTOR_SYSTEM}]
    user_msg = req.message
    if req.code:
        user_msg += f"\n\nМій код:\n```python\n{req.code}\n```"
    if req.task_id:
        user_msg += f"\n\nЗавдання: {req.task_id}"
    messages.append({"role": "user", "content": user_msg})

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
                json={"model": "llama-3.3-70b-versatile", "messages": messages, "max_tokens": 500, "temperature": 0.7})
            if resp.status_code == 429:
                return {"reply": "🤖 AI тимчасово недоступний (ліміт). Спробуй через хвилину."}
            if resp.status_code != 200:
                return {"reply": f"⚠️ Помилка API: {resp.status_code} — {resp.text[:200]}"}
            data = resp.json()
            return {"reply": data["choices"][0]["message"]["content"]}
    except Exception as e:
        return {"reply": f"⚠️ Помилка: {str(e)[:100]}"}


@router.post("/hint")
async def ai_hint(task_id: str):
    if not GROQ_KEY:
        return {"reply": "⚠️ AI не налаштований."}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_KEY}"},
                json={"model": "llama-3.3-70b-versatile", "messages": [
                    {"role": "system", "content": "Давай короткі підказки для Python-завдань. Не розкривай рішення."},
                    {"role": "user", "content": f"Дай підказку для: {task_id}"}
                ], "max_tokens": 100})
            data = resp.json()
            return {"reply": data["choices"][0]["message"]["content"]}
    except Exception:
        return {"reply": "⚠️ Помилка AI."}
