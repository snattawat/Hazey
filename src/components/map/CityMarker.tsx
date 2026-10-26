import L from 'leaflet'
import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { iconUrl } from '../../api/openWeatherMap'
import type { MapLocation } from '../../data/locations'
import { formatTempShort } from '../../utils/units'
import type { Units } from '../../utils/units'
import type { WeatherData } from '../../api/types'

interface CityMarkerProps {
  location: MapLocation
  weather: WeatherData | null
  units: Units
  selected: boolean
  onSelect: (id: string) => void
}

// Leaflet renders the divIcon HTML as raw markup, so any text that reaches it
// has to be escaped to avoid breaking the markup (or worse).
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Builds the pill markup for one city. The selected pill is larger, accent
// coloured and gets a pulsing ring; a loading pill shows just the name.
function buildIcon(
  location: MapLocation,
  weather: WeatherData | null,
  units: Units,
  selected: boolean,
) {
  const name = escapeHtml(location.name)
  const classes = ['city-marker']
  if (selected) classes.push('city-marker--selected')
  if (!weather) classes.push('city-marker--loading')

  let inner = ''
  if (weather) {
    const condition = weather.weather[0]
    const temp = escapeHtml(formatTempShort(weather.main.temp, units))
    const description = escapeHtml(condition?.description ?? '')
    const icon = condition?.icon
    const img = icon
      ? `<img class="city-marker__icon" src="${escapeHtml(iconUrl(icon))}" alt="${description}" />`
      : ''
    inner = `${img}<span class="city-marker__temp">${temp}</span><span class="city-marker__name">${name}</span>`
  } else {
    // No weather yet: a subtle placeholder keeps the pill from jumping.
    inner = `<span class="city-marker__name">${name}</span><span class="city-marker__temp city-marker__temp--placeholder">–°</span>`
  }

  const ring = selected ? '<span class="city-marker__ring" aria-hidden="true"></span>' : ''

  return L.divIcon({
    className: 'city-marker-wrap',
    html: `<div class="${classes.join(' ')}">${ring}${inner}</div>`,
    iconSize: undefined,
    // The pill grows from its bottom centre, like a pin tip on the coordinate.
    iconAnchor: [0, 0],
  })
}

// A short, human label for screen readers / the marker title.
function markerTitle(
  location: MapLocation,
  weather: WeatherData | null,
  units: Units,
) {
  if (!weather) return `${location.name}: loading`
  const description = weather.weather[0]?.description
  const temp = formatTempShort(weather.main.temp, units)
  return description
    ? `${location.name}: ${temp}, ${description}`
    : `${location.name}: ${temp}`
}

function CityMarker({
  location,
  weather,
  units,
  selected,
  onSelect,
}: CityMarkerProps) {
  const title = markerTitle(location, weather, units)
  // react-leaflet calls setIcon when the `icon` prop changes, so no remount is
  // needed (remounting drops keyboard focus). Memoise so the divIcon is only
  // rebuilt when its inputs change, not on every render.
  const icon = useMemo(
    () => buildIcon(location, weather, units, selected),
    [location, weather, units, selected],
  )
  return (
    <Marker
      position={[location.lat, location.lon]}
      icon={icon}
      // Selected pin floats above the other.
      zIndexOffset={selected ? 1000 : 0}
      keyboard
      riseOnHover
      title={title}
      alt={title}
      eventHandlers={{ click: () => onSelect(location.id) }}
    />
  )
}

export default CityMarker
