import { describe, expect, it } from 'vitest'
import { findWeatherAlert } from '../../src/utils/alerts'
import { forecastEntry, londonForecast } from '../support/fixtures'
import type { ForecastData, ForecastEntry } from '../../src/api/types'

const thunderstorm = {
  id: 211,
  main: 'Thunderstorm',
  description: 'thunderstorm',
  icon: '11d',
}
const heavyRain = {
  id: 502,
  main: 'Rain',
  description: 'heavy intensity rain',
  icon: '10d',
}

// The dry London forecast with some steps (by index) replaced
function forecastWith(
  overrides: Record<number, Partial<ForecastEntry>>,
): ForecastData {
  return {
    ...londonForecast,
    list: londonForecast.list.map((entry, index) =>
      index in overrides ? forecastEntry(index, overrides[index]) : entry,
    ),
  }
}

describe('findWeatherAlert', () => {
  it('returns null for the dry, cloudy forecast', () => {
    expect(findWeatherAlert(londonForecast)).toBeNull()
  })

  it('returns null for an empty forecast', () => {
    expect(findWeatherAlert({ ...londonForecast, list: [] })).toBeNull()
  })

  it('warns about a thunderstorm at the hour it starts, in city time', () => {
    // Step 1 starts at 03:00 UTC, which is 4 AM in London
    const forecast = forecastWith({ 1: { weather: [thunderstorm] } })

    expect(findWeatherAlert(forecast)).toEqual({
      kind: 'thunderstorm',
      title: 'Thunderstorm warning',
      message: 'Thunderstorms expected around 4 AM.',
      dt: londonForecast.list[1].dt,
    })
  })

  it('uses the local hour of the first step (1 AM in London)', () => {
    const forecast = forecastWith({ 0: { weather: [thunderstorm] } })

    expect(findWeatherAlert(forecast)?.message).toBe(
      'Thunderstorms expected around 1 AM.',
    )
  })

  it('uses the forecast city timezone, not the computer timezone', () => {
    const forecast: ForecastData = {
      ...forecastWith({ 0: { weather: [thunderstorm] } }),
      city: { name: 'Tokyo', country: 'JP', timezone: 9 * 3600 },
    }

    expect(findWeatherAlert(forecast)?.message).toBe(
      'Thunderstorms expected around 9 AM.',
    )
  })

  it.each([200, 211, 232])('treats condition %i as a thunderstorm', (id) => {
    const forecast = forecastWith({
      0: { weather: [{ ...thunderstorm, id }] },
    })

    expect(findWeatherAlert(forecast)?.kind).toBe('thunderstorm')
  })

  it('does not treat drizzle (300) as an alert', () => {
    const forecast = forecastWith({
      0: { weather: [{ ...heavyRain, id: 300, description: 'drizzle' }] },
    })

    expect(findWeatherAlert(forecast)).toBeNull()
  })

  it.each([502, 503, 504, 522, 531])(
    'warns about heavy rain for condition %i',
    (id) => {
      const forecast = forecastWith({
        2: { weather: [{ ...heavyRain, id }] },
      })

      // Step 2 starts at 06:00 UTC, which is 7 AM in London
      expect(findWeatherAlert(forecast)).toEqual({
        kind: 'heavy-rain',
        title: 'Heavy rain warning',
        message: 'Heavy rain expected around 7 AM.',
        dt: londonForecast.list[2].dt,
      })
    },
  )

  it('does not treat moderate rain (501) as heavy', () => {
    const forecast = forecastWith({
      0: { weather: [{ ...heavyRain, id: 501 }] },
    })

    expect(findWeatherAlert(forecast)).toBeNull()
  })

  it('warns about heavy rain when 10 mm or more falls in 3 hours', () => {
    const forecast = forecastWith({ 1: { rain: { '3h': 10 } } })

    expect(findWeatherAlert(forecast)).toMatchObject({
      kind: 'heavy-rain',
      message: 'Heavy rain expected around 4 AM.',
    })
  })

  it('does not warn when less than 10 mm falls in 3 hours', () => {
    const forecast = forecastWith({ 1: { rain: { '3h': 9.9 } } })

    expect(findWeatherAlert(forecast)).toBeNull()
  })

  it('prefers a thunderstorm over earlier heavy rain', () => {
    const forecast = forecastWith({
      0: { weather: [heavyRain] },
      2: { weather: [thunderstorm] },
    })

    expect(findWeatherAlert(forecast)).toMatchObject({
      kind: 'thunderstorm',
      message: 'Thunderstorms expected around 7 AM.',
    })
  })

  it('prefers a thunderstorm when one step has both', () => {
    const forecast = forecastWith({
      0: { weather: [heavyRain, thunderstorm], rain: { '3h': 15 } },
    })

    expect(findWeatherAlert(forecast)?.kind).toBe('thunderstorm')
  })

  it('reports the first matching step', () => {
    const forecast = forecastWith({
      1: { weather: [thunderstorm] },
      3: { weather: [thunderstorm] },
    })

    expect(findWeatherAlert(forecast)?.dt).toBe(londonForecast.list[1].dt)
  })

  it('looks at the 4th step (the next 12 hours)', () => {
    // Step 3 starts at 09:00 UTC, which is 10 AM in London
    const forecast = forecastWith({ 3: { weather: [thunderstorm] } })

    expect(findWeatherAlert(forecast)?.message).toBe(
      'Thunderstorms expected around 10 AM.',
    )
  })

  it('ignores steps after the 4th', () => {
    const forecast = forecastWith({
      4: { weather: [thunderstorm] },
      5: { weather: [heavyRain], rain: { '3h': 20 } },
    })

    expect(findWeatherAlert(forecast)).toBeNull()
  })

  it('copes with a step that has no weather conditions', () => {
    const forecast = forecastWith({ 0: { weather: [] } })

    expect(findWeatherAlert(forecast)).toBeNull()
  })
})
