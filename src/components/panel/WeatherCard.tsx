import { iconUrl } from '../../api/openWeatherMap'
import type { WeatherData } from '../../api/types'
import { formatTemp, formatTempShort } from '../../utils/units'
import type { Units } from '../../utils/units'
import './WeatherCard.css'

interface WeatherCardProps {
  data: WeatherData
  units: Units
  // Today's low and high in °C (see todayRange in forecast.ts)
  range: { min: number; max: number }
}

// The hero at the top of the city panel: icon, temperature and condition
function WeatherCard({ data, units, range }: WeatherCardProps) {
  const condition = data.weather[0]

  return (
    <section className="weather-hero" aria-label="Current conditions">
      <div className="hero-current">
        {condition && (
          // Decorative: the description below says the same in words
          <img
            className="hero-icon"
            src={iconUrl(condition.icon, 4)}
            alt=""
            width="96"
            height="96"
          />
        )}
        <div className="hero-reading">
          <p className="hero-temp">{formatTemp(data.main.temp, units)}</p>
          {condition && (
            <p className="hero-description">{condition.description}</p>
          )}
        </div>
      </div>

      <dl className="hero-facts">
        <div>
          <dt>Feels like</dt>
          <dd>{formatTemp(data.main.feels_like, units)}</dd>
        </div>
        <div>
          <dt>High</dt>
          <dd>{formatTempShort(range.max, units)}</dd>
        </div>
        <div>
          <dt>Low</dt>
          <dd>{formatTempShort(range.min, units)}</dd>
        </div>
      </dl>
    </section>
  )
}

export default WeatherCard
