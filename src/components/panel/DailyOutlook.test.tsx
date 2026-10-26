import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FORECAST_START, forecastEntry, londonForecast } from '../../test/fixtures'
import type { ForecastData } from '../../api/types'
import DailyOutlook from './DailyOutlook'

// Two London days: the 21st between 20° and 30°, the 22nd between 25° and 35°
const twoDays: ForecastData = {
  ...londonForecast,
  list: Array.from({ length: 16 }, (_, index) => {
    const [low, high] = index < 8 ? [20, 30] : [25, 35]
    return forecastEntry(index, {
      main: { temp: (low + high) / 2, temp_min: low, temp_max: high, humidity: 70 },
    })
  }),
}

// The range bars, one per day, in order
function bars(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('.range-bar')]
}

describe('DailyOutlook', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // "Now" is 21 Oct 2026 00:00 UTC == the first forecast day in London
    vi.setSystemTime(FORECAST_START * 1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is a "5-day outlook" section with one row per day', () => {
    render(<DailyOutlook forecast={londonForecast} units="metric" />)

    expect(
      screen.getByRole('region', { name: '5-day outlook' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })

  it('labels the current local day "Today" and others by weekday', () => {
    render(<DailyOutlook forecast={londonForecast} units="metric" />)

    expect(screen.getByText('Today')).toBeInTheDocument()
    // 21 Oct 2026 is a Wednesday, so the second day (22 Oct) is Thursday
    expect(screen.getByText('Thu')).toBeInTheDocument()
    // "Today" replaces the weekday, so Wednesday is never shown
    expect(screen.queryByText('Wed')).not.toBeInTheDocument()
  })

  it('shows the low and high temperature for a day', () => {
    render(<DailyOutlook forecast={londonForecast} units="metric" />)

    // Day 1 temps 10-17 give temp_max 18 and temp_min 9. The fixture's temps
    // cycle identically each day, so every row shows the same range.
    const [today] = screen.getAllByRole('listitem')
    expect(today).toHaveTextContent('Low 9°')
    expect(today).toHaveTextContent('High 18°')
  })

  it('shows the low and high in Fahrenheit', () => {
    render(<DailyOutlook forecast={londonForecast} units="imperial" />)

    // 9°C and 18°C
    const [today] = screen.getAllByRole('listitem')
    expect(today).toHaveTextContent('Low 48°')
    expect(today).toHaveTextContent('High 64°')
  })

  it('shows the rain chance when pop >= 0.1', () => {
    render(<DailyOutlook forecast={londonForecast} units="metric" />)

    // Every fixture entry has pop 0.1
    expect(screen.getAllByText('10%').length).toBeGreaterThan(0)
  })

  it('shows the condition icon with its description', () => {
    render(<DailyOutlook forecast={londonForecast} units="metric" />)

    expect(screen.getAllByAltText('broken clouds')).toHaveLength(5)
  })

  it('places each range bar on one scale across all the days', () => {
    const { container } = render(<DailyOutlook forecast={twoDays} units="metric" />)

    // The scale runs from 20° (the coldest) to 35° (the warmest)
    const [first, second] = bars(container)
    expect(first!.style.getPropertyValue('--from')).toBe('0%')
    expect(parseFloat(first!.style.getPropertyValue('--to'))).toBeCloseTo(33.33, 1)
    expect(parseFloat(second!.style.getPropertyValue('--from'))).toBeCloseTo(33.33, 1)
    expect(second!.style.getPropertyValue('--to')).toBe('0%')
  })

  it('uses the same bar positions in either unit', () => {
    const { container } = render(<DailyOutlook forecast={twoDays} units="imperial" />)

    const [first] = bars(container)
    expect(parseFloat(first!.style.getPropertyValue('--to'))).toBeCloseTo(33.33, 1)
  })

  it("marks the current temperature on today's bar and widens today's range", () => {
    const { container } = render(
      <DailyOutlook forecast={twoDays} units="metric" current={18.5} />,
    )

    const [today, tomorrow] = screen.getAllByRole('listitem')
    expect(today).toHaveTextContent('Low 19°')
    // 18.5° is now the coldest reading, at the very left of the scale
    const dot = container.querySelector<HTMLElement>('.range-now')
    expect(dot?.style.left).toBe('0%')
    expect(tomorrow!.querySelector('.range-now')).not.toBeInTheDocument()
  })
})
