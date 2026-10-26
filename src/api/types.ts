// Shapes of the OpenWeatherMap responses the app uses.
// Only the fields the UI needs are typed; the API returns many more.

// One weather condition. `id` is OpenWeatherMap's condition code:
// 2xx thunderstorm, 3xx drizzle, 5xx rain, 6xx snow, 7xx haze/fog, 800 clear, 80x clouds.
export interface WeatherCondition {
  id: number
  main: string
  description: string
  icon: string
}

// GET /data/2.5/weather — current conditions
export interface WeatherData {
  name: string
  coord: {
    lat: number
    lon: number
  }
  // Time of the observation, Unix time in seconds (UTC)
  dt: number
  // Offset of the city's local time from UTC, in seconds
  timezone: number
  sys: {
    country: string
    // Unix time in seconds (UTC)
    sunrise: number
    sunset: number
  }
  main: {
    temp: number
    feels_like: number
    // Spread of readings across the city right now (not a daily forecast)
    temp_min: number
    temp_max: number
    // Sea-level pressure in hPa
    pressure: number
    humidity: number
  }
  // In metres, capped at 10 000. Some stations leave it out.
  visibility?: number
  clouds: {
    // Cloud cover in %
    all: number
  }
  weather: WeatherCondition[]
  wind: {
    // m/s, since the app always asks for metric units
    speed: number
    // Direction the wind blows FROM, in degrees (0 = north)
    deg: number
    // Only sent when there are gusts
    gust?: number
  }
}

// One 3-hour step of the forecast
export interface ForecastEntry {
  // Start of the 3-hour period, Unix time in seconds (UTC)
  dt: number
  main: {
    temp: number
    temp_min: number
    temp_max: number
    humidity: number
  }
  weather: WeatherCondition[]
  // Probability of precipitation, 0 to 1
  pop: number
  // Rain volume for the 3 hours, in mm (absent when dry)
  rain?: {
    '3h'?: number
  }
  wind: {
    speed: number
  }
}

// GET /data/2.5/forecast — 5 days in 3-hour steps (40 entries)
export interface ForecastData {
  list: ForecastEntry[]
  city: {
    name: string
    country: string
    timezone: number
  }
}

// GET /data/2.5/air_pollution — current air quality
export interface AirQualityData {
  list: Array<{
    dt: number
    main: {
      // 1 Good, 2 Fair, 3 Moderate, 4 Poor, 5 Very Poor
      aqi: 1 | 2 | 3 | 4 | 5
    }
    // Pollutant concentrations in μg/m³
    components: {
      pm2_5: number
      pm10: number
      o3: number
      no2: number
      so2: number
      co: number
    }
  }>
}

// Body OpenWeatherMap sends on failure, e.g. { cod: "404", message: "city not found" }
export interface WeatherApiError {
  cod: string | number
  message: string
}
