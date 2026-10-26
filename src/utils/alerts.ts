import { formatHour } from './time'
import type { ForecastData, ForecastEntry } from '../api/types'

export interface WeatherAlertInfo {
  kind: 'thunderstorm' | 'heavy-rain'
  title: string
  message: string
  // Start of the forecast step that triggered the alert, Unix time in seconds
  dt: number
}

// Only the next ~12 hours: 4 steps of 3 hours each
const LOOKAHEAD_STEPS = 4

// Condition codes for heavy rain: heavy and extreme rain, heavy shower rain
const HEAVY_RAIN_CODES = [502, 503, 504, 522, 531]
// A 3-hour total at or above this many mm counts as heavy rain too
const HEAVY_RAIN_MM = 10

function hasThunderstorm(entry: ForecastEntry) {
  return entry.weather.some(({ id }) => id >= 200 && id <= 232)
}

function hasHeavyRain(entry: ForecastEntry) {
  return (
    entry.weather.some(({ id }) => HEAVY_RAIN_CODES.includes(id)) ||
    (entry.rain?.['3h'] ?? 0) >= HEAVY_RAIN_MM
  )
}

// Looks at the next ~12 hours of the forecast for a thunderstorm or heavy
// rain. A thunderstorm takes priority over heavy rain.
export function findWeatherAlert(forecast: ForecastData): WeatherAlertInfo | null {
  const { timezone } = forecast.city
  const upcoming = forecast.list.slice(0, LOOKAHEAD_STEPS)

  const storm = upcoming.find(hasThunderstorm)
  if (storm) {
    return {
      kind: 'thunderstorm',
      title: 'Thunderstorm warning',
      message: `Thunderstorms expected around ${formatHour(storm.dt, timezone)}.`,
      dt: storm.dt,
    }
  }

  const rain = upcoming.find(hasHeavyRain)
  if (rain) {
    return {
      kind: 'heavy-rain',
      title: 'Heavy rain warning',
      message: `Heavy rain expected around ${formatHour(rain.dt, timezone)}.`,
      dt: rain.dt,
    }
  }

  return null
}
