import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchAirQuality, fetchCurrentWeather, fetchForecast } from '../api/openWeatherMap'
import { locationQuery, MAP_LOCATIONS } from '../data/locations'
import type { MapLocation } from '../data/locations'
import type { AirQualityData, ForecastData, WeatherData } from '../api/types'

export const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export type CityStatus = 'loading' | 'ready' | 'error'

export interface CityWeather {
  // 'ready' whenever there is weather to show, even if the latest refresh failed
  status: CityStatus
  weather: WeatherData | null
  forecast: ForecastData | null
  air: AirQualityData | null
  // Why the latest load failed. With status 'ready' the old data is still shown.
  error: string | null
}

export interface CityWeatherState {
  // Keyed by MapLocation id
  cities: Record<string, CityWeather>
  refresh: () => void
  refreshing: boolean
  // When the latest load that got any data finished (epoch ms)
  lastUpdated: number | null
}

type CityResult =
  | {
      ok: true
      weather: WeatherData
      forecast: ForecastData | null
      air: AirQualityData | null
    }
  | { ok: false; error: string }

const LOADING: CityWeather = {
  status: 'loading',
  weather: null,
  forecast: null,
  air: null,
  error: null,
}

function initialCities(): Record<string, CityWeather> {
  return Object.fromEntries(MAP_LOCATIONS.map(({ id }) => [id, LOADING]))
}

function errorMessage(err: unknown) {
  // fetch() rejects with a TypeError when the request never got an answer
  if (err instanceof TypeError) {
    return 'Network error. Check your internet connection.'
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}

async function loadCity(location: MapLocation): Promise<CityResult> {
  try {
    const weather = await fetchCurrentWeather(locationQuery(location))

    // The forecast and air quality are extras: if either request fails,
    // still show the current weather instead of an error.
    const { lat, lon } = weather.coord
    const [forecast, air] = await Promise.allSettled([
      fetchForecast(lat, lon),
      fetchAirQuality(lat, lon),
    ])

    return {
      ok: true,
      weather,
      forecast: forecast.status === 'fulfilled' ? forecast.value : null,
      air: air.status === 'fulfilled' ? air.value : null,
    }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

// Loads every city in parallel and reports each one as soon as it is in.
// Resolves to whether any city loaded.
async function loadCities(
  onCity: (id: string, result: CityResult) => void,
): Promise<boolean> {
  const results = await Promise.all(
    MAP_LOCATIONS.map(async (location) => {
      const result = await loadCity(location)
      onCity(location.id, result)
      return result
    }),
  )
  return results.some((result) => result.ok)
}

// A city after a load. A failure keeps whatever was already on screen.
function withResult(old: CityWeather, result: CityResult): CityWeather {
  if (result.ok) {
    return {
      status: 'ready',
      weather: result.weather,
      // A failed extra keeps the last one that loaded
      forecast: result.forecast ?? old.forecast,
      air: result.air ?? old.air,
      error: null,
    }
  }
  return old.weather
    ? { ...old, status: 'ready', error: result.error }
    : { ...LOADING, status: 'error', error: result.error }
}

// Current weather, forecast and air quality for every MAP_LOCATIONS city.
// Loads them all in parallel on mount and again every 10 minutes. A refresh
// keeps the old data on screen until the new data arrives.
function useCityWeather(): CityWeatherState {
  const [cities, setCities] = useState(initialCities)
  const [refreshing, setRefreshing] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  // Each value is one load of every city; refresh() asks for the next one
  const [loadId, setLoadId] = useState(0)
  // Set while a load runs, so refresh() can't start a second one
  const busyRef = useRef(false)

  const refresh = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setRefreshing(true)
    // Cities that have nothing to show yet (e.g. "Try again" after an
    // error) go back to loading; the others keep their data
    setCities((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, city]) => [
          id,
          city.weather ? city : LOADING,
        ]),
      ),
    )
    setLoadId((id) => id + 1)
  }, [])

  useEffect(() => {
    // Answers that arrive after this load was replaced or the hook unmounted
    // (StrictMode unmounts and mounts again) are dropped
    let current = true
    busyRef.current = true

    void loadCities((id, result) => {
      if (current) {
        setCities((prev) => ({
          ...prev,
          [id]: withResult(prev[id] ?? LOADING, result),
        }))
      }
    }).then((anyLoaded) => {
      if (!current) return
      busyRef.current = false
      setRefreshing(false)
      if (anyLoaded) setLastUpdated(Date.now())
    })

    // Counted from the latest load, so a manual refresh resets the wait
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => {
      current = false
      busyRef.current = false
      clearInterval(timer)
    }
  }, [loadId, refresh])

  return { cities, refresh, refreshing, lastUpdated }
}

export default useCityWeather
