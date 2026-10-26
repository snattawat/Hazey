import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  Pane,
  ScaleControl,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapLocation } from '../../data/locations'
import type { WeatherData } from '../../api/types'
import type { Units } from '../../utils/units'
import { BASE_LAYERS, defaultBaseLayerId } from './baseLayers'
import type { BaseLayerId } from './baseLayers'
import {
  WEATHER_LAYERS,
  WEATHER_LAYER_ATTRIBUTION,
  weatherTileUrl,
} from './weatherLayers'
import type { WeatherLayerId } from './weatherLayers'
import CityMarker from './CityMarker'
import LayersPanel from './LayersPanel'
import MapLegend from './MapLegend'
import MapTools from './MapTools'
import './WeatherMap.css'

export interface MapCity {
  location: MapLocation
  // null while loading, or when the request failed
  weather: WeatherData | null
}

// Pixels of the map hidden behind the floating UI (top bar, side panel or
// bottom sheet). Used as padding when fitting or flying, so a city never ends
// up hidden behind the panel.
export interface MapPadding {
  top: number
  right: number
  bottom: number
  left: number
}

export interface WeatherMapProps {
  cities: MapCity[]
  selectedId: string
  units: Units
  onSelect: (id: string) => void
  padding: MapPadding
}

// Read at render time (not module load) so tests can stub VITE_API_KEY.
function readApiKey() {
  return import.meta.env.VITE_API_KEY ?? ''
}

// Generous SE Asia box so panning always keeps Bangkok and Singapore in reach.
const MAX_BOUNDS: L.LatLngBoundsExpression = [
  [-15, 80],
  [30, 125],
]

const STORAGE = {
  base: 'mapBase',
  overlay: 'mapOverlay',
  opacity: 'mapOverlayOpacity',
} as const

function isBaseLayerId(value: string | null): value is BaseLayerId {
  return BASE_LAYERS.some((layer) => layer.id === value)
}

function isWeatherLayerId(value: string | null): value is WeatherLayerId {
  return WEATHER_LAYERS.some((layer) => layer.id === value)
}

// Reads a persisted value, tolerating a missing/blocked localStorage.
function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore: persistence is a nicety, not required for the map to work.
  }
}

function initialBase(): BaseLayerId {
  const stored = readStorage(STORAGE.base)
  return isBaseLayerId(stored) ? stored : defaultBaseLayerId()
}

function initialOverlay(): WeatherLayerId | null {
  const stored = readStorage(STORAGE.overlay)
  if (stored === 'none' || stored === null) return null
  return isWeatherLayerId(stored) ? stored : null
}

// The overlay opacity the user can pick. The minimum is kept visible so an
// overlay can never be "on" yet fully transparent.
const MIN_OPACITY = 0.2
const DEFAULT_OPACITY = 0.7

function initialOpacity(): number {
  const raw = readStorage(STORAGE.opacity)
  // Missing or empty: use the default. (Number(null) and Number('') are both 0,
  // which would otherwise pass the range check and start the overlay invisible.)
  if (raw === null || raw.trim() === '') return DEFAULT_OPACITY
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0 || value > 1) return DEFAULT_OPACITY
  // Clamp a too-low stored value up so the overlay stays visible.
  return Math.max(value, MIN_OPACITY)
}

// Leaflet padding options from the MapPadding prop (left/top and right/bottom).
function paddingOptions(padding: MapPadding): L.FitBoundsOptions {
  return {
    paddingTopLeft: [padding.left, padding.top],
    paddingBottomRight: [padding.right, padding.bottom],
  }
}

// Drives the map view: fits both cities on mount, then flies to the selected
// city whenever the selection changes. Lives inside MapContainer so it can use
// the map instance.
interface ViewControllerProps {
  cities: MapCity[]
  selectedId: string
  padding: MapPadding
}

function ViewController({ cities, selectedId, padding }: ViewControllerProps) {
  const map = useMap()
  // Read cities and padding from refs so the selection effect's only real
  // trigger is a change of selectedId (cities is rebuilt on every weather
  // load, padding changes on resize). Synced in an effect, not during render.
  const citiesRef = useRef(cities)
  const paddingRef = useRef(padding)
  useEffect(() => {
    citiesRef.current = cities
    paddingRef.current = padding
  })
  // The last selectedId we actually flew to. Starting it at the initial
  // selection means the first render (and StrictMode's double-invoke) keeps the
  // fit-both view instead of flying straight to the selected city.
  const flownTo = useRef(selectedId)
  // Guards the one-time mount fit so a later resize fallback doesn't repeat it.
  const didFit = useRef(false)

  // jsdom gives the map a zero size, which makes fit/fly throw. Skip then.
  const hasSize = useCallback(() => map.getSize().x > 0, [map])

  const fitBoth = useCallback(() => {
    const list = citiesRef.current
    if (list.length === 0 || !hasSize()) return false
    const bounds = L.latLngBounds(
      list.map(({ location }) => [location.lat, location.lon] as [number, number]),
    )
    map.fitBounds(bounds, { ...paddingOptions(paddingRef.current), maxZoom: 7 })
    return true
  }, [map, hasSize])

  // On mount: frame both cities. If the map has no size yet (first paint, or
  // jsdom), retry once it is ready / resized.
  useEffect(() => {
    if (didFit.current) return
    if (fitBoth()) {
      didFit.current = true
      return
    }
    const retry = () => {
      if (didFit.current) return
      if (fitBoth()) {
        didFit.current = true
        map.off('resize', retry)
      }
    }
    map.whenReady(retry)
    map.on('resize', retry)
    return () => {
      map.off('resize', retry)
    }
  }, [map, fitBoth])

  // Fly to the selected city, but only when the selection genuinely changes.
  useEffect(() => {
    if (flownTo.current === selectedId) return
    flownTo.current = selectedId
    const city = citiesRef.current.find(
      ({ location }) => location.id === selectedId,
    )
    if (!city || !hasSize()) return
    const point = L.latLng(city.location.lat, city.location.lon)
    // A small box around the city, so the padding is honoured on the fly.
    const box = point.toBounds(2000)
    map.flyToBounds(box, {
      ...paddingOptions(paddingRef.current),
      maxZoom: 11,
      duration: 0.8,
    })
  }, [selectedId, map, hasSize])

  return null
}

function WeatherMap({
  cities,
  selectedId,
  units,
  onSelect,
  padding,
}: WeatherMapProps) {
  const [baseId, setBaseId] = useState<BaseLayerId>(initialBase)
  const [overlayId, setOverlayId] = useState<WeatherLayerId | null>(initialOverlay)
  const [opacity, setOpacity] = useState<number>(initialOpacity)
  const [layersOpen, setLayersOpen] = useState(false)
  const layersButtonRef = useRef<HTMLButtonElement>(null)

  const apiKey = readApiKey()
  const hasApiKey = apiKey.length > 0

  const baseLayer =
    BASE_LAYERS.find((layer) => layer.id === baseId) ?? BASE_LAYERS[0]!
  const overlayLayer = overlayId
    ? (WEATHER_LAYERS.find((layer) => layer.id === overlayId) ?? null)
    : null

  // Persist only an explicit user choice (below), so a first-time visitor keeps
  // following their light/dark preference instead of being pinned to whatever
  // defaultBaseLayerId() returned on first mount.
  function chooseBase(id: BaseLayerId) {
    setBaseId(id)
    writeStorage(STORAGE.base, id)
  }

  function chooseOverlay(id: WeatherLayerId | null) {
    setOverlayId(id)
    writeStorage(STORAGE.overlay, id ?? 'none')
  }

  function chooseOpacity(value: number) {
    setOpacity(value)
    writeStorage(STORAGE.opacity, String(value))
  }

  // If the user never picked a base map, follow live light/dark changes.
  useEffect(() => {
    if (readStorage(STORAGE.base) !== null) return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
      return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      // Only while there is still no stored choice.
      if (readStorage(STORAGE.base) === null) setBaseId(defaultBaseLayerId())
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  function closeLayers() {
    setLayersOpen(false)
    // Return focus to the button that opened the panel.
    layersButtonRef.current?.focus()
  }

  // The map tool buttons act on the map instance directly through this ref.
  const mapRef = useRef<L.Map | null>(null)

  const fitBoth = useCallback(() => {
    const map = mapRef.current
    if (!map || map.getSize().x === 0 || cities.length === 0) return
    const bounds = L.latLngBounds(
      cities.map(({ location }) => [location.lat, location.lon] as [number, number]),
    )
    map.fitBounds(bounds, {
      paddingTopLeft: [padding.left, padding.top],
      paddingBottomRight: [padding.right, padding.bottom],
      maxZoom: 7,
    })
  }, [cities, padding])

  const centerSelected = useCallback(() => {
    const map = mapRef.current
    if (!map || map.getSize().x === 0) return
    const city = cities.find(({ location }) => location.id === selectedId)
    if (!city) return
    const point = L.latLng(city.location.lat, city.location.lon)
    map.flyToBounds(point.toBounds(2000), {
      paddingTopLeft: [padding.left, padding.top],
      paddingBottomRight: [padding.right, padding.bottom],
      maxZoom: 11,
      duration: 0.8,
    })
  }, [cities, selectedId, padding])

  return (
    <div className="weather-map-root">
      <MapContainer
        className="weather-map"
        center={[7.6, 102.2]}
        zoom={5}
        minZoom={4}
        maxZoom={baseLayer.maxZoom}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={0.8}
        scrollWheelZoom
        zoomControl={false}
        attributionControl
        ref={(instance) => {
          mapRef.current = instance
        }}
      >
        {/* Base map. subdomains only when the style defines them (Esri has
            none); maxNativeZoom lets Leaflet scale up the deepest real tiles
            for the light/dark styles instead of fetching missing ones. */}
        <TileLayer
          key={baseLayer.id}
          url={baseLayer.url}
          attribution={baseLayer.attribution}
          {...(baseLayer.subdomains ? { subdomains: baseLayer.subdomains } : {})}
          maxZoom={baseLayer.maxZoom}
          maxNativeZoom={baseLayer.maxNativeZoom}
        />

        {/* Weather overlay sits between the base and the labels (tilePane 200 /
            overlayPane 400) so place names stay readable over rain/clouds. */}
        {overlayLayer && hasApiKey && (
          <TileLayer
            key={`overlay-${overlayLayer.id}`}
            url={weatherTileUrl(overlayLayer, apiKey)}
            attribution={WEATHER_LAYER_ATTRIBUTION}
            opacity={opacity}
          />
        )}

        {/* Place-name labels for the Esri Canvas (light/dark) styles, in their
            own pane above the overlay (zIndex 450) but below markers (600). */}
        {baseLayer.labelsUrl && (
          <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
            <TileLayer
              key={`labels-${baseLayer.id}`}
              url={baseLayer.labelsUrl}
              maxZoom={baseLayer.maxZoom}
              maxNativeZoom={baseLayer.maxNativeZoom}
            />
          </Pane>
        )}

        {cities.map((city) => (
          <CityMarker
            key={city.location.id}
            location={city.location}
            weather={city.weather}
            units={units}
            selected={city.location.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        {/* Re-mount on unit change so the scale switches metric/imperial. */}
        <ScaleControl
          key={units}
          position="bottomright"
          metric={units === 'metric'}
          imperial={units !== 'metric'}
        />

        {/* Portals itself into the bottom-right corner, above the scale bar. */}
        {overlayLayer && hasApiKey && (
          <MapLegend layer={overlayLayer} units={units} />
        )}

        <ViewController cities={cities} selectedId={selectedId} padding={padding} />

        <MapTools
          onShowBoth={fitBoth}
          onCenterSelected={centerSelected}
          onToggleLayers={() => setLayersOpen((open) => !open)}
          layersOpen={layersOpen}
          layersButtonRef={layersButtonRef}
        />
      </MapContainer>

      {layersOpen && (
        <LayersPanel
          baseId={baseId}
          overlayId={overlayId}
          opacity={opacity}
          minOpacity={MIN_OPACITY}
          hasApiKey={hasApiKey}
          onBaseChange={chooseBase}
          onOverlayChange={chooseOverlay}
          onOpacityChange={chooseOpacity}
          onClose={closeLayers}
          anchorRef={layersButtonRef}
        />
      )}
    </div>
  )
}

export default WeatherMap
