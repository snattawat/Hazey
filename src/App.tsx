import { useMemo, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import CityPanel from './components/panel/CityPanel'
import TopBar from './components/TopBar'
import WeatherMap from './components/map/WeatherMap'
import type { MapCity, MapPadding } from './components/map/WeatherMap'
import { MAP_LOCATIONS } from './data/locations'
import type { Units } from './utils/units'
import useCityWeather from './hooks/useCityWeather'
import './App.css'

const CITY_KEY = 'selectedCity'
const UNITS_KEY = 'units'
const CITY_IDS = MAP_LOCATIONS.map(({ id }) => id)
const UNIT_VALUES: Units[] = ['metric', 'imperial']

// Below 900px the panel turns into a bottom sheet
const PHONE_QUERY = '(max-width: 899.98px)'
// Phone top bar: 12px margin + about 60px bar + 12px gap above the map tools
const PHONE_TOP = 84
const SHEET_COLLAPSED = 200

// Map area hidden behind the floating UI, so the map keeps cities in view
const DESKTOP_PADDING: MapPadding = { top: 16, right: 80, bottom: 16, left: 432 }

// A saved setting, if it is still one of the allowed values. Storage can be
// missing (private mode), full or edited by hand, so nothing is trusted.
function readSetting<T extends string>(key: string, allowed: T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return allowed.find((option) => option === value) ?? fallback
  } catch {
    return fallback
  }
}

function saveSetting(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures (e.g. private mode, quota)
  }
}

function subscribeToLayout(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

// jsdom (the tests) has no matchMedia: treat that as desktop
function isPhoneLayout() {
  return typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
}

function subscribeToResize(onChange: () => void) {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function viewportHeight() {
  return window.innerHeight
}

// About 78svh, but never so tall that it slides under the top bar
function expandedSheetHeight(viewport: number) {
  return Math.max(
    SHEET_COLLAPSED,
    Math.min(Math.round(viewport * 0.78), viewport - PHONE_TOP - 8),
  )
}

function App() {
  const { cities, refresh, refreshing, lastUpdated } = useCityWeather()
  const [selectedId, setSelectedId] = useState(() =>
    readSetting(CITY_KEY, CITY_IDS, 'bangkok'),
  )
  const [units, setUnits] = useState<Units>(() =>
    readSetting(UNITS_KEY, UNIT_VALUES, 'metric'),
  )
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const isPhone = useSyncExternalStore(subscribeToLayout, isPhoneLayout)
  const viewport = useSyncExternalStore(subscribeToResize, viewportHeight)

  function selectCity(id: string) {
    setSelectedId(id)
    saveSetting(CITY_KEY, id)
  }

  function changeUnits(next: Units) {
    setUnits(next)
    saveSetting(UNITS_KEY, next)
  }

  const location =
    MAP_LOCATIONS.find(({ id }) => id === selectedId) ?? MAP_LOCATIONS[0]!
  const otherLocation = MAP_LOCATIONS.find(({ id }) => id !== location.id)

  const mapCities = useMemo<MapCity[]>(
    () =>
      MAP_LOCATIONS.map((place) => ({
        location: place,
        weather: cities[place.id]?.weather ?? null,
      })),
    [cities],
  )

  const sheetHeight = isPhone
    ? sheetExpanded
      ? expandedSheetHeight(viewport)
      : SHEET_COLLAPSED
    : 0

  // A new object only when the numbers change, so the map doesn't refit
  // on every render
  const padding = useMemo<MapPadding>(
    () =>
      isPhone
        ? { top: PHONE_TOP, right: 64, bottom: sheetHeight, left: 16 }
        : DESKTOP_PADDING,
    [isPhone, sheetHeight],
  )

  // Map overlays (tools, legend, scale) read these to stay clear of the UI
  const overlay = {
    '--overlay-top': `${isPhone ? PHONE_TOP : 0}px`,
    '--overlay-bottom': `${sheetHeight}px`,
    '--sheet-height': `${sheetHeight}px`,
  } as CSSProperties

  const layoutClass = isPhone
    ? `app--phone${sheetExpanded ? ' app--sheet-expanded' : ''}`
    : 'app--desktop'

  return (
    <div className={`app ${layoutClass}`} style={overlay}>
      <div className="app-map">
        <WeatherMap
          cities={mapCities}
          selectedId={location.id}
          units={units}
          onSelect={selectCity}
          padding={padding}
        />
      </div>

      <div className="app-overlay">
        <TopBar
          cities={mapCities.map(({ location: place, weather }) => ({
            location: place,
            temp: weather?.main.temp ?? null,
          }))}
          selectedId={location.id}
          units={units}
          compact={isPhone}
          onSelect={selectCity}
          onUnitsChange={changeUnits}
        />
        <CityPanel
          location={location}
          city={cities[location.id]!}
          other={
            otherLocation
              ? { location: otherLocation, city: cities[otherLocation.id]! }
              : null
          }
          units={units}
          refreshing={refreshing}
          lastUpdated={lastUpdated}
          onRefresh={refresh}
          onSelect={selectCity}
          sheet={
            isPhone
              ? {
                  expanded: sheetExpanded,
                  onToggle: () => setSheetExpanded((expanded) => !expanded),
                }
              : null
          }
        />
      </div>
    </div>
  )
}

export default App
