import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAirQuality, fetchCurrentWeather, fetchForecast } from '../api/openWeatherMap'
import {
  bangkok,
  bangkokAir,
  bangkokForecast,
  singapore,
  singaporeAir,
  singaporeForecast,
} from '../test/fixtures'
import type { WeatherData } from '../api/types'
import useCityWeather, { REFRESH_INTERVAL_MS } from './useCityWeather'

vi.mock('../api/openWeatherMap', () => ({
  fetchCurrentWeather: vi.fn(),
  fetchForecast: vi.fn(),
  fetchAirQuality: vi.fn(),
}))

const weatherMock = vi.mocked(fetchCurrentWeather)
const forecastMock = vi.mocked(fetchForecast)
const airMock = vi.mocked(fetchAirQuality)

// Like the real API: the city by its query, the extras by coordinates
function answerLikeTheApi() {
  weatherMock.mockImplementation(async (query) => {
    if (query === 'Bangkok,TH') return bangkok
    if (query === 'Singapore,SG') return singapore
    throw new Error(`Unexpected query ${query}`)
  })
  forecastMock.mockImplementation(async (lat) =>
    lat === bangkok.coord.lat ? bangkokForecast : singaporeForecast,
  )
  airMock.mockImplementation(async (lat) =>
    lat === bangkok.coord.lat ? bangkokAir : singaporeAir,
  )
}

// A promise the test settles by hand
function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function renderLoaded() {
  const view = renderHook(() => useCityWeather())
  await waitFor(() => expect(view.result.current.refreshing).toBe(false))
  return view
}

describe('useCityWeather', () => {
  beforeEach(() => {
    answerLikeTheApi()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('starts with every city loading', () => {
    const { result } = renderHook(() => useCityWeather())

    expect(result.current.refreshing).toBe(true)
    expect(result.current.lastUpdated).toBeNull()
    expect(Object.keys(result.current.cities)).toEqual(['bangkok', 'singapore'])
    for (const city of Object.values(result.current.cities)) {
      expect(city).toEqual({
        status: 'loading',
        weather: null,
        forecast: null,
        air: null,
        error: null,
      })
    }
  })

  it('loads both cities, with the extras by the coordinates of each city', async () => {
    const before = Date.now()
    const { result } = await renderLoaded()

    expect(result.current.cities.bangkok).toEqual({
      status: 'ready',
      weather: bangkok,
      forecast: bangkokForecast,
      air: bangkokAir,
      error: null,
    })
    expect(result.current.cities.singapore?.weather).toBe(singapore)
    expect(weatherMock.mock.calls).toEqual([['Bangkok,TH'], ['Singapore,SG']])
    expect(forecastMock).toHaveBeenCalledWith(bangkok.coord.lat, bangkok.coord.lon)
    expect(forecastMock).toHaveBeenCalledWith(singapore.coord.lat, singapore.coord.lon)
    expect(airMock).toHaveBeenCalledWith(bangkok.coord.lat, bangkok.coord.lon)
    expect(result.current.lastUpdated).toBeGreaterThanOrEqual(before)
  })

  it('asks for both cities at once, not one after the other', () => {
    weatherMock.mockReturnValue(new Promise<WeatherData>(() => {}))
    renderHook(() => useCityWeather())

    expect(weatherMock).toHaveBeenCalledTimes(2)
  })

  it('shows a city as soon as it arrives', async () => {
    const slow = deferred<WeatherData>()
    weatherMock.mockImplementation(async (query) =>
      query === 'Singapore,SG' ? slow.promise : bangkok,
    )
    const { result } = renderHook(() => useCityWeather())

    await waitFor(() => expect(result.current.cities.bangkok?.status).toBe('ready'))
    expect(result.current.cities.singapore?.status).toBe('loading')
    expect(result.current.refreshing).toBe(true)

    await act(async () => slow.resolve(singapore))
    expect(result.current.cities.singapore?.status).toBe('ready')
    expect(result.current.refreshing).toBe(false)
  })

  it('keeps the current weather when the forecast and air quality fail', async () => {
    forecastMock.mockRejectedValue(new Error('Request failed (500)'))
    airMock.mockRejectedValue(new Error('Request failed (500)'))
    const { result } = await renderLoaded()

    expect(result.current.cities.bangkok).toEqual({
      status: 'ready',
      weather: bangkok,
      forecast: null,
      air: null,
      error: null,
    })
  })

  it('reports an error for a city whose weather fails', async () => {
    weatherMock.mockImplementation(async (query) => {
      if (query === 'Bangkok,TH') throw new Error('Invalid API key.')
      return singapore
    })
    const { result } = await renderLoaded()

    expect(result.current.cities.bangkok).toMatchObject({
      status: 'error',
      weather: null,
      error: 'Invalid API key.',
    })
    expect(result.current.cities.singapore?.status).toBe('ready')
    // Singapore loaded, so the data is still up to date
    expect(result.current.lastUpdated).not.toBeNull()
  })

  it('turns a failed fetch (TypeError) into a network error message', async () => {
    weatherMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = await renderLoaded()

    expect(result.current.cities.bangkok?.error).toBe(
      'Network error. Check your internet connection.',
    )
    // Nothing loaded at all
    expect(result.current.lastUpdated).toBeNull()
  })

  it('keeps the old data on screen while refreshing', async () => {
    const { result } = await renderLoaded()
    const next = deferred<WeatherData>()
    const warmer = { ...bangkok, main: { ...bangkok.main, temp: 34 } }
    weatherMock.mockImplementation(async (query) =>
      query === 'Bangkok,TH' ? next.promise : singapore,
    )

    act(() => result.current.refresh())

    expect(result.current.refreshing).toBe(true)
    expect(result.current.cities.bangkok?.status).toBe('ready')
    expect(result.current.cities.bangkok?.weather).toBe(bangkok)

    await act(async () => next.resolve(warmer))
    expect(result.current.cities.bangkok?.weather).toBe(warmer)
    expect(result.current.refreshing).toBe(false)
  })

  it('keeps the old data, with the error, when a refresh fails', async () => {
    const { result } = await renderLoaded()
    weatherMock.mockRejectedValue(new TypeError('Failed to fetch'))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.refreshing).toBe(false))

    expect(result.current.cities.bangkok).toEqual({
      status: 'ready',
      weather: bangkok,
      forecast: bangkokForecast,
      air: bangkokAir,
      error: 'Network error. Check your internet connection.',
    })
  })

  it('keeps the last forecast when only the forecast fails on a refresh', async () => {
    const { result } = await renderLoaded()
    forecastMock.mockRejectedValue(new Error('Request failed (500)'))

    act(() => result.current.refresh())
    await waitFor(() => expect(result.current.refreshing).toBe(false))

    expect(result.current.cities.bangkok?.forecast).toBe(bangkokForecast)
  })

  it('shows a failed city as loading again when it is retried', async () => {
    weatherMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = await renderLoaded()
    const retry = deferred<WeatherData>()
    weatherMock.mockReturnValue(retry.promise)

    act(() => result.current.refresh())

    expect(result.current.cities.bangkok).toMatchObject({
      status: 'loading',
      error: null,
    })
    await act(async () => retry.resolve(bangkok))
  })

  it('ignores refresh() while a load is still running', async () => {
    weatherMock.mockReturnValue(new Promise<WeatherData>(() => {}))
    const { result } = renderHook(() => useCityWeather())

    act(() => result.current.refresh())

    expect(weatherMock).toHaveBeenCalledTimes(2)
  })

  it('refreshes every 10 minutes until it unmounts', async () => {
    // waitFor() polls with setInterval, so the mocked requests (which answer
    // straight away) are let through with a real setTimeout instead
    async function settle() {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    }
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const { result, unmount } = renderHook(() => useCityWeather())
    await settle()
    expect(result.current.refreshing).toBe(false)
    expect(weatherMock).toHaveBeenCalledTimes(2)

    act(() => {
      vi.advanceTimersByTime(REFRESH_INTERVAL_MS - 1)
    })
    expect(weatherMock).toHaveBeenCalledTimes(2)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(weatherMock).toHaveBeenCalledTimes(4)
    await settle()
    expect(result.current.refreshing).toBe(false)

    unmount()
    act(() => {
      vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 3)
    })
    expect(weatherMock).toHaveBeenCalledTimes(4)
  })
})
