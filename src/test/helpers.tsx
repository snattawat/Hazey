import { render } from '@testing-library/react'
import { vi } from 'vitest'
import type { AirQualityData, ForecastData, WeatherData } from '../api/types'
import {
  bangkok,
  bangkokAir,
  bangkokForecast,
  singapore,
  singaporeAir,
  singaporeForecast,
} from './fixtures'

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface FakeCity {
  id: 'bangkok' | 'singapore'
  // The `q` the app sends to /weather
  query: string
  weather: WeatherData
  forecast: ForecastData
  air: AirQualityData
}

const FAKE_CITIES: FakeCity[] = [
  {
    id: 'bangkok',
    query: 'Bangkok,TH',
    weather: bangkok,
    forecast: bangkokForecast,
    air: bangkokAir,
  },
  {
    id: 'singapore',
    query: 'Singapore,SG',
    weather: singapore,
    forecast: singaporeForecast,
    air: singaporeAir,
  },
]

export type Endpoint = 'weather' | 'forecast' | 'air_pollution'

// Which endpoint a request goes to, and which city it is for: /weather by
// its `q`, the others by the coordinates /weather returned for the city.
export function describeRequest(input: RequestInfo | URL) {
  const url = new URL(String(input))
  const endpoint = url.pathname.split('/').pop() as Endpoint
  const city =
    endpoint === 'weather'
      ? FAKE_CITIES.find(({ query }) => query === url.searchParams.get('q'))
      : FAKE_CITIES.find(
          ({ weather }) =>
            String(weather.coord.lat) === url.searchParams.get('lat') &&
            String(weather.coord.lon) === url.searchParams.get('lon'),
        )
  return { url, endpoint, cityId: city?.id, city }
}

// Answers each OpenWeatherMap endpoint for Bangkok and Singapore the way the
// real API would. Tests override individual calls with mock*Once().
export function fakeApi(input: RequestInfo | URL): Promise<Response> {
  const { endpoint, city } = describeRequest(input)
  if (!city) {
    return Promise.resolve(
      jsonResponse({ cod: '404', message: 'city not found' }, 404),
    )
  }
  switch (endpoint) {
    case 'weather':
      return Promise.resolve(jsonResponse(city.weather))
    case 'forecast':
      return Promise.resolve(jsonResponse(city.forecast))
    case 'air_pollution':
      return Promise.resolve(jsonResponse(city.air))
    default:
      return Promise.resolve(jsonResponse({ message: 'Unexpected URL' }, 500))
  }
}

// App reads VITE_API_KEY when its module loads, so it has to be imported
// again (after the env is stubbed) for every test.
export async function renderApp() {
  vi.resetModules()
  const { default: App } = await import('../App')
  return render(<App />)
}
