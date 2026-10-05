@echo off
cls
echo ============================================================
echo    KrishiVerse RAG System - Setup Verification
echo ============================================================
echo.

set ERRORS=0

echo Checking setup requirements...
echo.

REM ========== Check 1: Python Installation ==========
echo [1/10] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Python is installed
    python --version
) else (
    echo    ❌ Python is NOT installed
    echo       Install from: https://www.python.org/downloads/
    set /a ERRORS+=1
)
echo.

REM ========== Check 2: Node.js Installation ==========
echo [2/10] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Node.js is installed
    node --version
) else (
    echo    ❌ Node.js is NOT installed
    echo       Install from: https://nodejs.org/
    set /a ERRORS+=1
)
echo.

REM ========== Check 3: RAG Virtual Environment ==========
echo [3/10] Checking RAG virtual environment...
if exist "backend\rag_service\venv\Scripts\activate.bat" (
    echo    ✅ Virtual environment exists
) else (
    echo    ❌ Virtual environment NOT found
    echo       Create it with:
    echo       cd backend\rag_service
    echo       python -m venv venv
    set /a ERRORS+=1
)
echo.

REM ========== Check 4: RAG Dependencies ==========
echo [4/10] Checking RAG dependencies...
if exist "backend\rag_service\venv\Scripts\activate.bat" (
    call backend\rag_service\venv\Scripts\activate.bat >nul 2>&1
    pip show fastapi >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo    ✅ Python dependencies installed
    ) else (
        echo    ❌ Python dependencies NOT installed
        echo       Install with:
        echo       cd backend\rag_service
        echo       venv\Scripts\activate
        echo       pip install -r requirements.txt
        set /a ERRORS+=1
    )
) else (
    echo    ⏭️  Skipped - virtual environment not found
)
echo.

REM ========== Check 5: Backend Dependencies ==========
echo [5/10] Checking backend dependencies...
if exist "backend\node_modules" (
    echo    ✅ Backend dependencies installed
) else (
    echo    ❌ Backend dependencies NOT installed
    echo       Install with:
    echo       cd backend
    echo       npm install
    set /a ERRORS+=1
)
echo.

REM ========== Check 6: Frontend Dependencies ==========
echo [6/10] Checking frontend dependencies...
if exist "krishiverse\node_modules" (
    echo    ✅ Frontend dependencies installed
) else (
    echo    ❌ Frontend dependencies NOT installed
    echo       Install with:
    echo       cd krishiverse
    echo       npm install
    set /a ERRORS+=1
)
echo.

REM ========== Check 7: Environment Files ==========
echo [7/10] Checking environment files...

set ENV_MISSING=0

if exist "backend\.env" (
    echo    ✅ backend\.env exists
) else (
    echo    ⚠️  backend\.env missing
    echo       Copy from: backend\.env.example
    set /a ENV_MISSING+=1
)

if exist "krishiverse\.env" (
    echo    ✅ krishiverse\.env exists
) else (
    echo    ⚠️  krishiverse\.env missing
    echo       Copy from: krishiverse\.env.example
    set /a ENV_MISSING+=1
)

if exist "backend\rag_service\.env" (
    echo    ✅ backend\rag_service\.env exists
) else (
    echo    ⚠️  backend\rag_service\.env missing (will use defaults)
)

if %ENV_MISSING% GTR 0 (
    echo    ℹ️  Some .env files missing but system can still work
)
echo.

REM ========== Check 8: RAG Data Files ==========
echo [8/10] Checking RAG data files...
if exist "backend\rag_service\data\crops.json" (
    echo    ✅ RAG data files present
) else (
    echo    ❌ RAG data files NOT found
    echo       They should have been created during setup
    set /a ERRORS+=1
)
echo.

REM ========== Check 9: Port Availability ==========
echo [9/10] Checking port availability...

netstat -ano | findstr ":8000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Port 8000 is already in use
    echo       RAG service may not start
    echo       Use: netstat -ano ^| findstr :8000 to find process
) else (
    echo    ✅ Port 8000 is available
)

netstat -ano | findstr ":3001 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Port 3001 is already in use
    echo       Backend may not start
    echo       Use: netstat -ano ^| findstr :3001 to find process
) else (
    echo    ✅ Port 3001 is available
)

netstat -ano | findstr ":5173 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Port 5173 is already in use
    echo       Frontend may not start
    echo       Use: netstat -ano ^| findstr :5173 to find process
) else (
    echo    ✅ Port 5173 is available
)
echo.

REM ========== Check 10: Old Streamlit App ==========
echo [10/10] Checking for old Streamlit app...
netstat -ano | findstr ":61852 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    ⚠️  Old Streamlit app still running on port 61852
    echo       You can stop it - it's not needed anymore
    echo       Find PID with: netstat -ano ^| findstr :61852
    echo       Kill with: taskkill /PID ^<PID^> /F
) else (
    echo    ✅ Old Streamlit app not running
)
echo.

echo ============================================================
echo.

if %ERRORS% EQU 0 (
    echo ✅ ✅ ✅  ALL CHECKS PASSED  ✅ ✅ ✅
    echo.
    echo Your system is ready to start!
    echo.
    echo Next steps:
    echo   1. Run: start_all.bat
    echo   2. Wait 15 seconds for services to start
    echo   3. Open http://localhost:5173/ask
    echo   4. Start asking farming questions!
    echo.
) else (
    echo ❌ SETUP INCOMPLETE - %ERRORS% error(s) found
    echo.
    echo Please fix the errors above, then run this script again.
    echo.
    echo Quick fixes:
    echo   • Missing Python? Install from https://python.org
    echo   • Missing Node.js? Install from https://nodejs.org
    echo   • Missing dependencies? Run: npm install in each directory
    echo   • Missing venv? Run: python -m venv venv in backend/rag_service
    echo.
)

echo ============================================================
echo.

echo Detailed Setup Guide: COMPLETE_STARTUP_GUIDE.md
echo Troubleshooting Help: TROUBLESHOOTING.md
echo System Overview: RAG_SETUP_COMPLETE.md
echo.
pause
