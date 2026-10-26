import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { iconUrl } from '../../api/openWeatherMap'
import { summariseDays } from '../../utils/forecast'
import { formatWeekday, localDateKey } from '../../utils/time'
import type { ForecastData } from '../../api/types'
import { formatTempShort } from '../../utils/units'
import type { Units } from '../../utils/units'
import './Forecast.css'

interface DailyOutlookProps {
  forecast: ForecastData
  units: Units
  // The current temperature in °C, marked on today's bar when given
  current?: number
}

// Percent of the way from `low` to `high`, clamped to 0-100
function position(value: number, low: number, high: number) {
  const span = Math.max(high - low, 1)
  return Math.min(100, Math.max(0, ((value - low) / span) * 100))
}

function DailyOutlook({ forecast, units, current }: DailyOutlookProps) {
  const headingId = useId()
  const timezone = forecast.city.timezone
  // Read the clock once, when the outlook first appears, so rendering stays pure
  const [now] = useState(() => Math.floor(Date.now() / 1000))
  const todayKey = localDateKey(now, timezone)
  // The forecast only covers the rest of today, so today's range also takes
  // in the current reading (matching the high and low in the hero)
  const days = summariseDays(forecast).map((day) =>
    day.date === todayKey && current !== undefined
      ? { ...day, min: Math.min(day.min, current), max: Math.max(day.max, current) }
      : day,
  )

  // Every bar shares one scale, the coldest to the warmest of the 5 days,
  // so the bars can be compared at a glance (like the iOS weather app)
  const temps = days.flatMap((day) => [day.min, day.max])
  const low = Math.min(...temps)
  const high = Math.max(...temps)

  return (
    <section className="panel daily-outlook" aria-labelledby={headingId}>
      <h3 id={headingId}>5-day outlook</h3>
      <ul>
        {days.map((day) => {
          const isToday = day.date === todayKey
          const label = isToday ? 'Today' : formatWeekday(day.dt, timezone)
          const bar = {
            '--from': `${position(day.min, low, high)}%`,
            '--to': `${100 - position(day.max, low, high)}%`,
          } as CSSProperties
          return (
            <li key={day.date}>
              <span className="day">{label}</span>
              {day.condition && (
                <img
                  src={iconUrl(day.condition.icon)}
                  alt={day.condition.description}
                  title={day.condition.description}
                  width="40"
                  height="40"
                />
              )}
              <span className="pop">
                {day.pop >= 0.1 && (
                  <>
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M6 1.2C4.6 3.3 2.8 5.4 2.8 7.4a3.2 3.2 0 0 0 6.4 0C9.2 5.4 7.4 3.3 6 1.2Z" />
                    </svg>
                    {Math.round(day.pop * 100)}%
                    <span className="visually-hidden"> chance of rain</span>
                  </>
                )}
              </span>
              <span className="min">
                <span className="visually-hidden">Low </span>
                {formatTempShort(day.min, units)}
              </span>
              <span className="range-bar" style={bar} aria-hidden="true">
                <span className="range-fill" />
                {isToday && current !== undefined && (
                  <span
                    className="range-now"
                    style={{ left: `${position(current, low, high)}%` }}
                  />
                )}
              </span>
              <span className="max">
                <span className="visually-hidden">High </span>
                {formatTempShort(day.max, units)}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default DailyOutlook
