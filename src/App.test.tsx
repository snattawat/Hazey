import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import type { WeatherMapProps } from './components/map/WeatherMap'
import { describeRequest, fakeApi, jsonResponse, renderApp } from './test/helpers'

// The real map needs Leaflet. This stand-in shows what App hands the map and
// has a pin (button) per city, like clicking a marker.
vi.mock('./components/map/WeatherMap', () => ({
  default: ({ cities, selectedId, units, padding, onSelect }: WeatherMapProps) => (
    <div
      data-testid="map"
      data-selected={selectedId}
      data-units={units}
      data-padding={JSON.stringify(padding)}
    >
      {cities.map(({ location, weather }) => (
        <button
          key={location.id}
          type="button"
          data-loaded={weather !== null}
          onClick={() => onSelect(location.id)}
        >
          {`Map pin ${location.name}`}
        </button>
      ))}
    </div>
  ),
}))

function topBarCity(name: string) {
  return within(screen.getByRole('group', { name: 'City' })).getByRole('button', {
    name,
  })
}

function unitButton(name: '°C' | '°F') {
  return within(screen.getByRole('group', { name: 'Temperature units' })).getByRole(
    'button',
    { name },
  )
}

function compareCard(name: string) {
  return screen.getByRole('button', { name: `Switch to ${name}` })
}

function hero() {
  return within(screen.getByRole('region', { name: 'Current conditions' }))
}

function appRoot() {
  const root = document.querySelector<HTMLElement>('.app')
  if (!root) throw new Error('No .app element')
  return root
}

function mapProps() {
  const map = screen.getByTestId('map')
  return {
    selectedId: map.dataset.selected,
    units: map.dataset.units,
    padding: JSON.parse(map.dataset.padding ?? 'null'),
  }
}

describe('App', () => {
  let fetchMock: MockInstance<typeof fetch>

  function requests() {
    return fetchMock.mock.calls.map(([input]) => describeRequest(input))
  }

  // Renders the app and waits until both cities have loaded
  async function renderLoaded() {
    const view = await renderApp()
    expect(await screen.findByText('Updated just now')).toBeInTheDocument()
    return view
  }

  beforeEach(() => {
    localStorage.clear()
    vi.stubEnv('VITE_API_KEY', 'test-key')
    fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(fakeApi)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('loading', () => {
    it('loads the weather, forecast and air quality for both cities on mount', async () => {
      await renderLoaded()

      expect(fetchMock).toHaveBeenCalledTimes(6)
      expect(
        requests()
          .map(({ endpoint, cityId }) => `${endpoint} ${cityId}`)
          .sort(),
      ).toEqual([
        'air_pollution bangkok',
        'air_pollution singapore',
        'forecast bangkok',
        'forecast singapore',
        'weather bangkok',
        'weather singapore',
      ])
    })

    it('requests the right URLs', async () => {
      await renderLoaded()

      for (const { url, endpoint } of requests()) {
        expect(url.origin + url.pathname).toBe(
          `https://api.openweathermap.org/data/2.5/${endpoint}`,
        )
        expect(url.searchParams.get('appid')).toBe('test-key')
        if (endpoint !== 'air_pollution') {
          expect(url.searchParams.get('units')).toBe('metric')
        }
      }
      const weatherQueries = requests()
        .filter(({ endpoint }) => endpoint === 'weather')
        .map(({ url }) => url.searchParams.get('q'))
      expect(weatherQueries).toEqual(['Bangkok,TH', 'Singapore,SG'])

      // The forecast uses the coordinates /weather returned for Bangkok
      const forecast = requests().find(
        ({ endpoint, cityId }) => endpoint === 'forecast' && cityId === 'bangkok',
      )
      expect(forecast?.url.searchParams.get('lat')).toBe('13.75')
      expect(forecast?.url.searchParams.get('lon')).toBe('100.5167')
    })

    it('shows placeholders while loading', async () => {
      fetchMock.mockReturnValue(new Promise<Response>(() => {}))
      await renderApp()

      expect(screen.getByRole('status')).toHaveTextContent('Loading weather…')
      // The header is there before any data
      expect(
        screen.getByRole('heading', { level: 2, name: 'Bangkok, Thailand' }),
      ).toBeInTheDocument()
    })

    it('gives the map both cities once they have loaded', async () => {
      await renderLoaded()

      for (const name of ['Bangkok', 'Singapore']) {
        expect(screen.getByRole('button', { name: `Map pin ${name}` })).toHaveAttribute(
          'data-loaded',
          'true',
        )
      }
    })
  })

  describe('choosing a city', () => {
    it('shows Bangkok by default', async () => {
      await renderLoaded()

      expect(
        screen.getByRole('main', { name: 'Bangkok, Thailand' }),
      ).toBeInTheDocument()
      expect(hero().getByText('32°C')).toBeInTheDocument()
      expect(hero().getByText('scattered clouds')).toBeInTheDocument()
      expect(topBarCity('Bangkok')).toHaveAttribute('aria-pressed', 'true')
      expect(topBarCity('Singapore')).toHaveAttribute('aria-pressed', 'false')
      expect(mapProps().selectedId).toBe('bangkok')
    })

    it('shows both current temperatures in the top bar', async () => {
      await renderLoaded()

      expect(topBarCity('Bangkok')).toHaveTextContent('Bangkok32°')
      expect(topBarCity('Singapore')).toHaveTextContent('Singapore30°')
    })

    it('switches to Singapore from the top bar, without fetching again', async () => {
      await renderLoaded()

      await userEvent.click(topBarCity('Singapore'))

      expect(screen.getByRole('main', { name: 'Singapore' })).toBeInTheDocument()
      expect(hero().getByText('30°C')).toBeInTheDocument()
      expect(topBarCity('Singapore')).toHaveAttribute('aria-pressed', 'true')
      expect(topBarCity('Bangkok')).toHaveAttribute('aria-pressed', 'false')
      expect(mapProps().selectedId).toBe('singapore')
      expect(fetchMock).toHaveBeenCalledTimes(6)
    })

    it('switches to Singapore with the compare card', async () => {
      await renderLoaded()
      expect(compareCard('Singapore')).toHaveTextContent(
        'Bangkok is 2° warmer than Singapore',
      )

      await userEvent.click(compareCard('Singapore'))

      expect(screen.getByRole('main', { name: 'Singapore' })).toBeInTheDocument()
      expect(hero().getByText('30°C')).toBeInTheDocument()
      // The card now offers Bangkok, and keeps the keyboard focus
      const card = compareCard('Bangkok, Thailand')
      expect(card).toHaveTextContent('Singapore is 2° cooler than Bangkok')
      expect(card).toHaveFocus()
    })

    it('switches city when a pin is picked on the map', async () => {
      await renderLoaded()

      await userEvent.click(screen.getByRole('button', { name: 'Map pin Singapore' }))

      expect(screen.getByRole('main', { name: 'Singapore' })).toBeInTheDocument()
      expect(topBarCity('Singapore')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('units', () => {
    it('shows °C by default', async () => {
      await renderLoaded()

      expect(unitButton('°C')).toHaveAttribute('aria-pressed', 'true')
      expect(mapProps().units).toBe('metric')
    })

    it('switches every temperature and wind speed to °F and mph', async () => {
      await renderLoaded()

      await userEvent.click(unitButton('°F'))

      expect(unitButton('°F')).toHaveAttribute('aria-pressed', 'true')
      expect(unitButton('°C')).toHaveAttribute('aria-pressed', 'false')
      expect(hero().getByText('90°F')).toBeInTheDocument()
      expect(topBarCity('Bangkok')).toHaveTextContent('Bangkok90°')
      expect(topBarCity('Singapore')).toHaveTextContent('Singapore86°')
      expect(screen.getByText('8 mph')).toBeInTheDocument()
      expect(compareCard('Singapore')).toHaveTextContent('86°F')
      expect(mapProps().units).toBe('imperial')
      // Converted for display only: nothing is fetched again
      expect(fetchMock).toHaveBeenCalledTimes(6)
    })

    it('switches back to °C', async () => {
      await renderLoaded()

      await userEvent.click(unitButton('°F'))
      await userEvent.click(unitButton('°C'))

      expect(hero().getByText('32°C')).toBeInTheDocument()
      expect(screen.getByText('13 km/h')).toBeInTheDocument()
    })
  })

  describe('saved settings', () => {
    it('saves the chosen city and units', async () => {
      await renderLoaded()

      await userEvent.click(topBarCity('Singapore'))
      await userEvent.click(unitButton('°F'))

      expect(localStorage.getItem('selectedCity')).toBe('singapore')
      expect(localStorage.getItem('units')).toBe('imperial')
    })

    it('starts with the saved city and units', async () => {
      localStorage.setItem('selectedCity', 'singapore')
      localStorage.setItem('units', 'imperial')

      await renderLoaded()

      expect(screen.getByRole('main', { name: 'Singapore' })).toBeInTheDocument()
      expect(hero().getByText('86°F')).toBeInTheDocument()
      expect(unitButton('°F')).toHaveAttribute('aria-pressed', 'true')
    })

    it('ignores saved values that are not a known city or unit', async () => {
      localStorage.setItem('selectedCity', 'london')
      localStorage.setItem('units', 'kelvin')

      await renderLoaded()

      expect(
        screen.getByRole('main', { name: 'Bangkok, Thailand' }),
      ).toBeInTheDocument()
      expect(hero().getByText('32°C')).toBeInTheDocument()
    })

    it('still works when storage is unavailable', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      await renderLoaded()
      await userEvent.click(topBarCity('Singapore'))

      expect(screen.getByRole('main', { name: 'Singapore' })).toBeInTheDocument()
    })

    it('no longer keeps a list of recent searches', async () => {
      await renderLoaded()
      await userEvent.click(topBarCity('Singapore'))

      expect(localStorage.getItem('recentCities')).toBeNull()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('failures', () => {
    it('still shows the current weather when the forecast and air quality fail', async () => {
      fetchMock.mockImplementation((input) =>
        describeRequest(input).endpoint === 'weather'
          ? fakeApi(input)
          : Promise.resolve(jsonResponse({ message: 'Server error' }, 500)),
      )
      await renderLoaded()

      expect(hero().getByText('32°C')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      for (const name of ['Next 24 hours', '5-day outlook', 'Air quality']) {
        expect(screen.queryByRole('region', { name })).not.toBeInTheDocument()
      }
    })

    it('shows a "Missing API key" message and never calls fetch without a key', async () => {
      vi.stubEnv('VITE_API_KEY', '')
      await renderApp()

      expect(await screen.findByRole('alert')).toHaveTextContent('Missing API key')
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      await waitFor(() => {
        expect(fetchMock).not.toHaveBeenCalled()
      })
    })

    it('shows an "Invalid API key" message for a 401', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ cod: 401, message: 'Invalid API key.' }, 401),
      )
      await renderApp()

      expect(await screen.findByRole('alert')).toHaveTextContent('Invalid API key')
    })

    it('shows a network error, then loads the weather on "Try again"', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
      await renderApp()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Network error. Check your internet connection.',
      )

      fetchMock.mockImplementation(fakeApi)
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

      expect(await hero().findByText('32°C')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows the other city when only one of them fails', async () => {
      fetchMock.mockImplementation((input) =>
        describeRequest(input).cityId === 'singapore'
          ? Promise.resolve(jsonResponse({ message: 'Server error' }, 500))
          : fakeApi(input),
      )
      await renderLoaded()

      expect(hero().getByText('32°C')).toBeInTheDocument()
      expect(compareCard('Singapore')).toHaveTextContent('Weather unavailable')

      await userEvent.click(compareCard('Singapore'))

      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    })
  })

  describe('refresh', () => {
    it('fetches both cities again from the refresh button', async () => {
      await renderLoaded()

      await userEvent.click(screen.getByRole('button', { name: 'Refresh weather' }))

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(12))
      expect(await screen.findByText('Updated just now')).toBeInTheDocument()
    })

    it('keeps showing the weather while it refreshes', async () => {
      await renderLoaded()
      fetchMock.mockReturnValue(new Promise<Response>(() => {}))

      await userEvent.click(screen.getByRole('button', { name: 'Refresh weather' }))

      expect(screen.getByText('Updating…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Refresh weather' })).toHaveClass(
        'is-spinning',
      )
      expect(hero().getByText('32°C')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Next 24 hours' })).toBeInTheDocument()
    })
  })

  describe('layout', () => {
    // A matchMedia that answers the phone query with `matches`, and can
    // switch later like a resized window
    function stubMatchMedia(matches: boolean) {
      const listeners = new Set<() => void>()
      const state = { matches }
      vi.stubGlobal('matchMedia', (query: string) => ({
        get matches() {
          return state.matches
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) =>
          listeners.delete(listener),
      }))
      return (next: boolean) => {
        state.matches = next
        act(() => listeners.forEach((listener) => listener()))
      }
    }

    it('uses the desktop layout when matchMedia is missing (as in jsdom)', async () => {
      await renderLoaded()

      expect(appRoot()).toHaveClass('app--desktop')
      expect(appRoot().style.getPropertyValue('--overlay-top')).toBe('0px')
      expect(appRoot().style.getPropertyValue('--overlay-bottom')).toBe('0px')
      expect(mapProps().padding).toEqual({ top: 16, right: 80, bottom: 16, left: 432 })
      expect(screen.queryByRole('button', { name: 'Show details' })).not.toBeInTheDocument()
    })

    it('uses the desktop layout from 900px', async () => {
      stubMatchMedia(false)
      await renderLoaded()

      expect(appRoot()).toHaveClass('app--desktop')
    })

    it('turns the panel into a bottom sheet on phones', async () => {
      stubMatchMedia(true)
      await renderLoaded()

      expect(appRoot()).toHaveClass('app--phone')
      expect(appRoot().style.getPropertyValue('--overlay-top')).toBe('84px')
      expect(appRoot().style.getPropertyValue('--overlay-bottom')).toBe('200px')
      expect(mapProps().padding).toEqual({ top: 84, right: 64, bottom: 200, left: 16 })

      const handle = screen.getByRole('button', { name: 'Show details' })
      expect(handle).toHaveAttribute('aria-expanded', 'false')
      // The collapsed sheet still shows the city and the hero
      expect(hero().getByText('32°C')).toBeInTheDocument()
    })

    it('expands and collapses the sheet with its handle', async () => {
      stubMatchMedia(true)
      await renderLoaded()

      await userEvent.click(screen.getByRole('button', { name: 'Show details' }))

      expect(
        screen.getByRole('button', { name: 'Hide details' }),
      ).toHaveAttribute('aria-expanded', 'true')
      // 78% of jsdom's 768px window
      expect(appRoot().style.getPropertyValue('--overlay-bottom')).toBe('599px')
      expect(mapProps().padding.bottom).toBe(599)

      await userEvent.click(screen.getByRole('button', { name: 'Hide details' }))

      expect(appRoot().style.getPropertyValue('--overlay-bottom')).toBe('200px')
    })

    it('marks the root while the sheet is expanded, so the map tools can hide', async () => {
      stubMatchMedia(true)
      await renderLoaded()
      expect(appRoot()).not.toHaveClass('app--sheet-expanded')

      await userEvent.click(screen.getByRole('button', { name: 'Show details' }))

      expect(appRoot()).toHaveClass('app--phone', 'app--sheet-expanded')

      await userEvent.click(screen.getByRole('button', { name: 'Hide details' }))

      expect(appRoot()).toHaveClass('app--phone')
      expect(appRoot()).not.toHaveClass('app--sheet-expanded')
    })

    it('drops the expanded mark when the window grows past the breakpoint', async () => {
      const setPhone = stubMatchMedia(true)
      await renderLoaded()
      await userEvent.click(screen.getByRole('button', { name: 'Show details' }))

      setPhone(false)

      expect(appRoot()).toHaveClass('app--desktop')
      expect(appRoot()).not.toHaveClass('app--sheet-expanded')
    })

    it('follows the window across the breakpoint', async () => {
      const setPhone = stubMatchMedia(false)
      await renderLoaded()

      setPhone(true)
      expect(appRoot()).toHaveClass('app--phone')
      expect(screen.getByRole('button', { name: 'Show details' })).toBeInTheDocument()

      setPhone(false)
      expect(appRoot()).toHaveClass('app--desktop')
    })
  })
})
