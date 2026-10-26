import L from 'leaflet'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMap } from 'react-leaflet'
import { temperature } from '../../utils/units'
import type { Units } from '../../utils/units'
import type { WeatherLayer } from './weatherLayers'

interface MapLegendProps {
  layer: WeatherLayer
  units: Units
}

// OpenWeatherMap's value scales are non-linear (precip 0→140, wind 1→200), so
// spacing stops by value would cram all the colour into the first few percent.
// Space them evenly along the bar instead: stop i sits at i/(n-1).
function gradient(layer: WeatherLayer) {
  const n = layer.legend.length
  const stops = layer.legend.map((stop, i) => {
    const pct = n > 1 ? (i / (n - 1)) * 100 : 0
    return `${stop.color} ${pct}%`
  })
  return `linear-gradient(to right, ${stops.join(', ')})`
}

// Temperature legends read in °C; convert the labels for imperial users.
// Other layers (mm/h, %, m/s) keep their own unit.
function label(value: number, layer: WeatherLayer, units: Units) {
  if (layer.id === 'temperature') {
    return `${temperature(value, units)}°${units === 'imperial' ? 'F' : 'C'}`
  }
  return `${value} ${layer.unit}`
}

function MapLegend({ layer, units }: MapLegendProps) {
  const map = useMap()
  // The host element is created once (not in an effect) so the portal target
  // exists from the first render and we never setState inside the effect.
  const [host] = useState(() => {
    const el = document.createElement('div')
    el.className = 'leaflet-control'
    // Using the legend over the map must not pan or zoom it.
    L.DomEvent.disableClickPropagation(el)
    L.DomEvent.disableScrollPropagation(el)
    return el
  })

  // Attach the host inside Leaflet's bottom-right control corner, first in DOM
  // order so it stacks above the scale bar and attribution with no overlap no
  // matter how tall the (wrapping) attribution gets. This is a pure external
  // sync, so there is no setState here.
  useEffect(() => {
    const corner = map
      .getContainer()
      .querySelector<HTMLElement>('.leaflet-bottom.leaflet-right')
    if (!corner) return
    corner.insertBefore(host, corner.firstChild)
    return () => {
      host.remove()
    }
  }, [map, host])

  const stops = layer.legend
  const first = stops[0]
  const middle = stops[Math.floor(stops.length / 2)]
  const last = stops[stops.length - 1]

  return createPortal(
    <div className="map-legend glass" role="img" aria-label={`${layer.label} legend`}>
      <span className="map-legend__name">{layer.label}</span>
      {/* The stops include transparent colours, so sit the gradient on a
          neutral backing to keep the low-alpha end visible. */}
      <div className="map-legend__bar-backing">
        <div className="map-legend__bar" style={{ background: gradient(layer) }} />
      </div>
      <div className="map-legend__labels">
        {first && <span>{label(first.value, layer, units)}</span>}
        {middle && <span>{label(middle.value, layer, units)}</span>}
        {last && <span>{label(last.value, layer, units)}</span>}
      </div>
    </div>,
    host,
  )
}

export default MapLegend
