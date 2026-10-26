import { describe, expect, it } from 'vitest'
import { summariseDays, todayRange } from '../../src/utils/forecast'
import {
  FORECAST_START,
  bangkok,
  bangkokForecast,
  forecastEntry,
  londonForecast,
} from '../support/fixtures'
import type { ForecastData } from '../../src/api/types'

describe('summariseDays', () => {
  it('groups the London forecast into 5 local days', () => {
    const days = summariseDays(londonForecast)

    expect(days).toHaveLength(5)
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })

  it('aggregates min, max and the highest pop per day', () => {
    // Day 1 holds entries 0-7, temps 10-17 (temp_min = temp-1, temp_max = temp+1)
    const [day1] = summariseDays(londonForecast)

    expect(day1.min).toBe(9)
    expect(day1.max).toBe(18)
    // All fixture entries share pop 0.1
    expect(day1.pop).toBeCloseTo(0.1)
  })

  it('takes the highest pop across the whole day', () => {
    const forecast: ForecastData = {
      ...londonForecast,
      list: [
        forecastEntry(0, { pop: 0.2 }),
        forecastEntry(1, { pop: 0.8 }),
        forecastEntry(2, { pop: 0.5 }),
      ],
    }

    expect(summariseDays(forecast)[0]!.pop).toBeCloseTo(0.8)
  })

  it('picks the condition of the entry closest to local noon', () => {
    const noonCondition = {
      id: 800,
      main: 'Clear',
      description: 'clear sky',
      icon: '01d',
    }
    const forecast: ForecastData = {
      ...londonForecast,
      list: [
        // 1 AM London (far from noon)
        forecastEntry(0),
        // 1 PM London, closest to noon of these entries
        forecastEntry(4, { weather: [noonCondition] }),
        // 4 PM London
        forecastEntry(5),
      ],
    }

    expect(summariseDays(forecast)[0]!.condition).toEqual(noonCondition)
  })

  it('groups by the city local date, so a timezone can shift entries to another day', () => {
    // FORECAST_START is 21 Oct 00:00 UTC. In London (UTC+1) that is 21 Oct,
    // but at UTC-2 it is still 21 Oct 22:00 of the previous day (20 Oct).
    const list = [forecastEntry(0), forecastEntry(1)]

    const london: ForecastData = {
      list,
      city: { name: 'London', country: 'GB', timezone: 3600 },
    }
    const westward: ForecastData = {
      list,
      city: { name: 'Westward', country: 'XX', timezone: -2 * 3600 },
    }

    expect(summariseDays(london)[0]!.date).toBe('2026-10-21')
    // The same UTC moment falls on the previous local day further west
    expect(summariseDays(westward)[0]!.date).toBe('2026-10-20')
    expect(FORECAST_START).toBe(Date.UTC(2026, 9, 21) / 1000)
  })

  it('caps the result at 5 days even when more are present', () => {
    // 56 entries (8 per day) would otherwise make 7 days
    const list = Array.from({ length: 56 }, (_, i) => forecastEntry(i))
    const forecast: ForecastData = { ...londonForecast, list }

    expect(summariseDays(forecast)).toHaveLength(5)
  })
})

describe('todayRange', () => {
  it('combines the current reading with the rest of today in the forecast', () => {
    // It is 12:30 PM in Bangkok. The forecast steps left today (1, 4, 7 and
    // 10 PM) run from temp_min 27.9 to temp_max 33.1; now it is 32.4.
    expect(todayRange(bangkok, bangkokForecast)).toEqual({ min: 27.9, max: 33.1 })
  })

  it('counts the current reading when it is outside the forecast', () => {
    const hot = { ...bangkok, main: { ...bangkok.main, temp: 35 } }

    expect(todayRange(hot, bangkokForecast)).toEqual({ min: 27.9, max: 35 })
  })

  it('falls back to the current min/max without a forecast', () => {
    expect(todayRange(bangkok, null)).toEqual({ min: 31.6, max: 33.2 })
  })

  it('falls back to the current min/max when the forecast has no steps left today', () => {
    const tomorrowOnly = {
      ...bangkokForecast,
      list: bangkokForecast.list.slice(4),
    }

    expect(todayRange(bangkok, tomorrowOnly)).toEqual({ min: 31.6, max: 33.2 })
  })
})
