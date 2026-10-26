import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { forecastEntry, londonForecast } from '../../test/fixtures'
import type { ForecastData, ForecastEntry } from '../../api/types'
import WeatherAlert from './WeatherAlert'

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

const stormy = forecastWith({
  0: {
    weather: [
      {
        id: 211,
        main: 'Thunderstorm',
        description: 'thunderstorm',
        icon: '11d',
      },
    ],
  },
})

const rainy = forecastWith({ 2: { rain: { '3h': 12 } } })

describe('WeatherAlert', () => {
  it('shows a thunderstorm warning with the local hour', () => {
    render(<WeatherAlert forecast={stormy} />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('weather-alert', 'weather-alert--thunderstorm')
    expect(screen.getByText('Thunderstorm warning').tagName).toBe('STRONG')
    expect(banner).toHaveTextContent('Thunderstorms expected around 1 AM.')
  })

  it('shows a heavy rain warning', () => {
    render(<WeatherAlert forecast={rainy} />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveClass('weather-alert', 'weather-alert--heavy-rain')
    expect(screen.getByText('Heavy rain warning').tagName).toBe('STRONG')
    expect(banner).toHaveTextContent('Heavy rain expected around 7 AM.')
  })

  it('says the warning is based on the forecast, not an official source', () => {
    render(<WeatherAlert forecast={stormy} />)

    expect(
      screen.getByText('Based on the forecast for the next 12 hours.'),
    ).toBeInTheDocument()
  })

  it('is a status message, not an error alert', () => {
    render(<WeatherAlert forecast={stormy} />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders nothing for the dry forecast', () => {
    const { container } = render(<WeatherAlert forecast={londonForecast} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the rain is more than 12 hours away', () => {
    const later = forecastWith({ 4: { rain: { '3h': 25 } } })
    const { container } = render(<WeatherAlert forecast={later} />)

    expect(container).toBeEmptyDOMElement()
  })
})
