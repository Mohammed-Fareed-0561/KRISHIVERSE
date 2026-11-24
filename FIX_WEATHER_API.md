# Fix Weather API Issue

## Problem
Backend is showing repeated errors:
```
error: OPENWEATHER_API_KEY not configured — add it to your .env
```

## Root Cause
The `.env` file **DOES** contain the API key:
```
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY
```

However, the Node.js backend was started **before** this key was added or hasn't reloaded the environment variables. Node.js caches `process.env` on startup.

## Solution: Restart the Backend

### Step 1: Stop the Backend
In your PowerShell terminal where `npm start` is running:
1. Press `Ctrl + C` to stop the server
2. Wait for it to fully stop (you should see the command prompt return)

### Step 2: Verify .env File
```powershell
cd "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend"
type .env | findstr OPENWEATHER_API_KEY
```

**Expected output:**
```
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY
```

✅ If you see this, the key is present. Continue to Step 3.

### Step 3: Restart the Backend
```powershell
npm start
```

**Expected output (without errors):**
```
[nodemon] starting `node server.js`
info: [bootstrap] MongoDB connected {"mode":"in-memory (dev only)"}
info: [bootstrap] 🌱 KrishiVerse backend running {"port":3001,"apiBase":"/api/v1","env":"development"}
```

✅ **No more `OPENWEATHER_API_KEY` errors should appear!**

### Step 4: Test Weather Endpoint
Open a **new** PowerShell window and test:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/v1/weather/current?lat=11.0168&lon=76.9558&units=metric" -Method Get
```

**Expected output:**
```json
{
  "status": "ok",
  "data": {
    "coord": {"lon": 76.9558, "lat": 11.0168},
    "weather": [...],
    "main": {
      "temp": 28.5,
      "humidity": 65,
      ...
    },
    ...
  }
}
```

✅ Weather data returned successfully!

---

## Why This Happens

Node.js loads environment variables from `.env` when the server **starts**. If you:
1. Start the server
2. Add/modify `.env`
3. The changes **won't** be picked up

**Solution:** Always restart the server after changing `.env` files.

---

## Alternative: Use Mock Data (Fallback)

If you don't want to use the OpenWeatherMap API, you can remove the key from `.env` and the backend will automatically serve mock weather data for development.

**To use mock data:**
1. Edit `backend/.env`
2. Comment out or remove: `OPENWEATHER_API_KEY=...`
3. Restart backend
4. Weather endpoints will return realistic mock data

---

## Verification Checklist

- [ ] Backend stopped (Ctrl+C)
- [ ] `.env` file contains `OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY`
- [ ] Backend restarted (`npm start`)
- [ ] No `OPENWEATHER_API_KEY` errors in logs
- [ ] Weather endpoint returns data successfully

---

## If Still Not Working

If the error persists after restart:

1. **Check .env file location:**
   ```powershell
   Test-Path "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\.env"
   ```
   Should return: `True`

2. **Check .env file content:**
   ```powershell
   Get-Content "C:\Users\Administrator\OneDrive\documents\krishiverse version 2.0 - Final_v2.0\backend\.env"
   ```
   Should show the `OPENWEATHER_API_KEY` line

3. **Check if dotenv is installed:**
   ```powershell
   cd backend
   npm list dotenv
   ```
   Should show: `dotenv@...` (installed)

4. **Try explicit dotenv load:**
   Edit `backend/server.js` line 1:
   ```javascript
   import 'dotenv/config'
   ```
   Change to:
   ```javascript
   import dotenv from 'dotenv'
   dotenv.config()
   ```

5. **Check for extra spaces:**
   Open `backend/.env` in a text editor and ensure there are no extra spaces:
   ```
   OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY
   ```
   NOT:
   ```
   OPENWEATHER_API_KEY = YOUR_OPENWEATHER_API_KEY  (spaces = bad)
   ```

---

**Last Resort:** Use mock data by removing the API key from `.env`. The backend is designed to fall back to realistic mock weather data automatically.
