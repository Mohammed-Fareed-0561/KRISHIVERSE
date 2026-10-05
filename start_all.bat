@echo off
cls
echo ============================================================
echo    KrishiVerse Agricultural Advisory System - Startup
echo ============================================================
echo.
echo This will start all required services:
echo   [1] RAG Service (Python/FastAPI)  - Port 8000
echo   [2] Backend API (Node.js/Express) - Port 3001
echo   [3] Frontend UI (React/Vite)      - Port 5173
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

REM Check if RAG virtual environment exists
if not exist "backend\rag_service\venv\Scripts\activate.bat" (
    echo ❌ ERROR: RAG Service not set up yet!
    echo.
    echo Please run setup first:
    echo   cd backend\rag_service
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo [1/3] Starting RAG Service on port 8000...
echo ┌──────────────────────────────────────────┐
echo │  Window: "RAG Service"                   │
echo │  Status: Initializing vector store...   │
echo └──────────────────────────────────────────┘
start "RAG Service - Port 8000" cmd /k "cd backend\rag_service && venv\Scripts\activate && python app.py"
echo    ✓ RAG Service window opened
timeout /t 8 /nobreak >nul
echo.

echo [2/3] Starting Backend API on port 3001...
echo ┌──────────────────────────────────────────┐
echo │  Window: "Backend API"                   │
echo │  Status: Connecting to database...      │
echo └──────────────────────────────────────────┘
start "Backend API - Port 3001" cmd /k "cd backend && npm start"
echo    ✓ Backend API window opened
timeout /t 5 /nobreak >nul
echo.

echo [3/3] Starting Frontend UI on port 5173...
echo ┌──────────────────────────────────────────┐
echo │  Window: "Frontend UI"                   │
echo │  Status: Building React app...          │
echo └──────────────────────────────────────────┘
start "Frontend UI - Port 5173" cmd /k "cd krishiverse && npm run dev"
echo    ✓ Frontend UI window opened
timeout /t 3 /nobreak >nul
echo.

echo ============================================================
echo    All services are starting up!
echo ============================================================
echo.
echo You should see 3 new terminal windows:
echo.
echo   🟢 RAG Service  → http://localhost:8000
echo   🟢 Backend API  → http://localhost:3001
echo   🟢 Frontend UI  → http://localhost:5173
echo.
echo ┌──────────────────────────────────────────────────────────┐
echo │  IMPORTANT: Keep all 3 windows running!                 │
echo │                                                          │
echo │  To stop services:                                       │
echo │    Press Ctrl+C in each window, then close them         │
echo └──────────────────────────────────────────────────────────┘
echo.
echo Opening frontend in browser in 5 seconds...
timeout /t 5 /nobreak >nul

REM Open default browser
start http://localhost:5173

echo.
echo ✅ System startup complete!
echo.
echo Next steps:
echo   1. Wait 10-15 seconds for all services to fully load
echo   2. Go to http://localhost:5173/ask in your browser
echo   3. Ask a farming question like:
echo      "How to control brown spot in rice?"
echo.
echo Enjoy your AI-powered agricultural advisory system! 🌾
echo.
pause
