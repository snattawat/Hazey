import { useId } from 'react'
import { iconUrl } from '../../api/openWeatherMap'
import { formatHour } from '../../utils/time'
import type { ForecastData } from '../../api/types'
import { formatTempShort } from '../../utils/units'
import type { Units } from '../../utils/units'
import './Forecast.css'

interface HourlyForecastProps {
  forecast: ForecastData
  units: Units
}

function HourlyForecast({ forecast, units }: HourlyForecastProps) {
  const headingId = useId()
  const timezone = forecast.city.timezone
  // 8 steps × 3 hours = the next 24 hours
  const entries = forecast.list.slice(0, 8)

  return (
    <section className="panel hourly-forecast" aria-labelledby={headingId}>
      <h3 id={headingId}>Next 24 hours</h3>
      <ol>
        {entries.map((entry) => {
          const condition = entry.weather[0]
          return (
            <li key={entry.dt}>
              <span className="hour">{formatHour(entry.dt, timezone)}</span>
              {condition && (
                <img
                  src={iconUrl(condition.icon)}
                  alt={condition.description}
                  width="44"
                  height="44"
                />
              )}
              <span className="temp">
                {formatTempShort(entry.main.temp, units)}
              </span>
              {/* An empty slot keeps the temperatures in line */}
              <span className="pop">
                {entry.pop >= 0.1 && (
                  <>
                    <svg viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M6 1.2C4.6 3.3 2.8 5.4 2.8 7.4a3.2 3.2 0 0 0 6.4 0C9.2 5.4 7.4 3.3 6 1.2Z" />
                    </svg>
                    {Math.round(entry.pop * 100)}%
                    <span className="visually-hidden"> chance of rain</span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default HourlyForecast
