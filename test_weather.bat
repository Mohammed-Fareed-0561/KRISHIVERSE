@echo off
cls
echo ============================================================
echo    Testing OpenWeather API Configuration
echo ============================================================
echo.

echo [1/4] Checking API key in backend/.env...
cd backend
findstr "OPENWEATHER_API_KEY" .env
echo.

echo [2/4] Testing OpenWeather API directly...
echo (Testing with Coimbatore coordinates: 11.0168, 76.9558)
echo.
curl -s "https://api.openweathermap.org/data/2.5/weather?lat=11.0168&lon=76.9558&appid=YOUR_OPENWEATHER_API_KEY&units=metric" > temp_weather.json

findstr "name" temp_weather.json
findstr "temp" temp_weather.json
echo.

echo [3/4] Testing backend weather endpoint...
echo (Make sure backend is running on port 3001)
echo.
curl -s "http://localhost:3001/api/v1/weather/current?lat=11.0168&lon=76.9558"
echo.
echo.

echo [4/4] Testing forecast endpoint...
curl -s "http://localhost:3001/api/v1/weather/forecast?lat=11.0168&lon=76.9558" | findstr "city"
echo.

del temp_weather.json 2>nul

echo ============================================================
echo    Test Complete
echo ============================================================
echo.
echo If you see real city name (like "Coimbatore") and temperature,
echo your API key is working correctly!
echo.
echo If you see "Tamil Nadu" and temp=28.5, it's using mock data.
echo In that case, restart your backend: cd backend ^&^& npm start
echo.
pause
