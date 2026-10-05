# 🪟 Windows Command Reference for KrishiVerse

Since you're on Windows, here are the correct commands (not Linux `cat`):

## Check Environment Variables

### Check Frontend .env
```cmd
cd krishiverse
findstr OPENWEATHER .env
findstr GROQ .env
```

Or view entire file:
```cmd
type .env
```

### Check Backend .env
```cmd
cd backend
findstr OPENWEATHER .env
findstr GROQ .env
```

---

## Start Services

### Option 1: One-Click (Recommended)
```cmd
# Just double-click this file in Windows Explorer:
START_EVERYTHING.bat
```

### Option 2: Manual (3 Terminals)

**Terminal 1 - Backend:**
```cmd
cd backend
npm start
```

**Terminal 2 - RAG Service:**
```cmd
cd backend\rag_service
venv\Scripts\activate
python app.py
```

**Terminal 3 - Frontend:**
```cmd
cd krishiverse
npm run dev
```

---

## Test Services

### Test Backend Health
```cmd
curl http://localhost:3001/api/v1/health
```

### Test RAG Service Health
```cmd
curl http://localhost:8000/health
```

### Test Frontend (in browser)
```
Open: http://localhost:5173
```

---

## Common Tasks

### View File Contents
```cmd
# NOT this (Linux):
cat file.txt

# Use this (Windows):
type file.txt
```

### Search in File
```cmd
# NOT this (Linux):
cat file.txt | grep "search"

# Use this (Windows):
findstr "search" file.txt
```

### List Files
```cmd
# NOT this (Linux):
ls

# Use this (Windows):
dir
```

### Clear Screen
```cmd
# NOT this (Linux):
clear

# Use this (Windows):
cls
```

---

## PowerShell Commands (Alternative)

If you prefer PowerShell, you can use:

### View File
```powershell
Get-Content .env
# Or shorter:
gc .env
```

### Search in File
```powershell
Get-Content .env | Select-String "OPENWEATHER"
# Or shorter:
gc .env | sls "OPENWEATHER"
```

### Test API Endpoints
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health" | ConvertTo-Json
# Or shorter:
irm http://localhost:8000/health
```

---

## Quick Verification Script

Save this as `check_config.bat`:

```batch
@echo off
echo ========================================
echo Checking KrishiVerse Configuration
echo ========================================
echo.

echo [1] Frontend .env file:
cd krishiverse
findstr OPENWEATHER .env
findstr GROQ .env
cd ..
echo.

echo [2] Backend .env file:
cd backend
findstr OPENWEATHER .env
findstr GROQ .env
cd ..
echo.

echo [3] Disease Detector file exists?
if exist "krishiverse\src\services\ai\ComprehensiveDiseaseDetector.js" (
    echo ✅ ComprehensiveDiseaseDetector.js found
) else (
    echo ❌ ComprehensiveDiseaseDetector.js NOT found
)
echo.

echo [4] Services running?
curl -s http://localhost:3001/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is running
) else (
    echo ❌ Backend not running - Start with: cd backend ^&^& npm start
)

curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ RAG Service is running
) else (
    echo ❌ RAG Service not running
)

curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is running
) else (
    echo ❌ Frontend not running - Start with: cd krishiverse ^&^& npm run dev
)
echo.

echo ========================================
echo Configuration check complete!
echo ========================================
pause
```

---

## Your Current Status ✅

Based on the command output, your **frontend .env is correctly configured**:
```
VITE_OPENWEATHER_API_KEY=284fb14b95a0636efeee744281b7d5a9
```

**Next Steps:**
1. Start services using `START_EVERYTHING.bat`
2. Wait 15 seconds
3. Open http://localhost:5173
4. Test with: "my rice crops have yellow spots"

---

## Troubleshooting

### If "curl is not recognized"
Install curl or use PowerShell's `Invoke-RestMethod`:
```powershell
Invoke-RestMethod http://localhost:8000/health
```

### If ports are in use
Check what's using the port:
```cmd
netstat -ano | findstr :8000
```

Kill process by PID:
```cmd
taskkill /PID <PID_NUMBER> /F
```

### If venv activation fails
```cmd
cd backend\rag_service
# If error, recreate venv:
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

**Remember:** On Windows, use `type` instead of `cat`, `findstr` instead of `grep`, and `dir` instead of `ls`!
