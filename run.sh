#!/bin/bash
cd "$(dirname "$0")"

echo "🐍 PyLess — запуск..."
echo ""

# Backend
echo "📡 Запуск backend на http://localhost:8000"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 2
echo ""
echo "✅ Готово!"
echo "   Відкрий: http://localhost:8000"
echo ""
echo "   Щоб зупинити: Ctrl+C"
echo ""

wait $BACKEND_PID
