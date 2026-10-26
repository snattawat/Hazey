// The API is always called with units=metric; the chosen units are only
// applied when values are displayed.
export type Units = 'metric' | 'imperial'

function toFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32
}

// Rounded temperature without the scale, e.g. 31 (for "31°")
export function temperature(celsius: number, units: Units) {
  return Math.round(units === 'imperial' ? toFahrenheit(celsius) : celsius)
}

// "31°C" / "88°F"
export function formatTemp(celsius: number, units: Units) {
  return `${temperature(celsius, units)}°${units === 'imperial' ? 'F' : 'C'}`
}

// "31°", for tight spots like map pins and forecast rows
export function formatTempShort(celsius: number, units: Units) {
  return `${temperature(celsius, units)}°`
}

// Wind arrives in m/s: shown as km/h (metric) or mph (imperial)
export function formatWind(metresPerSecond: number, units: Units) {
  return units === 'imperial'
    ? `${Math.round(metresPerSecond * 2.23694)} mph`
    : `${Math.round(metresPerSecond * 3.6)} km/h`
}
