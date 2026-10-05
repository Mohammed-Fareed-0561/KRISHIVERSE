import { Router } from 'express'
import https from 'https'
 
export const weatherRouter = Router()
 
const OWM_BASE = 'https://api.openweathermap.org/data/2.5'
 
function owmKey() {
  return process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHERMAP_KEY || ''
}

// Mock weather data for development when API key is not available
function getMockCurrentWeather(lat, lon) {
  return {
    coord: { lon: parseFloat(lon), lat: parseFloat(lat) },
    weather: [
      {
        id: 800,
        main: 'Clear',
        description: 'clear sky',
        icon: '01d'
      }
    ],
    base: 'stations',
    main: {
      temp: 28.5,
      feels_like: 30.2,
      temp_min: 26.0,
      temp_max: 31.0,
      pressure: 1013,
      humidity: 65
    },
    visibility: 10000,
    wind: {
      speed: 3.5,
      deg: 180
    },
    clouds: {
      all: 10
    },
    dt: Math.floor(Date.now() / 1000),
    sys: {
      country: 'IN',
      sunrise: 1640145000,
      sunset: 1640186400
    },
    timezone: 19800,
    id: 1269843,
    name: 'Tamil Nadu',
    cod: 200
  }
}

function getMockForecast(lat, lon) {
  const list = []
  const now = Date.now()
  
  // Generate 40 forecast entries (5 days * 8 times per day)
  for (let i = 0; i < 40; i++) {
    const dt = Math.floor(now / 1000) + (i * 3 * 3600) // Every 3 hours
    const hour = new Date(dt * 1000).getHours()
    const isDaytime = hour >= 6 && hour < 18
    
    list.push({
      dt,
      main: {
        temp: 25 + Math.random() * 10,
        feels_like: 27 + Math.random() * 8,
        temp_min: 23 + Math.random() * 5,
        temp_max: 28 + Math.random() * 8,
        pressure: 1010 + Math.random() * 10,
        humidity: 55 + Math.random() * 30
      },
      weather: [
        {
          id: isDaytime ? 800 : 801,
          main: Math.random() > 0.7 ? 'Clouds' : 'Clear',
          description: Math.random() > 0.7 ? 'few clouds' : 'clear sky',
          icon: isDaytime ? '01d' : '01n'
        }
      ],
      clouds: { all: Math.floor(Math.random() * 40) },
      wind: {
        speed: 2 + Math.random() * 4,
        deg: Math.floor(Math.random() * 360)
      },
      visibility: 10000,
      pop: Math.random() * 0.3, // Probability of precipitation
      dt_txt: new Date(dt * 1000).toISOString().replace('T', ' ').slice(0, 19)
    })
  }
  
  return {
    cod: '200',
    message: 0,
    cnt: 40,
    list,
    city: {
      id: 1269843,
      name: 'Tamil Nadu',
      coord: { lat: parseFloat(lat), lon: parseFloat(lon) },
      country: 'IN',
      population: 0,
      timezone: 19800
    }
  }
}
 
async function owmFetch(path, params) {
  if (!owmKey()) {
    console.warn('⚠️  OPENWEATHER_API_KEY not configured - using mock data for development')
    console.warn('   Get a free API key from: https://openweathermap.org/api')
    console.warn('   Add to backend/.env: OPENWEATHER_API_KEY=your_key_here')
    
    // Return mock data instead of throwing error
    if (path === '/weather') {
      return getMockCurrentWeather(params.lat, params.lon)
    } else if (path === '/forecast') {
      return getMockForecast(params.lat, params.lon)
    }
    
    // If path doesn't match known endpoints, throw error
    const err = new Error('OPENWEATHER_API_KEY not configured and no mock available')
    err.status = 503
    throw err
  }
 
  const qs = new URLSearchParams({ ...params, appid: owmKey() }).toString()
  const url = `${OWM_BASE}${path}?${qs}`
 
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = ''
      res.on('data', chunk => { raw += chunk })
      res.on('end', () => {
        try {
          const data = JSON.parse(raw)
          if (res.statusCode >= 400) {
            const err = new Error(data.message || 'OpenWeatherMap error')
            err.status = res.statusCode
            return reject(err)
          }
          resolve(data)
        } catch {
          reject(new Error('Failed to parse OWM response'))
        }
      })
    }).on('error', reject)
  })
}
 
// GET /weather/current?lat=xx&lon=yy&units=metric&lang=en
weatherRouter.get('/current', async (req, res) => {
  const { lat, lon, units = 'metric', lang = 'en' } = req.query
  if (!lat || !lon) {
    const err = new Error('lat and lon query params are required')
    err.status = 400
    throw err
  }
  const data = await owmFetch('/weather', { lat, lon, units, lang })
  res.json({ status: 'ok', data })
})
 
// GET /weather/forecast?lat=xx&lon=yy
weatherRouter.get('/forecast', async (req, res) => {
  const { lat, lon, units = 'metric', lang = 'en', cnt = 40 } = req.query
  if (!lat || !lon) {
    const err = new Error('lat and lon query params are required')
    err.status = 400
    throw err
  }
  const data = await owmFetch('/forecast', { lat, lon, units, lang, cnt })
  res.json({ status: 'ok', data })
})
