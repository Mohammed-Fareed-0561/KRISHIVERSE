@echo off
echo ========================================
echo KrishiVerse v2.0 - Complete System Startup
echo ========================================
echo.
echo This will start all 3 services in separate windows:
echo [1] Backend (Node.js) - Port 3001
echo [2] RAG Service (Python) - Port 8000  
echo [3] Frontend (Vite) - Port 5173
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo [1/3] Starting Backend...
start "KrishiVerse Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 3 /nobreak >nul

echo [2/3] Starting RAG Service...
start "KrishiVerse RAG" cmd /k "cd /d %~dp0backend\rag_service && venv\Scripts\activate && python app.py"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend...
start "KrishiVerse Frontend" cmd /k "cd /d %~dp0krishiverse && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo All Services Starting...
echo ========================================
echo.
echo Wait 10-15 seconds, then open:
echo.
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:3001/api/v1/health
echo RAG Service: http://localhost:8000/health
echo.
echo To test disease detection:
echo 1. Go to http://localhost:5173/ask
echo 2. Type: "my rice crops have yellow spots"
echo 3. Should show: Tungro Disease diagnosis
echo.
echo To test weather:
echo 1. Go to http://localhost:5173/weather
echo 2. Should show: Real weather data (not skeleton loading)
echo.
echo Press any key to close this window...
pause >nul
