@echo off
cls
echo ============================================================
echo    KrishiVerse System Health Check
echo ============================================================
echo.

echo Testing services...
echo.

REM Test RAG Service
echo [1/3] Testing RAG Service (http://localhost:8000)...
curl -s http://localhost:8000/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ RAG Service is running
    curl -s http://localhost:8000/health
) else (
    echo    ❌ RAG Service is NOT running
    echo       Start it with: cd backend\rag_service ^&^& python app.py
)
echo.

REM Test Backend
echo [2/3] Testing Backend API (http://localhost:3001)...
curl -s http://localhost:3001/api/v1/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Backend API is running
    curl -s http://localhost:3001/api/v1/health
) else (
    echo    ❌ Backend API is NOT running
    echo       Start it with: cd backend ^&^& npm start
)
echo.

REM Test Frontend
echo [3/3] Testing Frontend (http://localhost:5173)...
curl -s http://localhost:5173 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Frontend is running
) else (
    echo    ❌ Frontend is NOT running
    echo       Start it with: cd krishiverse ^&^& npm run dev
)
echo.

echo ============================================================
echo.

REM Test RAG integration
echo Testing RAG Integration...
echo.
echo Sending test question: "What causes brown spot in rice?"
echo.

curl -X POST http://localhost:8000/rag/ask ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"What causes brown spot in rice?\"}" ^
  -s

echo.
echo.

echo ============================================================
echo    Health Check Complete
echo ============================================================
echo.
echo If all services show ✅, your system is ready!
echo.
echo Open http://localhost:5173/ask and try asking:
echo   • "How to control late blight in potato?"
echo   • "What is PM-KISAN scheme?"
echo   • "Best fertilizer for wheat?"
echo.
pause
