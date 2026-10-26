import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { forecastEntry, londonForecast } from '../../support/fixtures'
import type { ForecastData } from '../../../src/api/types'
import HourlyForecast from '../../../src/components/panel/HourlyForecast'

describe('HourlyForecast', () => {
  it('is a "Next 24 hours" section', () => {
    render(<HourlyForecast forecast={londonForecast} units="metric" />)

    expect(
      screen.getByRole('region', { name: 'Next 24 hours' }),
    ).toBeInTheDocument()
  })

  it('shows exactly 8 steps (the next 24 hours)', () => {
    render(<HourlyForecast forecast={londonForecast} units="metric" />)

    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('starts at 1 AM London local time', () => {
    render(<HourlyForecast forecast={londonForecast} units="metric" />)

    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('1 AM')
  })

  it('shows the rounded temperatures', () => {
    render(<HourlyForecast forecast={londonForecast} units="metric" />)

    // Entry 0 temp is 10, entry 7 is 17
    expect(screen.getByText('10°')).toBeInTheDocument()
    expect(screen.getByText('17°')).toBeInTheDocument()
  })

  it('shows the temperatures in Fahrenheit', () => {
    render(<HourlyForecast forecast={londonForecast} units="imperial" />)

    // 10°C and 17°C
    expect(screen.getByText('50°')).toBeInTheDocument()
    expect(screen.getByText('63°')).toBeInTheDocument()
    expect(screen.queryByText('10°')).not.toBeInTheDocument()
  })

  it('shows the icon with its description as alt text', () => {
    render(<HourlyForecast forecast={londonForecast} units="metric" />)

    const icons = screen.getAllByAltText('broken clouds')
    expect(icons[0]).toHaveAttribute(
      'src',
      'https://openweathermap.org/img/wn/04d@2x.png',
    )
  })

  it('shows the rain chance only when pop >= 0.1', () => {
    const forecast: ForecastData = {
      ...londonForecast,
      list: [
        forecastEntry(0, { pop: 0.4 }),
        forecastEntry(1, { pop: 0 }),
        ...Array.from({ length: 6 }, (_, i) => forecastEntry(i + 2, { pop: 0 })),
      ],
    }
    render(<HourlyForecast forecast={forecast} units="metric" />)

    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
    // Screen readers hear what the number means
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(
      '40% chance of rain',
    )
  })
})
