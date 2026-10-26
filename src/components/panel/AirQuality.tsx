import { useId } from 'react'
import { describeAqi } from '../../utils/airQuality'
import type { AirQualityData } from '../../api/types'
import './AirQuality.css'

interface AirQualityProps {
  data: AirQualityData
}

const LEVELS = [1, 2, 3, 4, 5] as const

function AirQuality({ data }: AirQualityProps) {
  const headingId = useId()
  const reading = data.list[0]
  if (!reading) return null

  const { aqi } = reading.main
  const { pm2_5, pm10 } = reading.components
  const { label, advice } = describeAqi(aqi)

  return (
    <section className="panel air-quality" aria-labelledby={headingId}>
      <h3 id={headingId}>Air quality</h3>

      <div className="aqi-summary">
        {/* The number and label say the level, so colour is only a hint */}
        <p className={`aqi-badge aqi-badge--${aqi}`}>
          <span className="aqi-value">{aqi}</span>
          <span className="aqi-label">{label}</span>
        </p>
        {/* Where the level sits on the 1-5 scale; the badge already says it */}
        <ol className="aqi-scale" aria-hidden="true">
          {LEVELS.map((level) => (
            <li
              key={level}
              className={`aqi-step aqi-badge--${level}${level === aqi ? ' is-current' : ''}`}
            />
          ))}
        </ol>
      </div>
      <p className="aqi-advice">{advice}</p>

      <dl className="aqi-pollutants">
        <div>
          <dt>PM2.5</dt>
          <dd>{`${pm2_5.toFixed(1)} μg/m³`}</dd>
        </div>
        <div>
          <dt>PM10</dt>
          <dd>{`${pm10.toFixed(1)} μg/m³`}</dd>
        </div>
      </dl>

      <p className="aqi-note">OpenWeatherMap air quality index (1–5)</p>
    </section>
  )
}

export default AirQuality
