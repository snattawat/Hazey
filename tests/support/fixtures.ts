import type {
  AirQualityData,
  ForecastData,
  ForecastEntry,
  WeatherCondition,
  WeatherData,
} from '../../src/api/types'

// Sample OpenWeatherMap responses for tests. No network or API key needed.

const THREE_HOURS = 3 * 60 * 60

// Unix seconds (UTC) for a moment in October 2026
function utc(day: number, hour: number, minute = 0) {
  return Date.UTC(2026, 9, day, hour, minute) / 1000
}

// London is UTC+1 on 21 Oct 2026 (British Summer Time)
export const LONDON_TZ = 3600

export const london: WeatherData = {
  name: 'London',
  coord: { lat: 51.5085, lon: -0.1257 },
  dt: utc(20, 23, 30),
  timezone: LONDON_TZ,
  sys: { country: 'GB', sunrise: utc(20, 6, 36), sunset: utc(20, 16, 51) },
  main: {
    temp: 12.6,
    feels_like: 11.2,
    temp_min: 11.8,
    temp_max: 13.4,
    pressure: 1012,
    humidity: 81,
  },
  visibility: 10000,
  clouds: { all: 75 },
  weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
  wind: { speed: 4.1, deg: 240 },
}

// First forecast step: 21 Oct 2026 00:00 UTC, which is 1 AM in London
export const FORECAST_START = utc(21, 0)

// The forecast step at `index` (0-39), dry and cloudy unless overridden
export function forecastEntry(
  index: number,
  overrides: Partial<ForecastEntry> = {},
): ForecastEntry {
  const temp = 10 + (index % 8)
  return {
    dt: FORECAST_START + index * THREE_HOURS,
    main: { temp, temp_min: temp - 1, temp_max: temp + 1, humidity: 70 },
    weather: [
      { id: 803, main: 'Clouds', description: 'broken clouds', icon: '04d' },
    ],
    pop: 0.1,
    wind: { speed: 3 },
    ...overrides,
  }
}

export const londonForecast: ForecastData = {
  list: Array.from({ length: 40 }, (_, index) => forecastEntry(index)),
  city: { name: 'London', country: 'GB', timezone: LONDON_TZ },
}

export const londonAir: AirQualityData = {
  list: [
    {
      dt: FORECAST_START,
      main: { aqi: 2 },
      components: {
        pm2_5: 8.4,
        pm10: 14.2,
        o3: 52.1,
        no2: 18.3,
        so2: 2.1,
        co: 230.3,
      },
    },
  ],
}

// --- Bangkok and Singapore -------------------------------------------------

export const BANGKOK_TZ = 25200 // UTC+7
export const SINGAPORE_TZ = 28800 // UTC+8

// Readings were taken at 05:30 UTC: 12:30 PM in Bangkok, 1:30 PM in Singapore
export const OBSERVED_AT = utc(21, 5, 30)

export const bangkok: WeatherData = {
  name: 'Bangkok',
  // OpenWeatherMap's own coordinates for the city, a little off MAP_LOCATIONS
  coord: { lat: 13.75, lon: 100.5167 },
  dt: OBSERVED_AT,
  timezone: BANGKOK_TZ,
  // 6:12 AM and 5:57 PM local time
  sys: { country: 'TH', sunrise: utc(20, 23, 12), sunset: utc(21, 10, 57) },
  main: {
    temp: 32.4,
    feels_like: 38.1,
    temp_min: 31.6,
    temp_max: 33.2,
    pressure: 1008,
    humidity: 62,
  },
  visibility: 10000,
  clouds: { all: 40 },
  weather: [
    { id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' },
  ],
  wind: { speed: 3.6, deg: 220 },
}

export const singapore: WeatherData = {
  name: 'Singapore',
  coord: { lat: 1.2897, lon: 103.8501 },
  dt: OBSERVED_AT,
  timezone: SINGAPORE_TZ,
  // 6:57 AM and 6:59 PM local time
  sys: { country: 'SG', sunrise: utc(20, 22, 57), sunset: utc(21, 10, 59) },
  main: {
    temp: 30.1,
    feels_like: 35.6,
    temp_min: 29.4,
    temp_max: 31,
    pressure: 1009,
    humidity: 74,
  },
  visibility: 9000,
  clouds: { all: 75 },
  weather: [
    { id: 803, main: 'Clouds', description: 'broken clouds', icon: '04d' },
  ],
  wind: { speed: 4.6, deg: 150, gust: 7.2 },
}

// The tropical forecasts start at 06:00 UTC, the first step after OBSERVED_AT
export const TROPICS_START = utc(21, 6)

// A hot afternoon, a warm night: offsets from the daily mean for each of the
// 8 steps of a day, starting at 06:00 UTC
const DAY_SHAPE = [3, 2, 0, -1, -2, -3, -2, 1]
// Makes some days warmer than others, so the 5-day range bars differ
const DAY_SHIFT = [0, 0.5, -1, 1, -0.5]

function tropicalForecast(
  city: ForecastData['city'],
  mean: number,
  showers: { pop: number[]; condition: WeatherCondition },
): ForecastData {
  const dry: WeatherCondition = {
    id: 802,
    main: 'Clouds',
    description: 'scattered clouds',
    icon: '03d',
  }

  const list = Array.from({ length: 40 }, (_, index): ForecastEntry => {
    const dt = TROPICS_START + index * THREE_HOURS
    const temp = mean + DAY_SHAPE[index % 8]! + DAY_SHIFT[Math.floor(index / 8)]!
    const pop = showers.pop[index % 8]!
    const localHour = new Date((dt + city.timezone) * 1000).getUTCHours()
    const night = localHour < 6 || localHour >= 18
    const condition = pop >= 0.4 ? showers.condition : dry

    return {
      dt,
      main: {
        temp,
        temp_min: temp - 0.6,
        temp_max: temp + 0.6,
        humidity: 70,
      },
      weather: [
        { ...condition, icon: condition.icon.replace(/[dn]$/, night ? 'n' : 'd') },
      ],
      pop,
      ...(pop >= 0.4 ? { rain: { '3h': 0.8 } } : {}),
      wind: { speed: 3.2 },
    }
  })

  return { list, city }
}

const lightRain: WeatherCondition = {
  id: 500,
  main: 'Rain',
  description: 'light rain',
  icon: '10d',
}

export const bangkokForecast = tropicalForecast(
  { name: 'Bangkok', country: 'TH', timezone: BANGKOK_TZ },
  29.5,
  { pop: [0.2, 0.45, 0.3, 0.1, 0, 0, 0, 0.1], condition: lightRain },
)

export const singaporeForecast = tropicalForecast(
  { name: 'Singapore', country: 'SG', timezone: SINGAPORE_TZ },
  28,
  { pop: [0.3, 0.6, 0.5, 0.2, 0.1, 0.1, 0.2, 0.3], condition: lightRain },
)

export const bangkokAir: AirQualityData = {
  list: [
    {
      dt: OBSERVED_AT,
      main: { aqi: 3 },
      components: {
        pm2_5: 31.2,
        pm10: 46.8,
        o3: 48.6,
        no2: 22.4,
        so2: 5.1,
        co: 410.5,
      },
    },
  ],
}

export const singaporeAir: AirQualityData = {
  list: [
    {
      dt: OBSERVED_AT,
      main: { aqi: 1 },
      components: {
        pm2_5: 8.9,
        pm10: 15.3,
        o3: 31.2,
        no2: 12.6,
        so2: 3.4,
        co: 240.3,
      },
    },
  ],
}
