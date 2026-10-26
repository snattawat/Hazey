import type {
  AirQualityData,
  ForecastData,
  WeatherApiError,
  WeatherData,
} from './types'

const API_URL = 'https://api.openweathermap.org/data/2.5'
const API_KEY = import.meta.env.VITE_API_KEY

// Calls one OpenWeatherMap endpoint and turns failures into readable errors.
async function getJson<T>(
  endpoint: string,
  params: Record<string, string>,
  notFoundMessage = 'No data found for this location.',
): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      'Missing API key. Add VITE_API_KEY to the .env file and restart the dev server.',
    )
  }

  const search = new URLSearchParams({ ...params, appid: API_KEY })
  const response = await fetch(`${API_URL}/${endpoint}?${search}`)

  // fetch() only rejects on network failure. A misspelled city still
  // resolves (with a 404), so the status has to be checked here.
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as WeatherApiError | null

    if (response.status === 404) {
      throw new Error(notFoundMessage)
    }
    if (response.status === 401) {
      throw new Error(
        'Invalid API key. New OpenWeatherMap keys can take a couple of hours to activate.',
      )
    }
    throw new Error(body?.message ?? `Request failed (${response.status})`)
  }

  return response.json()
}

export function fetchCurrentWeather(city: string) {
  return getJson<WeatherData>(
    'weather',
    { q: city, units: 'metric' },
    `Couldn't find "${city}". Check the spelling and try again.`,
  )
}

// 5 days of forecasts in 3-hour steps (40 entries)
export function fetchForecast(lat: number, lon: number) {
  return getJson<ForecastData>('forecast', {
    lat: String(lat),
    lon: String(lon),
    units: 'metric',
  })
}

export function fetchAirQuality(lat: number, lon: number) {
  return getJson<AirQualityData>('air_pollution', {
    lat: String(lat),
    lon: String(lon),
  })
}

// URL of an OpenWeatherMap condition icon, e.g. iconUrl('10d'). The 2x image
// is 100px; use the 4x one (200px) where the icon is shown large.
export function iconUrl(icon: string, scale: 2 | 4 = 2) {
  return `https://openweathermap.org/img/wn/${icon}@${scale}x.png`
}
