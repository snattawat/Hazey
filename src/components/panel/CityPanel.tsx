import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { iconUrl } from '../../api/openWeatherMap'
import { todayRange } from '../../utils/forecast'
import type { MapLocation } from '../../data/locations'
import {
  formatClock,
  formatLongDate,
  formatTimeOfDay,
  formatUpdated,
} from '../../utils/time'
import type { WeatherData } from '../../api/types'
import { formatTemp, formatWind, temperature } from '../../utils/units'
import type { Units } from '../../utils/units'
import type { CityWeather } from '../../hooks/useCityWeather'
import AirQuality from './AirQuality'
import DailyOutlook from './DailyOutlook'
import HourlyForecast from './HourlyForecast'
import WeatherAlert from './WeatherAlert'
import WeatherCard from './WeatherCard'
import './CityPanel.css'

interface PanelCity {
  location: MapLocation
  city: CityWeather
}

interface CityPanelProps {
  location: MapLocation
  city: CityWeather
  // The city the compare card offers to switch to
  other: PanelCity | null
  units: Units
  refreshing: boolean
  lastUpdated: number | null
  onRefresh: () => void
  onSelect: (id: string) => void
  // Phone layout: the panel is a bottom sheet that can be pulled up
  sheet: { expanded: boolean; onToggle: () => void } | null
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

// "SW" for a wind from 220°
function compassPoint(deg: number) {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}

// Epoch ms, updated on every new minute: drives the clock and "Updated ... ago"
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      timer = setTimeout(
        () => {
          setNow(Date.now())
          schedule()
        },
        60_000 - (Date.now() % 60_000),
      )
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  return now
}

// --- Icons (decorative; the text next to them says what they mean) ---------

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

const ICONS = {
  humidity: <path d="M12 3.5c-2.8 4-6 7.4-6 10.9a6 6 0 0 0 12 0c0-3.5-3.2-6.9-6-10.9Z" />,
  wind: (
    <path d="M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5M3 12.5h16a2.5 2.5 0 1 1-2.5 2.5M3 16.5h8" />
  ),
  pressure: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13l3.5-3.5M8 17.5h8" />
    </>
  ),
  visibility: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  clouds: <path d="M7.5 18.5a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.5 1.8 3.6 3.6 0 0 1-.6 7.2Z" />,
  sunrise: (
    <path d="M4 18.5h16M7 18.5a5 5 0 0 1 10 0M12 4.5v5M9.5 7 12 4.5 14.5 7M4.5 12l1.4 1M19.5 12l-1.4 1" />
  ),
}

function RefreshIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4.5v4.2h-4.2" />
    </svg>
  )
}

// --- Pieces of the panel ----------------------------------------------------

interface StatProps {
  label: string
  icon: ReactNode
  value: string
  detail?: ReactNode
}

function Stat({ label, icon, value, detail }: StatProps) {
  return (
    <div className="stat">
      <dt>
        <Icon>{icon}</Icon>
        {label}
      </dt>
      <dd>
        <span className="stat-value">{value}</span>
        {detail && <span className="stat-detail">{detail}</span>}
      </dd>
    </div>
  )
}

function Stats({ weather, units }: { weather: WeatherData; units: Units }) {
  const { main, wind, clouds, visibility, sys, timezone } = weather
  // Wind direction is where it blows FROM; the arrow points where it goes
  const arrowAngle = (wind.deg + 180) % 360

  return (
    <dl className="stat-grid">
      <Stat label="Humidity" icon={ICONS.humidity} value={`${main.humidity}%`} />
      <Stat
        label="Wind"
        icon={ICONS.wind}
        value={formatWind(wind.speed, units)}
        detail={
          <>
            <svg
              className="wind-arrow"
              viewBox="0 0 12 12"
              style={{ transform: `rotate(${arrowAngle}deg)` }}
              aria-hidden="true"
            >
              <path d="M6 1.5 9.5 10 6 8.2 2.5 10Z" />
            </svg>
            {`from ${compassPoint(wind.deg)}`}
            {wind.gust !== undefined && ` · gusts ${formatWind(wind.gust, units)}`}
          </>
        }
      />
      <Stat
        label="Pressure"
        icon={ICONS.pressure}
        value={`${Math.round(main.pressure)} hPa`}
      />
      <Stat
        label="Visibility"
        icon={ICONS.visibility}
        value={
          visibility === undefined
            ? '—'
            : // 10 km is the API's maximum, so whole km read best there
              `${(visibility / 1000).toFixed(visibility >= 10_000 ? 0 : 1)} km`
        }
      />
      <Stat label="Cloud cover" icon={ICONS.clouds} value={`${clouds.all}%`} />
      <Stat
        label="Sunrise"
        icon={ICONS.sunrise}
        value={formatTimeOfDay(sys.sunrise, timezone)}
        detail={`Sunset ${formatTimeOfDay(sys.sunset, timezone)}`}
      />
    </dl>
  )
}

// "Bangkok is 2° warmer than Singapore", in the units on screen
function comparison(
  selected: { name: string; temp: number },
  other: { name: string; temp: number },
  units: Units,
) {
  const diff = temperature(selected.temp, units) - temperature(other.temp, units)
  if (diff === 0) return `${selected.name} and ${other.name} are the same temperature`
  const word = diff > 0 ? 'warmer' : 'cooler'
  return `${selected.name} is ${Math.abs(diff)}° ${word} than ${other.name}`
}

interface CompareCardProps {
  selected: PanelCity
  other: PanelCity
  units: Units
  onSelect: (id: string) => void
}

function CompareCard({ selected, other, units, onSelect }: CompareCardProps) {
  const headingId = useId()
  const detailsId = useId()
  const weather = other.city.weather
  const condition = weather?.weather[0]
  const selectedWeather = selected.city.weather

  let summary: string | null = null
  if (weather && selectedWeather) {
    summary = comparison(
      { name: selected.location.name, temp: selectedWeather.main.temp },
      { name: other.location.name, temp: weather.main.temp },
      units,
    )
  } else if (other.city.status === 'error') {
    summary = 'Weather unavailable'
  }
  const temp = weather && formatTemp(weather.main.temp, units)
  // What a screen reader hears after the name, as one sentence
  const description = [
    [temp, condition?.description].filter(Boolean).join(', '),
    summary,
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <section className="panel compare" aria-labelledby={headingId}>
      <h3 id={headingId}>Compare</h3>
      {/* Named for what it does; the weather it shows is its description */}
      <button
        type="button"
        className="compare-card"
        aria-label={`Switch to ${other.location.label}`}
        aria-describedby={description ? detailsId : undefined}
        onClick={() => onSelect(other.location.id)}
      >
        <span className="visually-hidden" id={detailsId}>
          {description}
        </span>
        {condition ? (
          <img
            className="compare-icon"
            src={iconUrl(condition.icon)}
            alt=""
            width="52"
            height="52"
          />
        ) : (
          <span className="compare-icon" />
        )}
        <span className="compare-body" aria-hidden="true">
          <span className="compare-name">{other.location.label}</span>
          {condition && (
            <span className="compare-condition">{condition.description}</span>
          )}
          {summary ? (
            <span className="compare-diff">{summary}</span>
          ) : (
            !weather && <span className="skeleton skeleton-line" />
          )}
        </span>
        {temp && (
          <span className="compare-temp" aria-hidden="true">
            {temp}
          </span>
        )}
        <svg className="compare-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </section>
  )
}

function SummarySkeleton() {
  return (
    <div className="panel-skeleton" aria-busy="true">
      <p className="visually-hidden" role="status">
        Loading weather…
      </p>
      <div className="skeleton-hero">
        <span className="skeleton skeleton-circle" />
        <span className="skeleton-stack">
          <span className="skeleton skeleton-temp" />
          <span className="skeleton skeleton-line" />
        </span>
      </div>
      <span className="skeleton skeleton-line skeleton-line--wide" />
    </div>
  )
}

function DetailsSkeleton() {
  return (
    <div className="panel-skeleton" aria-hidden="true">
      <div className="stat-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="skeleton skeleton-tile" />
        ))}
      </div>
      <span className="skeleton skeleton-strip" />
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="panel-error" role="alert">
      <svg className="panel-error-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 2.5 20h19L12 3Zm0 6v5m0 3v.5" />
      </svg>
      <div className="panel-error-body">
        <p className="panel-error-title">Couldn't load the weather</p>
        <p>{message}</p>
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  )
}

function updatedText(refreshing: boolean, lastUpdated: number | null, now: number) {
  if (refreshing) return lastUpdated === null ? '' : 'Updating…'
  return lastUpdated === null ? '' : formatUpdated(lastUpdated, now)
}

// --- The panel ----------------------------------------------------------------

function CityPanel({
  location,
  city,
  other,
  units,
  refreshing,
  lastUpdated,
  onRefresh,
  onSelect,
  sheet,
}: CityPanelProps) {
  const headingId = useId()
  const bodyId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  const now = useMinuteClock()
  const collapsed = sheet !== null && !sheet.expanded

  // Start a newly picked city at the top, and scroll back up when the sheet
  // collapses (it only shows the top). The panel isn't remounted for a new
  // city, so focus stays on the compare card that switched it.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [location.id, collapsed])

  const { weather, forecast, air } = city
  const alert = forecast && <WeatherAlert forecast={forecast} />

  let summary: ReactNode
  let details: ReactNode
  if (weather) {
    summary = (
      <>
        {/* On a phone the alert goes below the hero, so the collapsed
            sheet still shows the temperature */}
        {!sheet && alert}
        <WeatherCard
          data={weather}
          units={units}
          range={todayRange(weather, forecast)}
        />
      </>
    )
    details = (
      <>
        {sheet && alert}
        {city.error && (
          <p className="stale-note" role="status">
            Couldn't refresh: {city.error} Showing the last update.
          </p>
        )}
        <Stats weather={weather} units={units} />
      </>
    )
  } else if (city.status === 'error') {
    summary = (
      <ErrorCard
        message={city.error ?? 'Something went wrong.'}
        onRetry={onRefresh}
      />
    )
  } else {
    summary = <SummarySkeleton />
    details = <DetailsSkeleton />
  }

  return (
    <main
      className={[
        'city-panel',
        'glass',
        sheet && 'city-panel--sheet',
        collapsed && 'is-collapsed',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={headingId}
    >
      {sheet && (
        <button
          type="button"
          className="sheet-handle"
          aria-expanded={sheet.expanded}
          aria-controls={bodyId}
          aria-label={sheet.expanded ? 'Hide details' : 'Show details'}
          onClick={sheet.onToggle}
        >
          <span className="sheet-grip" />
        </button>
      )}

      <div className="city-panel-body" id={bodyId} ref={bodyRef}>
        <div className="city-summary">
          <div className="city-header">
            <h2 id={headingId}>{location.label}</h2>
            <p className="city-clock">
              <span className="visually-hidden">Local time </span>
              <time>{formatClock(now, location.timeZone)}</time>
              <span aria-hidden="true"> · </span>
              {formatLongDate(now, location.timeZone)}
            </p>
            <p className="city-updated">{updatedText(refreshing, lastUpdated, now)}</p>
            <button
              type="button"
              className={`refresh-button${refreshing ? ' is-spinning' : ''}`}
              aria-label="Refresh weather"
              onClick={onRefresh}
            >
              <RefreshIcon />
            </button>
          </div>
          {summary}
        </div>

        {/* Out of reach of the keyboard while the sheet hides it */}
        <div className="city-details" inert={collapsed}>
          {details}
          {other && (
            <CompareCard
              selected={{ location, city }}
              other={other}
              units={units}
              onSelect={onSelect}
            />
          )}
          {forecast && <HourlyForecast forecast={forecast} units={units} />}
          {forecast && weather && (
            <DailyOutlook
              forecast={forecast}
              units={units}
              current={weather.main.temp}
            />
          )}
          {air && <AirQuality data={air} />}
        </div>
      </div>
    </main>
  )
}

export default CityPanel
