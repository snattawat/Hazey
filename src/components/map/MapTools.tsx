import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import {
  BothIcon,
  ExitFullscreenIcon,
  FullscreenIcon,
  LayersIcon,
  MinusIcon,
  PlusIcon,
  TargetIcon,
} from './icons'

interface MapToolsProps {
  // Fit both cities into view (honouring the padding).
  onShowBoth: () => void
  // Fly to the currently selected city.
  onCenterSelected: () => void
  // Toggle the layers panel.
  onToggleLayers: () => void
  layersOpen: boolean
  // Ref for the "Map layers" button so the panel can restore focus to it.
  layersButtonRef: React.Ref<HTMLButtonElement>
}

// Fullscreen is only offered when the browser supports it (jsdom doesn't).
function fullscreenSupported() {
  return (
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function'
  )
}

function MapTools({
  onShowBoth,
  onCenterSelected,
  onToggleLayers,
  layersOpen,
  layersButtonRef,
}: MapToolsProps) {
  const map = useMap()
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Clicking or scrolling a tool must not pan/zoom the map underneath.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    L.DomEvent.disableClickPropagation(node)
    L.DomEvent.disableScrollPropagation(node)
  }, [])

  // Keep the zoom buttons' disabled state in sync with the map.
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  // Track the browser's fullscreen state so the button shows the right icon.
  useEffect(() => {
    if (!fullscreenSupported()) return
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen()
    }
  }

  const atMin = zoom <= map.getMinZoom()
  const atMax = zoom >= map.getMaxZoom()

  return (
    <div ref={containerRef} className="map-tools glass" role="group" aria-label="Map tools">
      <button
        type="button"
        className="map-tool"
        aria-label="Zoom in"
        title="Zoom in"
        disabled={atMax}
        onClick={() => map.zoomIn()}
      >
        <PlusIcon />
      </button>
      <button
        type="button"
        className="map-tool"
        aria-label="Zoom out"
        title="Zoom out"
        disabled={atMin}
        onClick={() => map.zoomOut()}
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        className="map-tool"
        aria-label="Show both cities"
        title="Show both cities"
        onClick={onShowBoth}
      >
        <BothIcon />
      </button>
      <button
        type="button"
        className="map-tool"
        aria-label="Center on selected city"
        title="Center on selected city"
        onClick={onCenterSelected}
      >
        <TargetIcon />
      </button>
      <button
        ref={layersButtonRef}
        type="button"
        className="map-tool"
        aria-label="Map layers"
        title="Map layers"
        aria-expanded={layersOpen}
        aria-haspopup="dialog"
        onClick={onToggleLayers}
      >
        <LayersIcon />
      </button>
      {fullscreenSupported() && (
        <button
          type="button"
          className="map-tool"
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      )}
    </div>
  )
}

export default MapTools
