import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAP_LOCATIONS } from '../../../src/data/locations'
import type { WeatherData } from '../../../src/api/types'
import WeatherMap from '../../../src/components/map/WeatherMap'

const [bangkok, singapore] = MAP_LOCATIONS

function weatherFor(name: string, temp: number, description: string): WeatherData {
  return {
    name,
    coord: { lat: 0, lon: 0 },
    dt: 0,
    timezone: 0,
    sys: { country: 'XX', sunrise: 0, sunset: 0 },
    main: {
      temp,
      feels_like: temp,
      temp_min: temp - 1,
      temp_max: temp + 1,
      pressure: 1010,
      humidity: 60,
    },
    clouds: { all: 20 },
    weather: [{ id: 500, main: 'Rain', description, icon: '10d' }],
    wind: { speed: 3, deg: 180 },
  }
}

const defaultCities = [
  { location: bangkok!, weather: weatherFor('Bangkok', 31, 'light rain') },
  { location: singapore!, weather: weatherFor('Singapore', 29, 'few clouds') },
]

function setup(props: Partial<ComponentProps<typeof WeatherMap>> = {}) {
  const onSelect = vi.fn()
  const view = render(
    <WeatherMap
      cities={defaultCities}
      selectedId="bangkok"
      units="metric"
      onSelect={onSelect}
      padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      {...props}
    />,
  )
  return { onSelect, view }
}

beforeEach(() => {
  vi.stubEnv('VITE_API_KEY', 'test-key')
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  localStorage.clear()
})

describe('WeatherMap', () => {
  it('renders a marker for each city with its name and temperature', () => {
    setup()

    const markers = document.querySelectorAll('.city-marker')
    expect(markers).toHaveLength(2)

    const text = [...markers].map((marker) => marker.textContent)
    expect(text.some((t) => t?.includes('Bangkok') && t.includes('31°'))).toBe(
      true,
    )
    expect(
      text.some((t) => t?.includes('Singapore') && t.includes('29°')),
    ).toBe(true)
  })

  it('shows Fahrenheit temperatures with imperial units', () => {
    setup({ units: 'imperial' })

    const text = [...document.querySelectorAll('.city-marker')].map(
      (marker) => marker.textContent,
    )
    // 31°C -> 88°F, 29°C -> 84°F
    expect(text.some((t) => t?.includes('88°'))).toBe(true)
    expect(text.some((t) => t?.includes('84°'))).toBe(true)
  })

  it('calls onSelect with the city id when a marker is clicked', () => {
    const { onSelect } = setup()

    const singaporePill = [...document.querySelectorAll('.city-marker')].find(
      (marker) => marker.textContent?.includes('Singapore'),
    )
    expect(singaporePill).toBeTruthy()
    // Clicking the divIcon's clickable Leaflet marker element.
    fireEvent.click(singaporePill!.closest('.leaflet-marker-icon')!)

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('singapore')
  })

  it('shows a loading placeholder while a city has no weather', () => {
    setup({
      cities: [
        { location: bangkok!, weather: null },
        { location: singapore!, weather: weatherFor('Singapore', 29, 'few clouds') },
      ],
    })

    const loading = document.querySelector('.city-marker--loading')
    expect(loading).toBeTruthy()
    expect(loading?.textContent).toContain('Bangkok')
  })

  it('offers the map tool buttons with accessible labels', () => {
    setup()

    for (const label of [
      'Zoom in',
      'Zoom out',
      'Show both cities',
      'Center on selected city',
      'Map layers',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('opens the layers panel and adds the rain overlay tile layer', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'Rain' }))

    const overlayTile = [...document.querySelectorAll('img.leaflet-tile')].find(
      (img) =>
        img
          .getAttribute('src')
          ?.includes('tile.openweathermap.org/map/precipitation_new'),
    )
    expect(overlayTile).toBeTruthy()
    expect(overlayTile?.getAttribute('src')).toContain('appid=test-key')
  })

  it('shows the legend inside the bottom-right corner for the active overlay', async () => {
    const user = userEvent.setup()
    setup()

    expect(screen.queryByRole('img', { name: /legend/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'Rain' }),
    )

    const legend = screen.getByRole('img', { name: 'Rain legend' })
    expect(legend).toBeInTheDocument()
    // Rendered inside Leaflet's bottom-right control corner so it stacks above
    // the scale bar and attribution.
    expect(legend.closest('.leaflet-bottom.leaflet-right')).not.toBeNull()

    // Turning the overlay off removes the legend again.
    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'None' }),
    )
    expect(
      screen.queryByRole('img', { name: /legend/i }),
    ).not.toBeInTheDocument()
  })

  it('disables the weather overlays when no API key is set', async () => {
    vi.stubEnv('VITE_API_KEY', '')
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('radio', { name: 'Rain' })).toBeDisabled()
    expect(
      within(dialog).getByText('Add VITE_API_KEY to enable weather overlays.'),
    ).toBeInTheDocument()
  })

  it('does not persist a base map when the user made no explicit choice', () => {
    setup()

    // Rendering alone must not pin the base map; the viewer keeps following
    // their light/dark preference until they pick one.
    expect(localStorage.getItem('mapBase')).toBeNull()
  })

  it('persists the base map choice to localStorage', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'Satellite' }),
    )

    expect(localStorage.getItem('mapBase')).toBe('satellite')
  })

  it('renders a place-name labels layer for the Light base map', async () => {
    const user = userEvent.setup()
    setup()

    // Light is the default base map, so its reference (labels) tiles appear
    // inside the dedicated labels pane.
    const pane = document.querySelector('.leaflet-labels-pane')
    expect(pane).toBeTruthy()
    const labelTile = pane!.querySelector('img.leaflet-tile')
    expect(labelTile?.getAttribute('src')).toContain(
      'World_Light_Gray_Reference',
    )

    // Switching to Dark swaps in the dark reference tiles.
    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'Dark' }),
    )

    const darkTile = document
      .querySelector('.leaflet-labels-pane')!
      .querySelector('img.leaflet-tile')
    expect(darkTile?.getAttribute('src')).toContain('World_Dark_Gray_Reference')
  })

  it('renders no labels layer for Streets or Satellite', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'Streets' }),
    )
    expect(document.querySelector('.leaflet-labels-pane')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'Satellite' }),
    )
    expect(document.querySelector('.leaflet-labels-pane')).toBeNull()
  })

  it('lists four base maps in the layers panel', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    const dialog = screen.getByRole('dialog')
    for (const name of ['Light', 'Dark', 'Streets', 'Satellite']) {
      expect(within(dialog).getByRole('radio', { name })).toBeInTheDocument()
    }
    expect(
      within(dialog).getAllByRole('radio', { name: /Light|Dark|Streets|Satellite/ }),
    ).toHaveLength(4)
  })

  // --- Overlay opacity (regression: used to default to 0 and draw invisible) ---

  // Finds the Leaflet layer container that holds the OWM overlay tiles and
  // reads its applied opacity.
  function overlayOpacity() {
    const tile = [...document.querySelectorAll('img.leaflet-tile')].find((img) =>
      img.getAttribute('src')?.includes('tile.openweathermap.org/map/'),
    )
    const layer = tile?.closest('.leaflet-layer') as HTMLElement | undefined
    return layer?.style.opacity
  }

  async function turnOnRain(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Map layers' }))
    await user.click(
      within(screen.getByRole('dialog')).getByRole('radio', { name: 'Rain' }),
    )
  }

  it('defaults the overlay opacity to 0.7 with empty localStorage', async () => {
    const user = userEvent.setup()
    setup()

    await turnOnRain(user)

    const slider = screen.getByLabelText('Overlay opacity') as HTMLInputElement
    expect(slider.value).toBe('0.7')
    expect(overlayOpacity()).toBe('0.7')
  })

  it('respects a stored opacity of 0.4', async () => {
    localStorage.setItem('mapOverlayOpacity', '0.4')
    const user = userEvent.setup()
    setup()

    await turnOnRain(user)

    const slider = screen.getByLabelText('Overlay opacity') as HTMLInputElement
    expect(slider.value).toBe('0.4')
    expect(overlayOpacity()).toBe('0.4')
  })

  it.each(['abc', ''])(
    'falls back to 0.7 when the stored opacity is garbage (%j)',
    async (stored) => {
      localStorage.setItem('mapOverlayOpacity', stored)
      const user = userEvent.setup()
      setup()

      await turnOnRain(user)

      const slider = screen.getByLabelText('Overlay opacity') as HTMLInputElement
      expect(slider.value).toBe('0.7')
    },
  )

  it('clamps a stored opacity of 0 up to the 0.2 minimum', async () => {
    localStorage.setItem('mapOverlayOpacity', '0')
    const user = userEvent.setup()
    setup()

    await turnOnRain(user)

    const slider = screen.getByLabelText('Overlay opacity') as HTMLInputElement
    expect(slider.value).toBe('0.2')
    expect(slider.min).toBe('0.2')
    expect(overlayOpacity()).toBe('0.2')
  })

  it('closes the layers panel on Escape and restores focus to the button', async () => {
    const user = userEvent.setup()
    setup()

    const toggle = screen.getByRole('button', { name: 'Map layers' })
    await user.click(toggle)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toggle).toHaveFocus()
  })
})
