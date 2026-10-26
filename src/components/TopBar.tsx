import type { MapLocation } from '../data/locations'
import { formatTempShort } from '../utils/units'
import type { Units } from '../utils/units'
import './TopBar.css'

interface TopBarCity {
  location: MapLocation
  // Current temperature in °C, null until it has loaded
  temp: number | null
}

interface TopBarProps {
  cities: TopBarCity[]
  selectedId: string
  units: Units
  // One slim row for the phone layout; on desktop the switcher gets a row of its own
  compact: boolean
  onSelect: (id: string) => void
  onUnitsChange: (units: Units) => void
}

const UNIT_OPTIONS: Array<{ value: Units; label: string }> = [
  { value: 'metric', label: '°C' },
  { value: 'imperial', label: '°F' },
]

function TopBar({
  cities,
  selectedId,
  units,
  compact,
  onSelect,
  onUnitsChange,
}: TopBarProps) {
  return (
    <header className={`top-bar glass${compact ? ' top-bar--compact' : ''}`}>
      <h1 className="brand">
        <svg className="brand-logo" viewBox="0 0 32 32" aria-hidden="true">
          <circle className="brand-sun" cx="12" cy="12" r="6" />
          <path
            className="brand-rays"
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"
          />
          <path
            className="brand-cloud"
            d="M11.5 27.5a5 5 0 0 1-.4-10 6.6 6.6 0 0 1 12.6 1.4 4.3 4.3 0 0 1-.2 8.6Z"
          />
        </svg>
        {/* On phones only the logo shows; the name stays for screen readers */}
        <span className={compact ? 'visually-hidden' : 'brand-name'}>
          SEA Weather
        </span>
      </h1>

      <div className="segmented city-switch" role="group" aria-label="City">
        {cities.map(({ location, temp }) => (
          <button
            key={location.id}
            type="button"
            aria-pressed={location.id === selectedId}
            onClick={() => onSelect(location.id)}
          >
            <span className="city-name">{location.name}</span>
            {/* Left out of the button's name, which stays just the city */}
            {temp !== null && (
              <span className="city-temp" aria-hidden="true">
                {formatTempShort(temp, units)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        className="segmented unit-switch"
        role="group"
        aria-label="Temperature units"
      >
        {UNIT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={units === value}
            onClick={() => onUnitsChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}

export default TopBar
