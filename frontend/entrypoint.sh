#!/bin/sh

echo ""
echo "========================================================================"
echo "🎨 HappyTransport Dashboard started!"
echo "========================================================================"
echo "📊 Dashboard:     http://localhost:5173"
echo "📡 Backend API:   http://localhost:8000"
echo "📡 API Docs:      http://localhost:8000/docs"
echo "========================================================================"
echo ""

exec serve -s dist -l 5173
