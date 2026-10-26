import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAP_LOCATIONS } from '../../data/locations'
import {
  OBSERVED_AT,
  bangkok,
  bangkokAir,
  bangkokForecast,
  forecastEntry,
  singapore,
  singaporeAir,
  singaporeForecast,
} from '../../test/fixtures'
import type { AirQualityData, ForecastData, WeatherData } from '../../api/types'
import type { CityWeather } from '../../hooks/useCityWeather'
import CityPanel from './CityPanel'

const [bangkokPlace, singaporePlace] = MAP_LOCATIONS as [
  (typeof MAP_LOCATIONS)[number],
  (typeof MAP_LOCATIONS)[number],
]
const NOW = OBSERVED_AT * 1000

function ready(
  weather: WeatherData,
  forecast: ForecastData | null = null,
  air: AirQualityData | null = null,
): CityWeather {
  return { status: 'ready', weather, forecast, air, error: null }
}

const loading: CityWeather = {
  status: 'loading',
  weather: null,
  forecast: null,
  air: null,
  error: null,
}

const bangkokReady = ready(bangkok, bangkokForecast, bangkokAir)
const singaporeReady = ready(singapore, singaporeForecast, singaporeAir)

function setup(props: Partial<ComponentProps<typeof CityPanel>> = {}) {
  const onRefresh = vi.fn()
  const onSelect = vi.fn()
  const view = render(
    <CityPanel
      location={bangkokPlace}
      city={bangkokReady}
      other={{ location: singaporePlace, city: singaporeReady }}
      units="metric"
      refreshing={false}
      lastUpdated={NOW}
      onRefresh={onRefresh}
      onSelect={onSelect}
      sheet={null}
      {...props}
    />,
  )
  return { ...view, onRefresh, onSelect }
}

// The value of a stat tile, found by its label
function stat(label: string) {
  const tile = screen.getByText(label, { selector: 'dt' }).closest('.stat')
  if (!(tile instanceof HTMLElement)) throw new Error(`No "${label}" tile`)
  return tile.querySelector('dd')
}

// The compare card: a button named for the city it switches to
function compareCard(name: string) {
  return screen.getByRole('button', { name: `Switch to ${name}` })
}

describe('CityPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 21 Oct 2026, 05:30 UTC: 12:30 PM in Bangkok
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('header', () => {
    it('is the main landmark, named by the city heading', () => {
      setup()

      expect(
        screen.getByRole('main', { name: 'Bangkok, Thailand' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 2, name: 'Bangkok, Thailand' }),
      ).toBeInTheDocument()
    })

    it("shows the city's local time and date", () => {
      setup()

      const clock = screen.getByText('12:30 PM')
      expect(clock.tagName).toBe('TIME')
      expect(clock.parentElement).toHaveTextContent(
        'Local time 12:30 PM · Wednesday, Oct 21',
      )
    })

    it('uses the time zone of the city shown', () => {
      setup({ location: singaporePlace, city: singaporeReady })

      expect(screen.getByText('1:30 PM')).toBeInTheDocument()
    })

    it('moves the clock on every minute', () => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      vi.setSystemTime(NOW)
      setup()

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(screen.getByText('12:31 PM')).toBeInTheDocument()
    })

    it('says how long ago the weather was updated', () => {
      setup({ lastUpdated: NOW - 5 * 60_000 })

      expect(screen.getByText('Updated 5 min ago')).toBeInTheDocument()
    })

    it('says "Updating…" during a refresh and spins the refresh icon', () => {
      setup({ refreshing: true })

      expect(screen.getByText('Updating…')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Refresh weather' }),
      ).toHaveClass('is-spinning')
    })

    it('calls onRefresh from the refresh button', async () => {
      vi.useRealTimers()
      const { onRefresh } = setup()

      const button = screen.getByRole('button', { name: 'Refresh weather' })
      expect(button).not.toHaveClass('is-spinning')
      await userEvent.click(button)

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('current weather', () => {
    it('shows the hero with the temperature and condition', () => {
      setup()

      const hero = within(screen.getByRole('region', { name: 'Current conditions' }))
      expect(hero.getByText('32°C')).toBeInTheDocument()
      expect(hero.getByText('scattered clouds')).toBeInTheDocument()
      // Today's range from the forecast plus the current reading
      expect(hero.getByText('High').nextElementSibling).toHaveTextContent('33°')
      expect(hero.getByText('Low').nextElementSibling).toHaveTextContent('28°')
    })

    it('shows the stat tiles', () => {
      setup()

      expect(stat('Humidity')).toHaveTextContent('62%')
      expect(stat('Wind')).toHaveTextContent('13 km/h')
      expect(stat('Wind')).toHaveTextContent('from SW')
      expect(stat('Pressure')).toHaveTextContent('1008 hPa')
      expect(stat('Visibility')).toHaveTextContent('10 km')
      expect(stat('Cloud cover')).toHaveTextContent('40%')
    })

    it('shows sunrise and sunset in the city time', () => {
      setup()

      expect(stat('Sunrise')).toHaveTextContent('6:12 AM')
      expect(stat('Sunrise')).toHaveTextContent('Sunset 5:57 PM')
    })

    it('points the wind arrow where the wind blows to', () => {
      setup()

      // A wind from 220° (south-west) blows towards 40° (north-east)
      const arrow = stat('Wind')!.querySelector<SVGElement>('.wind-arrow')
      expect(arrow?.style.transform).toBe('rotate(40deg)')
    })

    it('shows gusts and visibility below 10 km with a decimal', () => {
      setup({ location: singaporePlace, city: singaporeReady, other: null })

      // 4.6 m/s from 150°, gusting 7.2 m/s; 9000 m visibility
      expect(stat('Wind')).toHaveTextContent('17 km/h')
      expect(stat('Wind')).toHaveTextContent('from SE · gusts 26 km/h')
      expect(stat('Visibility')).toHaveTextContent('9.0 km')
    })

    it('shows a dash when the station reports no visibility', () => {
      setup({ city: ready({ ...bangkok, visibility: undefined }) })

      expect(stat('Visibility')).toHaveTextContent('—')
    })

    it('shows wind in mph for imperial units', () => {
      setup({ units: 'imperial' })

      expect(stat('Wind')).toHaveTextContent('8 mph')
      expect(screen.getByText('90°F')).toBeInTheDocument()
    })

    it('shows the hourly, 5-day and air quality sections', () => {
      setup()

      for (const name of ['Next 24 hours', '5-day outlook', 'Air quality']) {
        expect(screen.getByRole('region', { name })).toBeInTheDocument()
      }
    })

    it('leaves out the sections whose data did not load', () => {
      setup({ city: ready(bangkok) })

      expect(screen.getByText('32°C')).toBeInTheDocument()
      for (const name of ['Next 24 hours', '5-day outlook', 'Air quality']) {
        expect(screen.queryByRole('region', { name })).not.toBeInTheDocument()
      }
    })

    it('shows a weather alert banner above the hero', () => {
      const stormy: ForecastData = {
        ...bangkokForecast,
        list: [
          forecastEntry(0, {
            dt: bangkokForecast.list[0]!.dt,
            weather: [
              { id: 211, main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' },
            ],
          }),
          ...bangkokForecast.list.slice(1),
        ],
      }
      setup({ city: ready(bangkok, stormy) })

      const banner = screen.getByRole('status')
      expect(banner).toHaveTextContent('Thunderstorm warning')
      const hero = screen.getByRole('region', { name: 'Current conditions' })
      expect(
        banner.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })

    it('keeps showing the data when a refresh failed, with a note', () => {
      setup({
        city: { ...bangkokReady, error: 'Network error. Check your internet connection.' },
      })

      expect(screen.getByText('32°C')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(
        "Couldn't refresh: Network error. Check your internet connection.",
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('compare card', () => {
    it('shows the other city and how the two compare', () => {
      setup()

      const card = compareCard('Singapore')
      expect(card).toHaveTextContent('Singapore')
      expect(card).toHaveTextContent('30°C')
      expect(card).toHaveTextContent('broken clouds')
      expect(card).toHaveTextContent('Bangkok is 2° warmer than Singapore')
      // Screen readers hear the weather as the button's description
      expect(card).toHaveAccessibleDescription(
        '30°C, broken clouds. Bangkok is 2° warmer than Singapore',
      )
    })

    it('says "cooler" from the colder city', () => {
      setup({
        location: singaporePlace,
        city: singaporeReady,
        other: { location: bangkokPlace, city: bangkokReady },
      })

      expect(
        compareCard('Bangkok, Thailand'),
      ).toHaveTextContent('Singapore is 2° cooler than Bangkok')
    })

    it('compares in the units on screen', () => {
      setup({ units: 'imperial' })

      // 90°F against 86°F
      expect(
        compareCard('Singapore'),
      ).toHaveTextContent('Bangkok is 4° warmer than Singapore')
    })

    it('says when both cities are the same temperature', () => {
      setup({
        other: {
          location: singaporePlace,
          city: ready({ ...singapore, main: { ...singapore.main, temp: 32.2 } }),
        },
      })

      expect(
        compareCard('Singapore'),
      ).toHaveTextContent('Bangkok and Singapore are the same temperature')
    })

    it('selects the other city when clicked', async () => {
      vi.useRealTimers()
      const { onSelect } = setup()

      await userEvent.click(compareCard('Singapore'))

      expect(onSelect).toHaveBeenCalledExactlyOnceWith('singapore')
    })

    it('can still be clicked while the other city is unavailable', () => {
      setup({
        other: {
          location: singaporePlace,
          city: { ...loading, status: 'error', error: 'Network error.' },
        },
      })

      expect(
        compareCard('Singapore'),
      ).toHaveTextContent('Weather unavailable')
    })
  })

  describe('loading and errors', () => {
    it('shows skeleton placeholders while loading', () => {
      const { container } = setup({ city: loading, lastUpdated: null })

      expect(screen.getByRole('status')).toHaveTextContent('Loading weather…')
      expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0)
      expect(
        screen.queryByRole('region', { name: 'Current conditions' }),
      ).not.toBeInTheDocument()
      // The header is there straight away
      expect(screen.getByRole('heading', { name: 'Bangkok, Thailand' })).toBeInTheDocument()
    })

    it('shows an error card with a "Try again" button', async () => {
      vi.useRealTimers()
      const { onRefresh } = setup({
        city: { ...loading, status: 'error', error: 'Invalid API key.' },
      })

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid API key.')
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('as a bottom sheet', () => {
    it('has a handle that shows the details', async () => {
      vi.useRealTimers()
      const onToggle = vi.fn()
      setup({ sheet: { expanded: false, onToggle } })

      const handle = screen.getByRole('button', { name: 'Show details' })
      expect(handle).toHaveAttribute('aria-expanded', 'false')
      await userEvent.click(handle)

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('keeps the hidden details out of reach while collapsed', () => {
      const { container } = setup({ sheet: { expanded: false, onToggle: vi.fn() } })

      expect(container.querySelector('.city-details')).toHaveAttribute('inert')
      // The summary (the city and the hero) stays visible
      expect(screen.getByText('32°C')).toBeInTheDocument()
    })

    it('says "Hide details" when expanded', () => {
      const { container } = setup({ sheet: { expanded: true, onToggle: vi.fn() } })

      expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      expect(container.querySelector('.city-details')).not.toHaveAttribute('inert')
    })

    it('has no handle on desktop', () => {
      setup()

      expect(
        screen.queryByRole('button', { name: /details/ }),
      ).not.toBeInTheDocument()
    })
  })
})
