import { useEffect, useId, useRef } from 'react'
import { BASE_LAYERS } from './baseLayers'
import type { BaseLayerId } from './baseLayers'
import { WEATHER_LAYERS } from './weatherLayers'
import type { WeatherLayerId } from './weatherLayers'

interface LayersPanelProps {
  baseId: BaseLayerId
  overlayId: WeatherLayerId | null
  opacity: number
  // Smallest opacity the slider allows, so an overlay is never invisible.
  minOpacity: number
  // Overlays need an API key; when it's missing they are disabled.
  hasApiKey: boolean
  onBaseChange: (id: BaseLayerId) => void
  onOverlayChange: (id: WeatherLayerId | null) => void
  onOpacityChange: (opacity: number) => void
  // Closing returns focus to the "Map layers" button.
  onClose: () => void
  // The tool button that opened the panel, to detect outside clicks correctly.
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

function LayersPanel({
  baseId,
  overlayId,
  opacity,
  minOpacity,
  hasApiKey,
  onBaseChange,
  onOverlayChange,
  onOpacityChange,
  onClose,
  anchorRef,
}: LayersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const opacityId = useId()

  // Escape closes; clicking outside the panel (and outside its anchor) closes.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [onClose, anchorRef])

  // Move focus into the panel when it opens, for keyboard users.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('input')?.focus()
  }, [])

  return (
    <div
      ref={panelRef}
      className="layers-panel glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="layers-panel__title">
        Map
      </h2>

      <fieldset className="layers-panel__group">
        <legend>Base map</legend>
        {BASE_LAYERS.map((layer) => (
          <label key={layer.id} className="layers-panel__option">
            <input
              type="radio"
              name="base-map"
              value={layer.id}
              checked={baseId === layer.id}
              onChange={() => onBaseChange(layer.id)}
            />
            <span
              className={`layers-panel__swatch layers-panel__swatch--${layer.id}`}
              aria-hidden="true"
            />
            <span>{layer.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="layers-panel__group" disabled={!hasApiKey}>
        <legend>Weather overlay</legend>
        <label className="layers-panel__option">
          <input
            type="radio"
            name="weather-overlay"
            value="none"
            checked={overlayId === null}
            onChange={() => onOverlayChange(null)}
          />
          <span>None</span>
        </label>
        {WEATHER_LAYERS.map((layer) => (
          <label key={layer.id} className="layers-panel__option">
            <input
              type="radio"
              name="weather-overlay"
              value={layer.id}
              checked={overlayId === layer.id}
              onChange={() => onOverlayChange(layer.id)}
            />
            <span>{layer.label}</span>
          </label>
        ))}
        {!hasApiKey && (
          <p className="layers-panel__hint">
            Add VITE_API_KEY to enable weather overlays.
          </p>
        )}
      </fieldset>

      {overlayId !== null && hasApiKey && (
        <div className="layers-panel__group">
          <label htmlFor={opacityId}>Overlay opacity</label>
          <input
            id={opacityId}
            type="range"
            min={minOpacity}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(event) => onOpacityChange(Number(event.target.value))}
          />
        </div>
      )}
    </div>
  )
}

export default LayersPanel
