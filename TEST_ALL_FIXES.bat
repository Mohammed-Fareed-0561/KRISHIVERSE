@echo off
echo ========================================
echo KrishiVerse v2.0 - Comprehensive Test Suite
echo ========================================
echo.

echo [1/5] Testing Backend Health...
curl -s http://localhost:3001/api/v1/health 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Backend not running on port 3001
    echo Please start: cd backend ^&^& npm start
) else (
    echo [OK] Backend is healthy
)
echo.

echo [2/5] Testing RAG Service Health...
curl -s http://localhost:8000/health 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] RAG Service not running on port 8000
    echo Please start: cd backend\rag_service ^&^& venv\Scripts\activate ^&^& python app.py
) else (
    echo [OK] RAG Service is healthy
)
echo.

echo [3/5] Testing Frontend...
curl -s http://localhost:5173 2>nul >nul
if %errorlevel% neq 0 (
    echo [ERROR] Frontend not running on port 5173
    echo Please start: cd krishiverse ^&^& npm run dev
) else (
    echo [OK] Frontend is running
)
echo.

echo [4/5] Checking Environment Variables...
cd krishiverse
if exist .env (
    echo [OK] Frontend .env file exists
    findstr /C:"VITE_OPENWEATHER_API_KEY" .env >nul
    if %errorlevel% equ 0 (
        echo [OK] OPENWEATHER_API_KEY configured in frontend
    ) else (
        echo [WARNING] OPENWEATHER_API_KEY missing in frontend .env
    )
) else (
    echo [ERROR] Frontend .env file not found
)
cd ..
echo.

echo [5/5] Checking Disease Detector Files...
if exist "krishiverse\src\services\ai\ComprehensiveDiseaseDetector.js" (
    echo [OK] ComprehensiveDiseaseDetector.js exists
) else (
    echo [ERROR] ComprehensiveDiseaseDetector.js not found
)

if exist "krishiverse\src\services\ai\IndexedDBChatbotEngine.js" (
    echo [OK] IndexedDBChatbotEngine.js exists
) else (
    echo [ERROR] IndexedDBChatbotEngine.js not found
)
echo.

echo ========================================
echo Test Summary
echo ========================================
echo.
echo Next Steps:
echo 1. If all services are running, test at: http://localhost:5173/ask
echo 2. Try query: "my rice crops have yellow spots"
echo 3. Expected: Tungro Disease diagnosis with 80-90%% confidence
echo 4. Check weather at: http://localhost:5173/weather
echo.
echo Manual Test Queries:
echo - "what can you do?"
echo - "my rice crops have yellow spots"
echo - "tomato leaves have brown spots"
echo - "cotton plant is wilting"
echo.
pause
