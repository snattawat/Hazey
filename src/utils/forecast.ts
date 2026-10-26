import { localDateKey } from './time'
import type {
  ForecastData,
  ForecastEntry,
  WeatherCondition,
  WeatherData,
} from '../api/types'

export interface DaySummary {
  // Local calendar date key, e.g. "2026-10-21"
  date: string
  // dt of the first entry of the day (Unix seconds, UTC)
  dt: number
  // Lowest temp_min across the day
  min: number
  // Highest temp_max across the day
  max: number
  // Highest chance of rain across the day, 0 to 1
  pop: number
  // The condition closest to local noon (undefined if none available)
  condition: WeatherCondition | undefined
}

// How far an entry's local hour is from 12 noon.
function hoursFromNoon(entry: ForecastEntry, timezone: number) {
  const localHour = new Date((entry.dt + timezone) * 1000).getUTCHours()
  return Math.abs(localHour - 12)
}

// Group the 3-hour forecast steps into at most 5 local days.
export function summariseDays(forecast: ForecastData): DaySummary[] {
  const timezone = forecast.city.timezone
  const groups = new Map<string, ForecastEntry[]>()

  for (const entry of forecast.list) {
    const key = localDateKey(entry.dt, timezone)
    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(entry)
    } else {
      groups.set(key, [entry])
    }
  }

  const summaries: DaySummary[] = []
  for (const [date, entries] of groups) {
    let min = Infinity
    let max = -Infinity
    let pop = 0
    let condition: WeatherCondition | undefined
    let bestNoonDistance = Infinity

    for (const entry of entries) {
      min = Math.min(min, entry.main.temp_min)
      max = Math.max(max, entry.main.temp_max)
      pop = Math.max(pop, entry.pop)

      const candidate = entry.weather[0]
      if (candidate) {
        const distance = hoursFromNoon(entry, timezone)
        if (distance < bestNoonDistance) {
          bestNoonDistance = distance
          condition = candidate
        }
      }
    }

    summaries.push({
      date,
      dt: entries[0]!.dt,
      min,
      max,
      pop,
      condition,
    })
  }

  return summaries.slice(0, 5)
}

// Today's expected low and high: the current reading plus the rest of today
// in the forecast. The current conditions' temp_min/temp_max only describe
// the spread across the city right now, so they are just the fallback when
// there is no forecast for the rest of the day.
export function todayRange(
  weather: WeatherData,
  forecast: ForecastData | null,
): { min: number; max: number } {
  const today = localDateKey(weather.dt, weather.timezone)
  const rest =
    forecast?.list.filter(
      (entry) => localDateKey(entry.dt, forecast.city.timezone) === today,
    ) ?? []

  if (rest.length === 0) {
    return { min: weather.main.temp_min, max: weather.main.temp_max }
  }

  return {
    min: Math.min(weather.main.temp, ...rest.map((entry) => entry.main.temp_min)),
    max: Math.max(weather.main.temp, ...rest.map((entry) => entry.main.temp_max)),
  }
}
