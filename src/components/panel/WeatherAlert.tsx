import { findWeatherAlert } from '../../utils/alerts'
import type { ForecastData } from '../../api/types'
import './WeatherAlert.css'

interface WeatherAlertProps {
  forecast: ForecastData
}

// role="status", not "alert": role="alert" is reserved for error messages
function WeatherAlert({ forecast }: WeatherAlertProps) {
  const alert = findWeatherAlert(forecast)
  if (!alert) return null

  return (
    <div className={`weather-alert weather-alert--${alert.kind}`} role="status">
      <svg className="weather-alert-icon" viewBox="0 0 24 24" aria-hidden="true">
        {alert.kind === 'thunderstorm' ? (
          <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
        ) : (
          <path d="M12 2.5c-2.6 3.8-6 7.6-6 11.4a6 6 0 0 0 12 0c0-3.8-3.4-7.6-6-11.4Z" />
        )}
      </svg>
      <div>
        <strong className="weather-alert-title">{alert.title}</strong>
        <p className="weather-alert-message">{alert.message}</p>
        <p className="weather-alert-note">
          Based on the forecast for the next 12 hours.
        </p>
      </div>
    </div>
  )
}

export default WeatherAlert
