@echo off
echo ========================================
echo Restarting KrishiVerse Backend
echo ========================================
echo.

echo Step 1: Checking .env file...
findstr /C:"OPENWEATHER_API_KEY" .env >nul
if %errorlevel%==0 (
    echo [OK] OPENWEATHER_API_KEY found in .env
) else (
    echo [ERROR] OPENWEATHER_API_KEY not found in .env!
    echo Please add: OPENWEATHER_API_KEY=your_key_here
    pause
    exit /b 1
)

echo.
echo Step 2: Killing any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Stopped existing Node processes
    timeout /t 2 /nobreak >nul
) else (
    echo [INFO] No existing Node processes found
)

echo.
echo Step 3: Starting backend server...
echo.
echo ========================================
echo Backend will start now...
echo Press Ctrl+C to stop
echo ========================================
echo.

npm start
