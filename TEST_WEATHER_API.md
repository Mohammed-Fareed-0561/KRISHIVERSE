# ✅ OpenWeather API Key Configuration - Testing Guide

## 🎉 Great! You've Added the API Key

Now let's verify everything works correctly.

---

## 🧪 Step 1: Verify Configuration

**Check your `backend/.env` file:**

```bash
cd backend
cat .env | grep OPENWEATHER
```

**Should show:**
```env
OPENWEATHER_API_KEY=your_actual_key_here
```

✅ **Good:** Shows your API key
❌ **Bad:** Empty or commented out

---

## 🚀 Step 2: Restart Backend

**IMPORTANT:** Backend must be restarted to load the new environment variable.

```bash
# Stop the backend (Ctrl+C if running)

# Start it again
cd backend
npm start
```

**Expected output:**
```
🌱 KrishiVerse backend running
port: 3001
apiBase: /api/v1
MongoDB connected
```

**You should NOT see:**
```
⚠️  OPENWEATHER_API_KEY not configured - using mock data
```

If you still see the warning, the API key isn't loading. See troubleshooting below.

---

## 🧪 Step 3: Test Weather Endpoints

### Test 1: Current Weather

```bash
# Test with your location (change lat/lon as needed)
curl "http://localhost:3001/api/v1/weather/current?lat=11.0168&lon=76.9558"
```

**Expected response (REAL data):**
```json
{
  "status": "ok",
  "data": {
    "coord": {"lon": 76.9558, "lat": 11.0168},
    "weather": [
      {
        "id": 800,
        "main": "Clear",
        "description": "clear sky",
        "icon": "01d"
      }
    ],
    "main": {
      "temp": 32.5,        // Real temperature
      "feels_like": 35.2,
      "humidity": 65,
      "pressure": 1013
    },
    "wind": {
      "speed": 4.5
    },
    "name": "Coimbatore"   // Real city name
  }
}
```

**If using mock data, you'd see:**
```json
{
  "name": "Tamil Nadu",    // Generic name
  "main": {
    "temp": 28.5          // Always same value
  }
}
```

---

### Test 2: Forecast (5-day)

```bash
curl "http://localhost:3001/api/v1/weather/forecast?lat=11.0168&lon=76.9558"
```

**Expected response:**
```json
{
  "status": "ok",
  "data": {
    "list": [
      {
        "dt": 1704067200,
        "main": {
          "temp": 28.5,
          "humidity": 65
        },
        "weather": [{"main": "Clear", "description": "clear sky"}],
        "dt_txt": "2024-01-01 00:00:00"
      },
      // ... 40 entries (5 days × 8 per day)
    ],
    "city": {
      "name": "Coimbatore",    // Real city
      "country": "IN"
    }
  }
}
```

---

## 🌐 Step 4: Test in Frontend

### Open Weather Page

```bash
# Make sure frontend is running
cd krishiverse
npm run dev

# Open in browser:
# http://localhost:5173/weather
```

**What you should see:**

✅ **Real temperature** for your location
✅ **Real city name** (e.g., "Coimbatore" not "Tamil Nadu")
✅ **Real weather condition** (Clear, Clouds, Rain, etc.)
✅ **Accurate 5-day forecast**
✅ **Loads within 2-3 seconds**
✅ **No "mock data" warnings in backend console**

**Check these details:**
- Temperature matches reality (check thermometer!)
- City name is accurate
- Weather description makes sense
- Forecast shows different temps for different days
- Icons change based on conditions

---

## 🎯 Differences: Mock vs Real Data

| Feature | Mock Data | Real API Data |
|---------|-----------|---------------|
| **Temperature** | Always ~28°C | Actual current temp |
| **City Name** | "Tamil Nadu" | Actual city (e.g., "Coimbatore") |
| **Variation** | Little change | Changes with time/weather |
| **Accuracy** | Generic | Accurate for location |
| **Forecast** | Random variation | Real weather prediction |
| **Update** | Static | Updates every API call |

---

## ✅ Success Indicators

### Your API key is working if you see:

1. **Backend console:**
   - ✅ No warning about mock data
   - ✅ No errors when weather is requested

2. **API Response:**
   - ✅ City name matches your location
   - ✅ Temperature is realistic
   - ✅ Forecast has 40 data points
   - ✅ Timestamps are current

3. **Frontend:**
   - ✅ Real city name displayed
   - ✅ Accurate temperature
   - ✅ Weather icons match conditions
   - ✅ Forecast shows real predictions

---

## 🔍 Verify API Key is Valid

### Test directly with OpenWeather API:

```bash
# Replace YOUR_API_KEY with your actual key
curl "https://api.openweathermap.org/data/2.5/weather?lat=11.0168&lon=76.9558&appid=YOUR_API_KEY&units=metric"
```

**If key is valid:**
```json
{
  "coord": {"lon": 76.9558, "lat": 11.0168},
  "weather": [...],
  "main": {"temp": 32.5, ...},
  "name": "Coimbatore"
}
```

**If key is invalid:**
```json
{
  "cod": 401,
  "message": "Invalid API key. Please see http://openweathermap.org/faq#error401"
}
```

---

## 🆘 Troubleshooting

### Problem 1: Still Seeing Mock Data Warning

**Backend console shows:**
```
⚠️  OPENWEATHER_API_KEY not configured - using mock data
```

**Solutions:**

**A) Check .env file location**
```bash
cd backend
pwd  # Make sure you're in backend directory
ls -la .env  # File should exist
cat .env | grep OPENWEATHER  # Should show your key
```

**B) Check .env format**
```env
# ❌ WRONG (has quotes)
OPENWEATHER_API_KEY="sk_abc123"

# ❌ WRONG (has spaces)
OPENWEATHER_API_KEY = sk_abc123

# ✅ CORRECT
OPENWEATHER_API_KEY=sk_abc123
```

**C) Restart backend properly**
```bash
# Kill all node processes
taskkill /F /IM node.exe

# Start fresh
cd backend
npm start
```

---

### Problem 2: Getting 401 Unauthorized

**Error:**
```json
{"cod": 401, "message": "Invalid API key"}
```

**Solutions:**

**A) API key not activated yet**
- New API keys take 10-20 minutes to activate
- Wait a bit and try again

**B) Wrong API key**
- Go to https://home.openweathermap.org/api_keys
- Verify the key is correct
- Copy-paste carefully (no extra spaces)

**C) API key from wrong account**
- Make sure you're using YOUR API key
- Not a demo/example key

---

### Problem 3: API Key Working But Weather Not Showing

**Check network:**

```bash
# Test if backend is reachable
curl http://localhost:3001/api/v1/health

# Test weather endpoint specifically
curl "http://localhost:3001/api/v1/weather/current?lat=11&lon=76"
```

**Check browser console (F12):**
- Look for red errors
- Check Network tab for failed requests
- Verify frontend is calling correct URL

**Check CORS:**

In `backend/src/bootstrap.js`, verify:
```javascript
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
app.use(cors({ origin: FRONTEND_URL, credentials: true }))
```

---

### Problem 4: Rate Limit Exceeded

**Error:**
```json
{"cod": 429, "message": "API calls quota exceeded"}
```

**Free tier limits:**
- 1000 calls per day
- 60 calls per minute

**Solutions:**
- Wait for quota to reset (next day)
- Implement caching (already done in your app!)
- Upgrade to paid plan if needed

**Your app already caches weather for 24 hours**, so normal usage won't hit limits.

---

## 📊 API Usage Monitoring

### Check Your Usage

1. Go to: https://home.openweathermap.org/
2. Login
3. Click "Statistics" or "API Keys"
4. View your call count

**Free tier:** 1000 calls/day

**Your app usage:**
- ~2 calls per user per day (current + forecast)
- With 24hr caching: very low usage
- Can support 500 users/day easily

---

## 🎯 Final Verification Checklist

Run through this checklist:

### Backend
- [ ] `backend/.env` has `OPENWEATHER_API_KEY=your_key`
- [ ] Backend restarted after adding key
- [ ] No mock data warning in console
- [ ] Weather endpoint returns real data

### API Key
- [ ] API key copied correctly (no spaces)
- [ ] API key is activated (wait 10-20 min if new)
- [ ] Direct API call works: `curl "https://api.openweathermap.org/data/2.5/weather?lat=11&lon=76&appid=YOUR_KEY"`

### Frontend
- [ ] Weather page loads without errors
- [ ] Shows real city name (not "Tamil Nadu")
- [ ] Temperature is realistic
- [ ] Forecast shows varying data
- [ ] No errors in browser console (F12)

### Integration
- [ ] Can refresh weather data
- [ ] Caching works (shows "CACHED" badge when offline)
- [ ] Fast loading (1-3 seconds)

**If all checked: Perfect! Your weather system is fully operational! 🎉**

---

## 🎨 What You Should See Now

### Weather Page (with Real API):

```
┌─────────────────────────────────────┐
│  Weather                    🔄      │
│  Live forecast & guidance           │
├─────────────────────────────────────┤
│                                     │
│  Coimbatore            ☀️           │
│  Clear sky                          │
│                                     │
│  32°C                               │
│  Feels like 35°C                    │
│                                     │
│  💧 65%  🌬️ 4.5 m/s  👁️ 10km      │
│                                     │
├─────────────────────────────────────┤
│  5-Day Forecast                     │
│  [Today] [Tomorrow] [Wed] [Thu]...  │
│  28-34°C  26-32°C   27-33°C         │
│  ☀️      ⛅        🌧️              │
├─────────────────────────────────────┤
│  Hourly Forecast                    │
│  Now  3hr  6hr  9hr  12hr           │
│  32°  31°  29°  28°  27°            │
│  ☀️   ☀️   ⛅   ⛅   🌧️            │
└─────────────────────────────────────┘

Last updated: 2:30 PM
```

**Notice:**
- Real city name ✅
- Accurate temperature ✅
- Varying forecast ✅
- Appropriate weather icons ✅

---

## 🚀 Next Steps

Now that your weather API is configured:

1. **Test it thoroughly** - Check different times of day
2. **Monitor usage** - Check OpenWeather dashboard
3. **Enjoy real weather!** - No more mock data
4. **Optional:** Add weather alerts feature
5. **Optional:** Add agricultural weather advisories

---

## 📝 Quick Commands Reference

```bash
# Check if API key is set
cat backend/.env | grep OPENWEATHER

# Test current weather
curl "http://localhost:3001/api/v1/weather/current?lat=11&lon=76"

# Test forecast
curl "http://localhost:3001/api/v1/weather/forecast?lat=11&lon=76"

# Test OpenWeather API directly
curl "https://api.openweathermap.org/data/2.5/weather?lat=11&lon=76&appid=YOUR_KEY&units=metric"

# Restart backend
cd backend
npm start

# Open weather page
# http://localhost:5173/weather
```

---

## ✅ Summary

**You've successfully configured:**

✅ OpenWeather API key in backend/.env
✅ Backend now uses real weather data
✅ No more mock data warnings
✅ Accurate weather for user's location
✅ Real 5-day forecast
✅ Production-ready weather system

**Your weather system is now fully operational with real data! 🌤️**

---

*If you encounter any issues, refer to the troubleshooting section above or check the backend console for specific error messages.*
