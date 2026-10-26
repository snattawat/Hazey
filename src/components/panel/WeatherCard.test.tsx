import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { bangkok } from '../../test/fixtures'
import WeatherCard from './WeatherCard'

const range = { min: 27.9, max: 33.1 }

// The value shown next to a "Feels like" / "High" / "Low" label
function valueOf(label: string) {
  return screen.getByText(label).nextElementSibling
}

describe('WeatherCard', () => {
  it('is a "Current conditions" section', () => {
    render(<WeatherCard data={bangkok} units="metric" range={range} />)

    expect(
      screen.getByRole('region', { name: 'Current conditions' }),
    ).toBeInTheDocument()
  })

  it('shows the rounded temperature, feels-like and description', () => {
    render(<WeatherCard data={bangkok} units="metric" range={range} />)

    expect(screen.getByText('32°C')).toBeInTheDocument()
    expect(valueOf('Feels like')).toHaveTextContent('38°C')
    expect(screen.getByText('scattered clouds')).toBeInTheDocument()
  })

  it("shows today's high and low", () => {
    render(<WeatherCard data={bangkok} units="metric" range={range} />)

    expect(valueOf('High')).toHaveTextContent('33°')
    expect(valueOf('Low')).toHaveTextContent('28°')
  })

  it('converts every temperature to Fahrenheit', () => {
    render(<WeatherCard data={bangkok} units="imperial" range={range} />)

    // 32.4°C, 38.1°C, 33.1°C and 27.9°C
    expect(screen.getByText('90°F')).toBeInTheDocument()
    expect(valueOf('Feels like')).toHaveTextContent('101°F')
    expect(valueOf('High')).toHaveTextContent('92°')
    expect(valueOf('Low')).toHaveTextContent('82°')
  })

  it('shows the large weather icon from OpenWeatherMap', () => {
    const { container } = render(
      <WeatherCard data={bangkok} units="metric" range={range} />,
    )

    // The icon is decorative (alt=""), so it has no "img" role to query by.
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://openweathermap.org/img/wn/03d@4x.png',
    )
  })

  it('omits the icon and description when there is no weather condition', () => {
    const { container } = render(
      <WeatherCard data={{ ...bangkok, weather: [] }} units="metric" range={range} />,
    )

    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(screen.queryByText('scattered clouds')).not.toBeInTheDocument()
    expect(screen.getByText('32°C')).toBeInTheDocument()
  })
})
