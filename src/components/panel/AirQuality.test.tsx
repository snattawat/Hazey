import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { describeAqi } from '../../utils/airQuality'
import { londonAir } from '../../test/fixtures'
import type { AirQualityData } from '../../api/types'
import AirQuality from './AirQuality'

type Aqi = AirQualityData['list'][number]['main']['aqi']

const LEVELS: Array<{ aqi: Aqi; label: string }> = [
  { aqi: 1, label: 'Good' },
  { aqi: 2, label: 'Fair' },
  { aqi: 3, label: 'Moderate' },
  { aqi: 4, label: 'Poor' },
  { aqi: 5, label: 'Very Poor' },
]

// londonAir with a different index and/or PM readings
function airWith(
  aqi: Aqi,
  components: Partial<AirQualityData['list'][number]['components']> = {},
): AirQualityData {
  const [reading] = londonAir.list
  return {
    list: [
      {
        ...reading,
        main: { aqi },
        components: { ...reading.components, ...components },
      },
    ],
  }
}

// The value shown next to a "PM2.5" / "PM10" label
function valueOf(label: string) {
  return screen.getByText(label).nextElementSibling
}

describe('AirQuality', () => {
  it('is a labelled section with an "Air quality" heading', () => {
    render(<AirQuality data={londonAir} />)

    expect(screen.getByRole('region', { name: 'Air quality' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Air quality' }),
    ).toBeInTheDocument()
  })

  it.each(LEVELS)('shows level $aqi as "$label" with advice', ({ aqi, label }) => {
    render(<AirQuality data={airWith(aqi)} />)

    expect(screen.getByText(String(aqi))).toBeInTheDocument()
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(describeAqi(aqi).advice)).toBeInTheDocument()
  })

  it.each(LEVELS)('colour-codes level $aqi with its own badge style', ({ aqi, label }) => {
    render(<AirQuality data={airWith(aqi)} />)

    const badge = screen.getByText(label).parentElement
    expect(badge).toHaveClass('aqi-badge', `aqi-badge--${aqi}`)
    // The level is spelled out in text, not only shown by colour
    expect(badge).toHaveTextContent(`${aqi}${label}`)
  })

  it('shows PM2.5 and PM10 in μg/m³ with one decimal', () => {
    render(<AirQuality data={londonAir} />)

    expect(valueOf('PM2.5')).toHaveTextContent('8.4 μg/m³')
    expect(valueOf('PM10')).toHaveTextContent('14.2 μg/m³')
  })

  it('rounds to one decimal and keeps a trailing zero', () => {
    render(<AirQuality data={airWith(3, { pm2_5: 12.34, pm10: 20 })} />)

    expect(valueOf('PM2.5')).toHaveTextContent('12.3 μg/m³')
    expect(valueOf('PM10')).toHaveTextContent('20.0 μg/m³')
  })

  it('explains the index scale and does not call it PSI', () => {
    render(<AirQuality data={londonAir} />)

    expect(
      screen.getByText('OpenWeatherMap air quality index (1–5)'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/PSI/)).not.toBeInTheDocument()
  })

  it('renders nothing when there is no reading', () => {
    const { container } = render(<AirQuality data={{ list: [] }} />)

    expect(container).toBeEmptyDOMElement()
  })
})
